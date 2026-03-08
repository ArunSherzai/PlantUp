import notifee, { AndroidImportance, AndroidColor, EventType } from '@notifee/react-native';
import { Platform, Image } from 'react-native';
import { NavigationService } from './NavigationService';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { Alert } from 'react-native';

// This version only triggers a one-time silent cleanup of old "vX" channels
const NOTIFICATION_SYS_VERSION = 'final_v1';
const STORAGE_KEY_VERSION = '@PlantUp:noti_sys_version';

export type NotificationCategory = 'critical' | 'warning' | 'general' | 'chat';

const resolveIcon = (asset: any) => {
    return Image.resolveAssetSource(asset).uri;
};

export class NotificationService {
    static async initialize() {
        // 1. One-time silent cleanup for old versioned channels
        const savedVersion = await AsyncStorage.getItem(STORAGE_KEY_VERSION);
        if (savedVersion !== NOTIFICATION_SYS_VERSION && Platform.OS === 'android') {
            await this.resetChannels(false);
            await AsyncStorage.setItem(STORAGE_KEY_VERSION, NOTIFICATION_SYS_VERSION);
        }

        // 2. Request Permissions
        const settings = await notifee.requestPermission();
        if (settings.authorizationStatus === 0) {
            console.log('Failed to get permissions for push notification!');
            return false;
        }

        // 3. Set up Android Channels
        if (Platform.OS === 'android') {
            await notifee.createChannel({
                id: 'critical',
                name: 'Plant Critical Alerts',
                description: 'Urgent alerts when your plants are dying',
                importance: AndroidImportance.HIGH,
                vibration: true,
                vibrationPattern: [300, 500],
                lightColor: AndroidColor.RED,
                sound: 'critical_sprig',
            });

            await notifee.createChannel({
                id: 'warning',
                name: 'Plant Warnings',
                importance: AndroidImportance.HIGH,
                sound: 'sprig_warning',
            });

            await notifee.createChannel({
                id: 'general',
                name: 'General Tips & Tricks',
                importance: AndroidImportance.DEFAULT,
                sound: 'advices_ping',
            });

            await notifee.createChannel({
                id: 'chat',
                name: 'Chat Messages',
                importance: AndroidImportance.HIGH,
                sound: 'rec',
            });
        }

        // 4. Register Event Listeners
        notifee.onForegroundEvent(({ type, detail }) => {
            this.handleEvent(type, detail);
        });

        notifee.onBackgroundEvent(async ({ type, detail }) => {
            this.handleEvent(type, detail);
        });

        return true;
    }

    private static handleEvent(type: EventType, detail: any) {
        const { notification } = detail;

        if (type === EventType.PRESS) {
            const category = notification.data?.category as NotificationCategory;
            const data = notification.data || {};

            switch (category) {
                case 'chat':
                    if (data.conversationId) {
                        NavigationService.navigate('MessageDetail', {
                            id: data.conversationId,
                            name: data.senderName || 'Chat',
                            avatar: data.senderAvatar ? { uri: data.senderAvatar } : require('../../assets/images/Profilbild.jpg'),
                            userId: data.senderUserId
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
                case 'general':
                default:
                    NavigationService.navigate('MessageDetail', {
                        id: 'sprig',
                        name: 'Sprig',
                        avatar: require('../../assets/images/sprig_idle.png'),
                    });
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
        let channelId = 'general';
        let largeIcon: string | undefined = undefined;

        switch (category) {
            case 'critical':
                channelId = 'critical';
                largeIcon = resolveIcon(require('../../assets/images/sadSprigIcon.png'));
                break;
            case 'warning':
                channelId = 'warning';
                largeIcon = resolveIcon(require('../../assets/images/warningSprig.png'));
                break;
            case 'chat':
                channelId = 'chat';
                if (data && data.senderAvatar) {
                    largeIcon = data.senderAvatar;
                }
                break;
            case 'general':
            default:
                channelId = 'general';
                largeIcon = resolveIcon(require('../../assets/images/nerdSprig.png'));
                break;
        }

        await notifee.displayNotification({
            title,
            body,
            data: { ...data, category },
            android: {
                channelId,
                largeIcon,
                circularLargeIcon: true,
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
        let channelId = 'general';
        let largeIcon: string | undefined = undefined;

        switch (category) {
            case 'critical':
                channelId = 'critical';
                largeIcon = resolveIcon(require('../../assets/images/sadSprigIcon.png'));
                break;
            case 'warning':
                channelId = 'warning';
                largeIcon = resolveIcon(require('../../assets/images/warningSprig.png'));
                break;
            case 'chat':
                channelId = 'chat';
                if (data && data.senderAvatar) {
                    largeIcon = data.senderAvatar;
                }
                break;
            case 'general':
            default:
                channelId = 'general';
                largeIcon = resolveIcon(require('../../assets/images/nerdSprig.png'));
                break;
        }

        const trigger = {
            type: 0,
            timestamp: Date.now() + (delaySeconds * 1000),
        };

        await notifee.createTriggerNotification({
            title,
            body,
            data: { ...data, category },
            android: {
                channelId,
                largeIcon,
                circularLargeIcon: true,
                smallIcon: 'ic_launcher',
                color: '#1db954',
                pressAction: {
                    id: 'default',
                },
            },
        }, trigger as any);
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
}
