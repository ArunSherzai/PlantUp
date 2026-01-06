import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TextInput, Platform } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { 
    useSharedValue, 
    useAnimatedStyle, 
    withTiming, 
    FadeOut, 
    SlideInDown, 
    withDelay,
    Easing,
    useAnimatedProps,
    runOnJS,
    withSpring,
    withSequence
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useUnistyles } from 'react-native-unistyles';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getLevelProgress, getTotalXPForLevel, getXPForNextLevel } from '../utils/leveling';
import { useTipStore } from '../stores/TipStore';

Animated.addWhitelistedNativeProps({ text: true });
const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

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
    
    const isLevelUp = endXP >= startLevelNext;
    
    // -- Animated Values --
    const xpValue = useSharedValue(startXP);
    const currentLevelVal = useSharedValue(level);
    const translateY = useSharedValue(0);
    const scale = useSharedValue(1); 

    const [showLevelUpText, setShowLevelUpText] = useState(false);

    const gained = endXP - startXP;
    
    // Pause Control
    useEffect(() => {
        if (isVisible) {
            setPaused(true);
        } else {
            setPaused(false);
        }
        return () => setPaused(false);
    }, [isVisible, setPaused]);

    useEffect(() => {
        if (isVisible) {
            // Reset Init Values
            xpValue.value = startXP;
            translateY.value = 0; 
            currentLevelVal.value = level;
            scale.value = 1;
            setShowLevelUpText(false);

            // 1. Determine all animation milestones
            // We need to know which levels we pass through
            const milestones: number[] = [];
            let tempLevel = level;
            let tempXPBase = getTotalXPForLevel(tempLevel);
            let tempXPNext = getXPForNextLevel(tempLevel);

            // While our Target XP is greater than the cap of the current temp level
            // we have a milestone at that cap.
            while (endXP >= tempXPNext) {
                milestones.push(tempXPNext);
                tempLevel++;
                tempXPBase = tempXPNext; // New base is old max
                tempXPNext = getXPForNextLevel(tempLevel);
            }
            // Finally append the actual end XP
            milestones.push(endXP);

            // 2. Recursive Animation Function
            const animateStep = (index: number) => {
                if (index >= milestones.length) {
                    // Start Exit Timer when sequence fully done
                    const timer = setTimeout(() => {
                        handleComplete();
                    }, 8000); // 8s wait after finish
                    return;
                }

                const targetXP = milestones[index];
                const isFinalStep = index === milestones.length - 1;
                
                // Determine duration based on how much XP we are covering in this step
                // to keep speed somewhat consistent, or just fixed fast speed for level ups
                const duration = isFinalStep ? 1500 : 1000;

                xpValue.value = withTiming(targetXP, {
                    duration: duration,
                    easing: Easing.out(Easing.quad),
                }, (finished) => {
                    if (finished) {
                        if (!isFinalStep) {
                            // We hit a Level Cap Milestone!
                            // 1. Trigger Level Up Visuals
                            runOnJS(setShowLevelUpText)(true);
                            
                            // 2. Bump Level Value (Visually resets bar because Base increases)
                            currentLevelVal.value = currentLevelVal.value + 1;

                            // 3. Pop Effect
                            scale.value = withSequence(
                                withTiming(1.2, { duration: 150 }),
                                withTiming(1, { duration: 150 })
                            );

                            // 4. Slight Pause before next bar starts filling
                            // (We use a dummy delay by scheduling next step via runOnJS or another withDelay??
                            //  Reanimated callbacks are on UI thread. We can't use setTimeout there easily unless runOnJS.)
                            //  Actually we can just Chain `withDelay` on the next start? 
                            //  No, we need to call `animateStep(index + 1)`.
                            //  Recursive calls in worklets are okay if defined. 
                            //  But `animateStep` uses `milestones` closure from JS thread... dangerous if not careful.
                            //  Actually `useEffect` closure is JS Thread. `withTiming` callback runs on UI Thread.
                            //  We must use `runOnJS` to call the next step recursion if it relies on JS closure scope variables like `milestones`.
                            runOnJS(animateStep)(index + 1);
                        } else {
                            // Final step done
                             runOnJS(animateStep)(index + 1); // To trigger the exit timer
                        }
                    }
                });
            };

            // Start the chain
            // Initial Delay before starting first fill
            setTimeout(() => {
                animateStep(0);
            }, 400);

            // Cleanup not easily possible with recursive chain, but Component unmount handles it mostly.
            return () => {};
        }
    }, [isVisible, startXP, endXP]);

    const handleComplete = () => {
        if (onComplete) onComplete();
    };

    // Gestures
    const pan = Gesture.Pan()
        .onChange((event) => {
            if (event.translationY < 0) {
                translateY.value = event.translationY;
            }
        })
        .onFinalize((event) => {
            if (event.translationY < -50) {
                runOnJS(handleComplete)();
            } else {
                translateY.value = withSpring(0);
            }
        });

    const tap = Gesture.Tap().onEnd(() => {
        runOnJS(handleComplete)();
    });

    const composed = Gesture.Simultaneous(pan, tap);

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

    // Use insets for top padding responsiveness
    const topPosition = insets.top + 10; // 10px spacing from safe area

    return (
        <GestureDetector gesture={composed}>
            <Animated.View 
                entering={SlideInDown.springify().damping(12)} 
                exiting={FadeOut.duration(400)}
                style={[styles.container, { top: topPosition }, animatedCardStyle]} 
            >
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
        zIndex: 9999,
        paddingHorizontal: 20, // Move horizontal spacing to padding for better centering
    },
    card: {
        width: '100%',
        maxWidth: 500, // Tablet constraint
        backgroundColor: 'rgba(20, 20, 30, 0.95)',
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: 'rgba(255, 215, 0, 0.3)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
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
