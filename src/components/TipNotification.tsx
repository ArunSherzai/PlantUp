import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity, Dimensions, PanResponder, Image } from 'react-native';
import { useUnistyles } from '~/lib/unistyles';
import { TipObject } from '../utils/tipResolver';
import { playSound, type SoundType } from '~/utils/SoundManager';
import { useUserStore } from '../stores/UserStore';
import { getNotificationSoundCategoryForTipSeverity } from '../features/notifications/config/notificationSoundConfig';

interface TipNotificationProps {
    tip: TipObject | null;
    onClose: () => void;
}

const { width } = Dimensions.get('window');

export default function TipNotification({ tip, onClose }: TipNotificationProps) {
    const { theme } = useUnistyles();
    const notificationSoundSettings = useUserStore((state) => state.notificationSoundSettings);
    const slideAnim = useRef(new Animated.Value(-150)).current;

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: (_, gestureState) => {
                return Math.abs(gestureState.dy) > 10 || Math.abs(gestureState.dx) > 10;
            },
            onPanResponderRelease: (_, gestureState) => {
                if (gestureState.dy < -20 || Math.abs(gestureState.dx) > 50) {
                    hide();
                }
            },
        })
    ).current;

    useEffect(() => {
        if (tip) {
            const soundCategory = getNotificationSoundCategoryForTipSeverity(tip.severity);
            const configuredSound = notificationSoundSettings[soundCategory];

            if (configuredSound && configuredSound !== 'off') {
                playSound(configuredSound as SoundType);
            }

            Animated.spring(slideAnim, {
                toValue: 50,
                useNativeDriver: true,
                friction: 8,
            }).start();

            const timer = setTimeout(() => {
                hide();
            }, 20000);

            return () => clearTimeout(timer);
        } else {
            slideAnim.setValue(-150);
        }
    }, [tip, notificationSoundSettings]);

    const hide = () => {
        Animated.timing(slideAnim, {
            toValue: -150,
            duration: 300,
            useNativeDriver: true,
        }).start(() => {
            if (tip) onClose();
        });
    };

    const getAnimation = (severity: string) => {
        switch (severity) {
            case 'critical':
                return require('../../assets/animations/running.gif');
            case 'warning':
                return require('../../assets/animations/peeking.gif');
            case 'info':
            default:
                return require('../../assets/animations/tips.gif');
        }
    };

    if (!tip) return null;

    return (
        <Animated.View
            {...panResponder.panHandlers}
            style={[
                styles.container,
                {
                    transform: [{ translateY: slideAnim }],
                    backgroundColor: theme.colors.background,
                },
            ]}>
            <TouchableOpacity activeOpacity={0.9} onPress={hide} style={styles.content}>
                <View style={styles.videoContainer}>
                    <Image
                        source={getAnimation(tip.severity)}
                        style={styles.video}
                        resizeMode="cover"
                    />
                </View>
                <View style={styles.textContainer}>
                    <Text style={[styles.text, { color: theme.colors.text }]}>{tip.message}</Text>
                </View>
            </TouchableOpacity>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 0,
        left: 20,
        right: 20,
        zIndex: 9999,
        borderRadius: 20,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.3,
        shadowRadius: 4.65,
        elevation: 8,
        height: 80,
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
        height: '100%',
        overflow: 'hidden',
        borderRadius: 20,
    },
    videoContainer: {
        width: 80,
        height: '100%',
        backgroundColor: '#f0f0f0',
    },
    video: {
        width: '100%',
        height: '100%',
    },
    textContainer: {
        flex: 1,
        paddingHorizontal: 15,
        justifyContent: 'center',
    },
    text: {
        fontSize: 14,
        fontWeight: '600',
        flexWrap: 'wrap',
    },
});
