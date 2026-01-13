import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity, Dimensions, PanResponder, Image } from 'react-native';
import { useUnistyles } from 'react-native-unistyles';

interface MessageNotificationProps {
    message: {
        senderName: string;
        content: string;
        avatar?: any;
    } | null;
    onClose: () => void;
    onPress?: () => void;
}

const { width } = Dimensions.get('window');

export default function MessageNotification({ message, onClose, onPress }: MessageNotificationProps) {
    const { theme } = useUnistyles();
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
        if (message) {
            Animated.spring(slideAnim, {
                toValue: 50,
                useNativeDriver: true,
                friction: 8,
            }).start();

            // Auto-hide after 10 seconds
            const timer = setTimeout(() => {
                hide();
            }, 10000);

            return () => clearTimeout(timer);
        } else {
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

    const handlePress = () => {
        hide();
        onPress?.();
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
            <TouchableOpacity activeOpacity={0.9} onPress={handlePress} style={styles.content}>
                <View style={styles.gifContainer}>
                    <Image
                        source={require('../../assets/animations/newmessage.gif')}
                        style={styles.gif}
                        resizeMode="cover"
                    />
                </View>
                <View style={styles.textContainer}>
                    <Text style={[styles.senderName, { color: theme.colors.primary }]} numberOfLines={1}>
                        {message.senderName}
                    </Text>
                    <Text style={[styles.messageText, { color: theme.colors.text }]} numberOfLines={2}>
                        {message.content}
                    </Text>
                </View>
                {message.avatar && (
                    <Image source={message.avatar} style={styles.avatar} />
                )}
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
    gifContainer: {
        width: 80,
        height: '100%',
        backgroundColor: '#f0f0f0',
    },
    gif: {
        width: '100%',
        height: '100%',
    },
    textContainer: {
        flex: 1,
        paddingHorizontal: 12,
        justifyContent: 'center',
    },
    senderName: {
        fontSize: 14,
        fontWeight: '700',
        marginBottom: 2,
    },
    messageText: {
        fontSize: 13,
        fontWeight: '400',
    },
    label: {
        fontSize: 10,
        fontWeight: '600',
        color: '#888',
        marginBottom: 1,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        marginRight: 12,
    },
});
