import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withDelay,
    withSequence,
    withTiming,
    runOnJS
} from 'react-native-reanimated';
import { FontAwesome6 } from '@expo/vector-icons';
import { useUnistyles } from '~/lib/unistyles';
import { BlurView } from 'expo-blur';
import { playSound } from '~/utils/SoundManager';

type Props = {
    onDismiss: () => void;
};

const { width } = Dimensions.get('window');

export default function StreakSavedOverlay({ onDismiss }: Props) {
    const { theme } = useUnistyles();

    // Animations
    const scale = useSharedValue(0);
    const opacity = useSharedValue(0);

    // Icon States
    const iconScale = useSharedValue(0);
    const textOpacity = useSharedValue(0);

    useEffect(() => {
        // Play freeze activation sound
        playSound('freeze_activate');

        // 1. Entrance
        scale.value = withSpring(1);
        opacity.value = withTiming(1, { duration: 300 });

        // 2. Icon Pop
        iconScale.value = withDelay(300, withSpring(1.2, { damping: 6 }));

        // 3. Text Fade In
        textOpacity.value = withDelay(600, withTiming(1));

        // 4. Exit after 3.5 seconds
        const timeout = setTimeout(() => {
            opacity.value = withTiming(0, { duration: 300 }, (finished) => {
                if (finished) runOnJS(onDismiss)();
            });
        }, 3500);

        return () => clearTimeout(timeout);
    }, []);

    const containerStyle = useAnimatedStyle(() => ({
        opacity: opacity.value,
        transform: [{ scale: scale.value }]
    }));

    const iconStyle = useAnimatedStyle(() => ({
        transform: [{ scale: iconScale.value }]
    }));

    const textStyle = useAnimatedStyle(() => ({
        opacity: textOpacity.value
    }));

    return (
        <View style={styles.overlay}>
            <BlurView intensity={20} style={StyleSheet.absoluteFill} tint="dark" />

            <Animated.View style={[styles.card, { backgroundColor: theme.colors.background }, containerStyle]}>
                <View style={styles.iconContainer}>
                    <Animated.View style={iconStyle}>
                        <FontAwesome6 name="snowflake" size={64} color="#A5F2F3" />
                        <FontAwesome6
                            name="shield-halved"
                            size={32}
                            color="#fff"
                            style={{ position: 'absolute', bottom: -5, right: -5 }}
                        />
                    </Animated.View>
                </View>

                <Animated.View style={[styles.content, textStyle]}>
                    <Text style={[styles.title, { color: theme.colors.text }]}>
                        Phew! That was close...
                    </Text>
                    <Text style={[styles.subtitle, { color: theme.colors.typography }]}>
                        You missed a day, but your <Text style={{ color: '#A5F2F3', fontWeight: 'bold' }}>Streak Freeze</Text> saved you!
                    </Text>
                    <Text style={[styles.subtitle, { marginTop: 10, fontSize: 12, opacity: 0.7 }]}>
                        Your streak is safe. Keep it burning! 🔥
                    </Text>
                </Animated.View>
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    overlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 9999, // Ensure it's on top
        backgroundColor: 'rgba(0,0,0,0.4)',
    },
    card: {
        width: width * 0.85,
        maxWidth: 350,
        padding: 30,
        borderRadius: 24,
        alignItems: 'center',
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.30,
        shadowRadius: 4.65,
        elevation: 8,
    },
    iconContainer: {
        marginBottom: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    content: {
        alignItems: 'center',
    },
    title: {
        fontSize: 22,
        fontWeight: '800',
        marginBottom: 10,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 16,
        textAlign: 'center',
        lineHeight: 22,
    }
});
