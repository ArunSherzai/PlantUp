import notifee, { AndroidColor, AndroidImportance, EventType } from '@notifee/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image, Platform } from 'react-native';

import { useInboxStore, type InboxNotificationKind } from '../stores/InboxStore';
import { useUserStore } from '../stores/UserStore';
import { NavigationService } from './NavigationService';
import {
  DEFAULT_NOTIFICATION_SOUND_SETTINGS,
  type NotificationSoundCategory,
  type NotificationSoundPreference,
} from '../features/notifications/config/notificationSoundConfig';

const NOTIFICATION_SYS_VERSION = 'final_v3';
const STORAGE_KEY_VERSION = '@PlantUp:noti_sys_version';
const NOTIFICATION_DEDUPE_WINDOW_MS = 2 * 60 * 1000;

export type NotificationCategory = 'critical' | 'warning' | 'general' | 'chat';
type DeliveredNotificationCategory = NotificationCategory | 'follow';

const resolveIcon = (asset: any) => Image.resolveAssetSource(asset).uri;

export class NotificationService {
  private static listenersRegistered = false;
  private static lastDeliveredByKey: Record<string, number> = {};

  static async initialize() {
    await useInboxStore.getState().hydrate();
    await useUserStore.getState().loadSettings();

    const savedVersion = await AsyncStorage.getItem(STORAGE_KEY_VERSION);
    if (savedVersion !== NOTIFICATION_SYS_VERSION && Platform.OS === 'android') {
      await this.resetChannels(false);
      await AsyncStorage.setItem(STORAGE_KEY_VERSION, NOTIFICATION_SYS_VERSION);
    }

    const settings = await notifee.requestPermission();
    if (settings.authorizationStatus === 0) {
      console.log('Failed to get permissions for push notification!');
      return false;
    }

    if (Platform.OS === 'android') {
      const soundSettings =
        useUserStore.getState().notificationSoundSettings || DEFAULT_NOTIFICATION_SOUND_SETTINGS;
      await this.ensureAndroidChannels(soundSettings);
    }

    if (!this.listenersRegistered) {
      notifee.onForegroundEvent(({ type, detail }) => {
        this.handleEvent(type, detail);
      });

      notifee.onBackgroundEvent(async ({ type, detail }) => {
        this.handleEvent(type, detail);
      });

      this.listenersRegistered = true;
    }

    return true;
  }

  private static getChannelId(
    category: NotificationSoundCategory,
    sound: NotificationSoundPreference
  ) {
    return `plantup_${category}_${sound}`;
  }

  private static toAndroidSoundName(sound: NotificationSoundPreference) {
    return sound === 'off' ? undefined : sound;
  }

  private static async ensureAndroidChannels(
    soundSettings: Record<NotificationSoundCategory, NotificationSoundPreference>
  ) {
    await notifee.createChannel({
      id: this.getChannelId('critical', soundSettings.critical),
      name: 'Plant Critical Alerts',
      description: 'Urgent alerts when your plants are dying',
      importance: AndroidImportance.HIGH,
      vibration: true,
      vibrationPattern: [300, 500],
      lightColor: AndroidColor.RED,
      sound: this.toAndroidSoundName(soundSettings.critical),
    });

    await notifee.createChannel({
      id: this.getChannelId('warning', soundSettings.warning),
      name: 'Plant Warnings',
      importance: AndroidImportance.HIGH,
      sound: this.toAndroidSoundName(soundSettings.warning),
    });

    await notifee.createChannel({
      id: this.getChannelId('general', soundSettings.general),
      name: 'General Tips & Tricks',
      importance: AndroidImportance.DEFAULT,
      sound: this.toAndroidSoundName(soundSettings.general),
    });

    await notifee.createChannel({
      id: this.getChannelId('chat', soundSettings.chat),
      name: 'Chat Messages',
      importance: AndroidImportance.HIGH,
      sound: this.toAndroidSoundName(soundSettings.chat),
    });
  }

  static async applySoundSettings(
    nextSettings?: Partial<Record<NotificationSoundCategory, NotificationSoundPreference>>
  ) {
    if (nextSettings) {
      useUserStore.setState((state) => ({
        notificationSoundSettings: {
          ...state.notificationSoundSettings,
          ...nextSettings,
        },
      }));
    }

    if (Platform.OS === 'android') {
      await this.resetChannels(true);
    }
  }

  private static handleEvent(type: EventType, detail: any) {
    const { notification } = detail;

    if (type === EventType.PRESS) {
      const category = notification.data?.category as string;
      const data = notification.data || {};

      switch (category) {
        case 'chat':
          if (data.conversationId) {
            NavigationService.navigate('MessageDetail', {
              id: data.conversationId,
              name: data.senderName || 'Chat',
              avatar: data.senderAvatar
                ? { uri: data.senderAvatar }
                : require('../../assets/images/Profilbild.jpg'),
              userId: data.senderUserId,
            });
          }
          break;
        case 'critical':
        case 'warning':
          if (data.plantId) {
            NavigationService.navigate('PlantStats', {
              plantId: data.plantId,
              onlyShowSelected: true,
            });
          }
          break;
        case 'follow':
          if (data.followerId) {
            NavigationService.navigate('PublicProfile', { userId: data.followerId });
          }
          break;
        case 'general':
          if (data.plantId) {
            NavigationService.navigate('PlantStats', {
              plantId: data.plantId,
              onlyShowSelected: true,
            });
          } else {
            NavigationService.navigate('TabNavigator');
          }
          break;
        default:
          NavigationService.navigate('TabNavigator');
          break;
      }
    }
  }

  static async sendNotification(
    title: string,
    body: string,
    category: NotificationCategory,
    data: any = {}
  ) {
    const effectiveCategory =
      (data?.category as DeliveredNotificationCategory | undefined) || category;
    const androidConfig = this.getAndroidConfig(effectiveCategory, data);
    const deliveryKey = this.getDeliveryKey(title, body, effectiveCategory, data);

    if (this.wasDeliveredRecently(deliveryKey)) {
      return;
    }

    this.markDelivered(deliveryKey);

    await this.recordInboxItem(title, body, effectiveCategory, data);

    await notifee.displayNotification({
      title,
      body,
      data: { ...data, category: effectiveCategory },
      android: {
        ...androidConfig,
        smallIcon: 'ic_launcher',
        color: '#1db954',
        pressAction: {
          id: 'default',
        },
      },
    });
  }

  static async scheduleNotification(
    title: string,
    body: string,
    category: NotificationCategory,
    delaySeconds: number,
    data: any = {}
  ) {
    const effectiveCategory =
      (data?.category as DeliveredNotificationCategory | undefined) || category;
    const androidConfig = this.getAndroidConfig(effectiveCategory, data);

    const trigger = {
      type: 0,
      timestamp: Date.now() + delaySeconds * 1000,
    };

    await notifee.createTriggerNotification(
      {
        title,
        body,
        data: { ...data, category: effectiveCategory },
        android: {
          ...androidConfig,
          smallIcon: 'ic_launcher',
          color: '#1db954',
          pressAction: {
            id: 'default',
          },
        },
      },
      trigger as any
    );
  }

  static async resetChannels(reInit: boolean = true) {
    if (Platform.OS === 'android') {
      const channels = await notifee.getChannels();
      for (const channel of channels) {
        await notifee.deleteChannel(channel.id);
      }
      if (reInit) {
        await this.initialize();
      }
    }
  }

  private static getAndroidConfig(category: DeliveredNotificationCategory, data: any = {}) {
    const soundSettings =
      useUserStore.getState().notificationSoundSettings || DEFAULT_NOTIFICATION_SOUND_SETTINGS;

    switch (category) {
      case 'critical':
        return {
          channelId: this.getChannelId('critical', soundSettings.critical),
          largeIcon: resolveIcon(require('../../assets/images/sadSprigIcon.png')),
          circularLargeIcon: false,
        };
      case 'warning':
        return {
          channelId: this.getChannelId('warning', soundSettings.warning),
          largeIcon: resolveIcon(require('../../assets/images/warningSprig.png')),
          circularLargeIcon: false,
        };
      case 'chat':
        return {
          channelId: this.getChannelId('chat', soundSettings.chat),
          largeIcon: data?.senderAvatar,
          circularLargeIcon: true,
        };
      case 'follow':
      case 'general':
      default:
        return {
          channelId: this.getChannelId('general', soundSettings.general),
          largeIcon: resolveIcon(require('../../assets/images/nerdSprig.png')),
          circularLargeIcon: false,
        };
    }
  }

  private static async recordInboxItem(
    title: string,
    body: string,
    category: DeliveredNotificationCategory,
    data: any = {}
  ) {
    await useInboxStore.getState().addNotification({
      kind: category as InboxNotificationKind,
      title,
      body,
      avatarUri: data?.senderAvatar,
      groupKey: this.getGroupKey(category, data),
      navigationTarget: this.getNavigationTarget(category, data),
    });
  }

  private static getGroupKey(category: DeliveredNotificationCategory, data: any = {}) {
    switch (category) {
      case 'chat':
        return data?.conversationId ? `chat:${data.conversationId}` : undefined;
      case 'critical':
      case 'warning':
        return data?.plantId ? `${category}:${data.plantId}` : undefined;
      case 'follow':
        return data?.followerId ? `follow:${data.followerId}` : undefined;
      case 'general':
        return data?.plantId ? `general:${data.plantId}` : undefined;
      default:
        return undefined;
    }
  }

  private static getDeliveryKey(
    title: string,
    body: string,
    category: DeliveredNotificationCategory,
    data: any = {}
  ) {
    const groupKey = this.getGroupKey(category, data);
    return groupKey ? `${category}:${groupKey}:${body}` : `${category}:${title}:${body}`;
  }

  private static wasDeliveredRecently(deliveryKey: string) {
    const lastDeliveredAt = this.lastDeliveredByKey[deliveryKey] ?? 0;
    return Date.now() - lastDeliveredAt < NOTIFICATION_DEDUPE_WINDOW_MS;
  }

  private static markDelivered(deliveryKey: string) {
    this.lastDeliveredByKey[deliveryKey] = Date.now();
  }

  private static getNavigationTarget(category: DeliveredNotificationCategory, data: any = {}) {
    switch (category) {
      case 'chat':
        if (!data?.conversationId) return undefined;
        return {
          name: 'MessageDetail',
          params: {
            id: data.conversationId,
            name: data.senderName || 'Chat',
            avatar: data.senderAvatar
              ? { uri: data.senderAvatar }
              : require('../../assets/images/Profilbild.jpg'),
            userId: data.senderUserId,
          },
        };
      case 'critical':
      case 'warning':
        if (!data?.plantId) return undefined;
        return {
          name: 'PlantStats',
          params: {
            plantId: data.plantId,
            onlyShowSelected: true,
          },
        };
      case 'follow':
        if (!data?.followerId) return undefined;
        return {
          name: 'PublicProfile',
          params: { userId: data.followerId },
        };
      case 'general':
        if (data?.plantId) {
          return {
            name: 'PlantStats',
            params: {
              plantId: data.plantId,
              onlyShowSelected: true,
            },
          };
        }
        return {
          name: 'TabNavigator',
        };
      default:
        return {
          name: 'TabNavigator',
        };
    }
  }
}
