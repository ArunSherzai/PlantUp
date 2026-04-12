import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import type { User } from '@supabase/supabase-js';
import { db } from '../utils/supabase';
import { useUserStore } from '../stores/UserStore';

/**
 * PushTokenService
 *
 * Registers the device's Expo Push Token and stores it in the
 * user_schema.push_tokens table so that server-side functions
 * (Edge Functions, Database Webhooks) can send OS push notifications
 * even when the app is fully closed.
 */
export class PushTokenService {
  private static registrationInFlight: Promise<string | null> | null = null;
  private static lastRegisteredUserId: string | null = null;
  private static remotePushUnavailable = false;

  /**
   * Call this after user login / auth state change.
   * Requests permission, gets the Expo Push Token, and upserts it.
   */
  static async register(userOverride?: User | null): Promise<string | null> {
    if (this.registrationInFlight) {
      return this.registrationInFlight;
    }
    if (this.remotePushUnavailable) {
      return null;
    }

    this.registrationInFlight = this.registerInternal(userOverride);
    try {
      return await this.registrationInFlight;
    } finally {
      this.registrationInFlight = null;
    }
  }

  private static async registerInternal(userOverride?: User | null): Promise<string | null> {
    try {
      let user = userOverride ?? useUserStore.getState().user;
      if (!user) {
        const { data } = await db.public.auth.getUser();
        user = data.user;
      }

      if (!user) {
        console.log('[PushToken] No user, skipping registration');
        return null;
      }

      if (this.lastRegisteredUserId === user.id) {
        return null;
      }

      // 1. Check / request permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.warn('[PushToken] Push notification permission not granted');
        return null;
      }

      // 2. Get the Expo Push Token
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: 'e3a26cb7-0177-42d4-8593-846b65ee085d',
      });
      const token = tokenData.data;
      console.log('[PushToken] ✅ Expo Push Token:', token);

      // 3. Upsert to user_schema.push_tokens
      const { error } = await db.user.from('push_tokens').upsert(
        {
          user_id: user.id,
          token,
          platform: Platform.OS,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      );

      if (error) {
        console.error('[PushToken] Error saving push token:', error);
        return null;
      }

      console.log('[PushToken] ✅ Token saved to database');
      this.lastRegisteredUserId = user.id;
      return token;
    } catch (error: any) {
      const message = error?.message || String(error);
      if (
        message.includes('Default FirebaseApp is not initialized') ||
        message.includes('fcm-credentials')
      ) {
        console.warn(
          '[PushToken] Expo push token not available in this build. Configure Android FCM credentials for remote push notifications.'
        );
        this.remotePushUnavailable = true;
        return null;
      }

      console.warn('[PushToken] Registration skipped:', error);
      return null;
    }
  }

  /**
   * Remove the push token on logout.
   */
  static async unregister(): Promise<void> {
    try {
      const user = useUserStore.getState().user;
      if (!user) return;

      await db.user.from('push_tokens').delete().eq('user_id', user.id);
      this.lastRegisteredUserId = null;

      console.log('[PushToken] Token removed from database');
    } catch (error) {
      console.error('[PushToken] Unregister error:', error);
    }
  }
}
