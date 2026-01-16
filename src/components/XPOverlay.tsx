import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TextInput, Platform } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    SlideInDown,
    Easing,
    useAnimatedProps,
    runOnJS,
    withSpring,
    withSequence,
    cancelAnimation
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useUnistyles } from 'react-native-unistyles';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getLevelProgress, getTotalXPForLevel, getXPForNextLevel } from '../utils/leveling';
import { useTipStore } from '../stores/TipStore';
import { playSound } from '~/utils/SoundManager';

Animated.addWhitelistedNativeProps({ text: true });
const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);
import { Image as ExpoImage } from 'expo-image';

// --- Worklet Helpers for UI Thread Calculations ---
function xpToNextLevelWorklet(level: number) {
    'worklet';
    if (level >= 100) return 0;

    let xp = 0;
    if (level >= 1 && level <= 10) {
        xp = 99.9141 * Math.pow(level, 1.2);
    } else if (level >= 11 && level <= 50) {
        xp = 1151.6746 + 5.765454 * Math.pow(level, 1.8);
    } else if (level >= 51 && level < 100) {
        xp = 4500 + 5.017007 * (level - 51);
    }

    return Math.round(xp);
}

function getTotalXPForLevelWorklet(level: number) {
    'worklet';
    if (level <= 1) return 0;

    let total = 0;
    for (let i = 1; i < level; i++) {
        total += xpToNextLevelWorklet(i);
    }
    return total;
}

function getXPForNextLevelWorklet(currentLevel: number) {
    'worklet';
    if (currentLevel >= 100) return getTotalXPForLevelWorklet(100);
    return getTotalXPForLevelWorklet(currentLevel + 1);
}


type Props = {
    startXP: number;
    endXP: number;
    level: number;
    isVisible: boolean;
    onComplete?: () => void;
};

export default function XPOverlay({ startXP, endXP, level, isVisible, onComplete }: Props) {
    const { theme } = useUnistyles();
    const insets = useSafeAreaInsets();
    const { setPaused } = useTipStore();

    // -- Level Math (JS Thread for initial setup) --
    const startLevelBase = getTotalXPForLevel(level);
    const startLevelNext = getXPForNextLevel(level);
    const startLevelNeeded = startLevelNext - startLevelBase;

    // -- Animated Values --
    const xpValue = useSharedValue(startXP);
    const currentLevelVal = useSharedValue(level);
    const translateY = useSharedValue(0);
    const opacity = useSharedValue(1);
    const scale = useSharedValue(1);

    const [showLevelUpText, setShowLevelUpText] = useState(false);
    const isLevelUp = endXP >= startLevelNext;
    const gained = endXP - startXP;

    // Refs for cleanup
    const timerRef = React.useRef<NodeJS.Timeout | null>(null);
    // 🟢 Fix: Use SharedValue for isMounted validation in worklets
    const isMounted = useSharedValue(0); // 0 = false, 1 = true

    // Pause Control
    useEffect(() => {
        if (isVisible) {
            setPaused(true);
        } else {
            setPaused(false);
        }
        return () => setPaused(false);
    }, [isVisible, setPaused]);

    const handleComplete = () => {
        if (onComplete) onComplete();
    };

    useEffect(() => {
        if (isVisible) {
            isMounted.value = 1; // Set mounted
            // Reset Init Values
            xpValue.value = startXP;
            translateY.value = 0;
            opacity.value = 1;
            currentLevelVal.value = level;
            scale.value = 1;
            setShowLevelUpText(false);

            // 1. Determine all animation milestones
            const milestones: number[] = [];
            let tempLevel = level;
            let tempXPBase = getTotalXPForLevel(tempLevel);
            let tempXPNext = getXPForNextLevel(tempLevel);

            while (endXP >= tempXPNext) {
                milestones.push(tempXPNext);
                tempLevel++;
                tempXPBase = tempXPNext;
                tempXPNext = getXPForNextLevel(tempLevel);
            }
            milestones.push(endXP);

            // 2. Recursive Animation Function
            const animateStep = (index: number) => {
                // Abort if unmounted (Value check works on JS thread too)
                if (isMounted.value === 0) return;

                if (index >= milestones.length) {
                    // Start Exit Timer when sequence fully done
                    timerRef.current = setTimeout(() => {
                        if (isMounted.value === 0) return;
                        // Manual Fade Out for Auto-Dismiss
                        opacity.value = withTiming(0, { duration: 500 }, (finished) => {
                            // Check SharedValue on UI Thread
                            if (finished && isMounted.value === 1) runOnJS(handleComplete)();
                        });
                    }, 8000);
                    return;
                }

                const targetXP = milestones[index];
                const isFinalStep = index === milestones.length - 1;

                const duration = isFinalStep ? 1500 : 1000;

                xpValue.value = withTiming(targetXP, {
                    duration: duration,
                    easing: Easing.out(Easing.quad),
                }, (finished) => {
                    if (finished) {
                        // 🟢 Safe check on UI thread
                        if (isMounted.value === 0) return;

                        if (!isFinalStep) {
                            runOnJS(setShowLevelUpText)(true);
                            currentLevelVal.value = currentLevelVal.value + 1;
                            scale.value = withSequence(
                                withTiming(1.2, { duration: 150 }),
                                withTiming(1, { duration: 150 })
                            );
                            runOnJS(animateStep)(index + 1);
                        } else {
                            runOnJS(animateStep)(index + 1);
                        }
                    }
                });
            };

            // Start the chain
            timerRef.current = setTimeout(() => {
                playSound('xp_fill');
                animateStep(0);
            }, 400);

            return () => {
                // CLEANUP
                isMounted.value = 0; // Set unmounted
                if (timerRef.current) clearTimeout(timerRef.current);
                cancelAnimation(xpValue);
                cancelAnimation(translateY);
                cancelAnimation(opacity);
                cancelAnimation(scale);
                cancelAnimation(currentLevelVal);
            };
        }
    }, [isVisible, startXP, endXP]);


    // Gestures
    const pan = Gesture.Pan()
        .onChange((event) => {
            if (event.translationY < 0) {
                translateY.value = event.translationY;
            }
        })
        .onFinalize((event) => {
            // Dismiss if dragged up slightly (>30px) OR flicked up
            const isFlickUp = event.velocityY < -200;
            const isDraggedUp = event.translationY < -30;

            if (isDraggedUp || isFlickUp) {
                // Animate completely off screen then unmount
                translateY.value = withTiming(-1000, { duration: 300, easing: Easing.out(Easing.quad) }, (finished) => {
                    if (finished) {
                        runOnJS(handleComplete)();
                    }
                });
            } else {
                translateY.value = withSpring(0, { damping: 15 });
            }
        });

    // -- Derived Animations --
    const animatedBarStyle = useAnimatedStyle(() => {
        const lvl = currentLevelVal.value;
        const base = getTotalXPForLevelWorklet(lvl);
        const next = getXPForNextLevelWorklet(lvl);
        const needed = next - base;

        const currentInLevel = xpValue.value - base;
        const pct = Math.min(Math.max(currentInLevel / needed, 0), 1);

        return {
            width: `${pct * 100}%`,
        };
    });

    const animatedCardStyle = useAnimatedStyle(() => ({
        opacity: opacity.value,
        transform: [
            { translateY: translateY.value },
            { scale: scale.value }
        ]
    }));

    const animatedTextProps = useAnimatedProps(() => {
        const lvl = currentLevelVal.value;
        const base = getTotalXPForLevelWorklet(lvl);
        const next = getXPForNextLevelWorklet(lvl);
        const needed = next - base;

        const currentInLevel = Math.floor(xpValue.value - base);
        const display = Math.max(0, currentInLevel);
        return { text: `${display} / ${needed} XP` } as any;
    });

    if (!isVisible) return null;

    const topPosition = insets.top + 60; // Increased spacing to sit lower

    return (
        <GestureDetector gesture={pan}>
            <Animated.View
                entering={SlideInDown.springify().damping(20).stiffness(150)}
                // No Exiting Prop - Handled Manually
                style={[styles.container, { top: topPosition }, animatedCardStyle]}
            >
                {/* Happy Sprig Decoration */}
                <View style={{
                    position: 'absolute',
                    top: -75,
                    right: -25,
                    width: 140,
                    height: 140,
                    zIndex: 20,
                    elevation: 50,
                }}>
                    <ExpoImage
                        source={require('../../assets/animations/happy_sprig.gif')}
                        style={{ width: '100%', height: '100%' }}
                        contentFit="contain"
                    />
                </View>

                <View style={[styles.card, isLevelUp && showLevelUpText && styles.cardLevelUp]}>
                    {/* Header Row */}
                    <View style={styles.row}>
                        <View style={styles.iconBadge}>
                            <FontAwesome6 name="star" size={12} color="#fff" solid />
                        </View>

                        {/* Dynamic Title */}
                        <View style={{ flex: 1 }}>
                            {showLevelUpText ? (
                                <Animated.Text
                                    entering={SlideInDown.duration(300)}
                                    style={styles.levelUpTitle}
                                >
                                    LEVEL UP! 🎉
                                </Animated.Text>
                            ) : (
                                <Text style={styles.title}>Level {level + (isLevelUp && currentLevelVal.value > level ? 1 : 0)}</Text>
                            )}
                        </View>

                        <Text style={styles.gainedText}>+{gained} XP</Text>
                    </View>

                    {/* Progress Bar Track */}
                    <View style={styles.track}>
                        <Animated.View style={[styles.fill, animatedBarStyle]}>
                            <LinearGradient
                                colors={showLevelUpText ? ['#00C853', '#64DD17'] : ['#FFD700', '#FFA500']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={StyleSheet.absoluteFill}
                            />
                        </Animated.View>
                    </View>

                    {/* Ticker Text */}
                    <AnimatedTextInput
                        underlineColorAndroid="transparent"
                        editable={false}
                        value={`0 / ${startLevelNeeded} XP`}
                        animatedProps={animatedTextProps}
                        style={styles.tickerText}
                    />
                </View>
            </Animated.View>
        </GestureDetector>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        left: 0,
        right: 0,
        alignItems: 'center',
        zIndex: 999999, // Extreme Z-Index to beat DraggableSheet
        paddingHorizontal: 20,
    },
    card: {
        width: '100%',
        maxWidth: 500,
        backgroundColor: 'rgba(20, 20, 30, 0.95)',
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: 'rgba(255, 215, 0, 0.3)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 100, // Extreme Elevation for Android
    },
    cardLevelUp: {
        borderColor: '#64DD17', // Green border for Level Up
        shadowColor: '#64DD17',
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    iconBadge: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#FFA500',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 8,
    },
    title: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 14,
    },
    levelUpTitle: {
        color: '#64DD17',
        fontWeight: '900',
        fontSize: 16,
        letterSpacing: 1,
    },
    gainedText: {
        color: '#FFD700',
        fontWeight: '800',
        fontSize: 14,
    },
    track: {
        height: 16,
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 8,
        overflow: 'hidden',
        marginBottom: 8,
    },
    fill: {
        height: '100%',
        borderRadius: 8,
    },
    tickerText: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 12,
        fontWeight: '600',
        textAlign: 'right',
        padding: 0,
    }
});
