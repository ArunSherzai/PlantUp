import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity, Dimensions, PanResponder, Image } from 'react-native';
import { useUnistyles } from 'react-native-unistyles';

interface TipNotificationProps {
    message: string | null;
    onClose: () => void;
}

const { width } = Dimensions.get('window');

export default function TipNotification({ message, onClose }: TipNotificationProps) {
    const { theme } = useUnistyles();
    const slideAnim = useRef(new Animated.Value(-150)).current; // Start off-screen (top)

    // PanResponder for swipe gestures
    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: (_, gestureState) => {
                // Only capture vertical swipes or significant horizontal swipes
                return Math.abs(gestureState.dy) > 10 || Math.abs(gestureState.dx) > 10;
            },
            onPanResponderRelease: (_, gestureState) => {
                // Swipe Up (negative dy) or Swipe Left/Right to dismiss
                if (gestureState.dy < -20 || Math.abs(gestureState.dx) > 50) {
                    hide();
                }
            },
        })
    ).current;

    useEffect(() => {
        if (message) {
            // Slide in
            Animated.spring(slideAnim, {
                toValue: 50, // Position from top
                useNativeDriver: true,
                friction: 8,
            }).start();

            // Auto-hide after 20 seconds
            const timer = setTimeout(() => {
                hide();
            }, 20000);

            return () => clearTimeout(timer);
        } else {
            // Ensure it's hidden if message is null
            slideAnim.setValue(-150);
        }
    }, [message]);

    const hide = () => {
        Animated.timing(slideAnim, {
            toValue: -150,
            duration: 300,
            useNativeDriver: true,
        }).start(() => {
            if (message) onClose();
        });
    };

    if (!message) return null;

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
                        source={require('../../assets/animations/tips.gif')}
                        style={styles.video}
                        resizeMode="cover"
                    />
                </View>
                <View style={styles.textContainer}>
                    <Text style={[styles.text, { color: theme.colors.text }]}>{message}</Text>
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
