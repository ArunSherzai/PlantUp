import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
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
    /**
     * Call this after user login / auth state change.
     * Requests permission, gets the Expo Push Token, and upserts it.
     */
    static async register(): Promise<string | null> {
        try {
            const user = useUserStore.getState().user;
            if (!user) {
                console.log('[PushToken] No user, skipping registration');
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
                projectId: '12345678-1234-1234-1234-1234567890ab', // Fallback for dev
            });
            const token = tokenData.data;
            console.log('[PushToken] ✅ Expo Push Token:', token);

            // 3. Upsert to user_schema.push_tokens
            const { error } = await db.user
                .from('push_tokens')
                .upsert({
                    user_id: user.id,
                    token,
                    platform: Platform.OS,
                    updated_at: new Date().toISOString(),
                }, { onConflict: 'user_id' });

            if (error) {
                console.error('[PushToken] Error saving push token:', error);
                return null;
            }

            console.log('[PushToken] ✅ Token saved to database');
            return token;
        } catch (error) {
            console.error('[PushToken] Registration error:', error);
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

            await db.user
                .from('push_tokens')
                .delete()
                .eq('user_id', user.id);

            console.log('[PushToken] Token removed from database');
        } catch (error) {
            console.error('[PushToken] Unregister error:', error);
        }
    }
}
