import React from 'react';
import { TouchableOpacity, Image, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { usePlantTipSystem } from '../hooks/usePlantTipSystem';
import TipNotification from './TipNotification';
import MessageNotification from './MessageNotification';
import { useMessageNotificationStore } from '../stores/MessageNotificationStore';
import type { RootStackParamList } from '../navigation/Root';

export default function SpriteComponent() {
    const { triggerManualTip, activeTip, dismissTip } = usePlantTipSystem();
    const { notification, hideNotification } = useMessageNotificationStore();
    const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();

    const handleMessageNotificationPress = () => {
        if (!notification) return;

        if (notification.type === 'follow' && notification.userId) {
            // Follow notification: navigate to the follower's profile
            navigation.navigate('PublicProfile', { userId: notification.userId });
        } else if (notification.conversationId) {
            // Chat message notification: navigate to the conversation
            navigation.navigate('MessageDetail', {
                id: notification.conversationId,
                name: notification.senderName,
                avatar: notification.avatar || require('../../assets/images/Profilbild.jpg'),
            });
        }

        hideNotification();
    };

    return (
        <>
            <TipNotification tip={activeTip} onClose={dismissTip} />
            <MessageNotification
                message={notification}
                onClose={hideNotification}
                onPress={handleMessageNotificationPress}
            />
        </>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        bottom: 120, // Above tab bar
        right: 20,
        width: 80,
        height: 80,
        zIndex: 1000,
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    sprite: {
        width: '100%',
        height: '100%',
    },
});
