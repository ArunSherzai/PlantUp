
import React, { useEffect, useState } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Dimensions, Image as RNImage, ImageSourcePropType } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { BlurView } from 'expo-blur';
import Animated, { 
    useSharedValue, 
    useAnimatedStyle, 
    withTiming, 
    withSpring, 
    withRepeat,
    withSequence,
    Easing,
    interpolate,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { FontAwesome6 } from '@expo/vector-icons';
import { useUnistyles } from 'react-native-unistyles';
import { db } from '../utils/supabase';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('screen');

type Reward = {
    level: number;
    title: string;
    description: string;
    image?: ImageSourcePropType;
};

type Props = {
    visible: boolean;
    reward: Reward | null;
    isClaimed?: boolean;
    isLocked?: boolean;
    onClose: () => void;
    onClaimAction?: () => void;
};

// Theme colors based on reward type
const getTheme = (title: string) => {
    const lTitle = title.toLowerCase();
    if (lTitle.includes('coin')) {
        return { colors: ['#FFD700', '#FFA500'] as const, icon: 'coins' };
    } else if (lTitle.includes('xp') || lTitle.includes('booster')) {
        return { colors: ['#C084FC', '#7E22CE'] as const, icon: 'bolt' };
    } else if (lTitle.includes('border')) {
        return { colors: ['#FF6B6B', '#FF8E53'] as const, icon: 'certificate' };
    } else if (lTitle.includes('title')) {
        return { colors: ['#2DD4BF', '#0F766E'] as const, icon: 'award' };
    } else {
        return { colors: ['#34D399', '#10B981'] as const, icon: 'gift' };
    }
};

export default function RewardDetailsModal({ visible, reward, isClaimed, isLocked, onClose, onClaimAction }: Props) {
    const { theme } = useUnistyles();
    const [fetchedImage, setFetchedImage] = useState<string | null>(null);
    const [isClosing, setIsClosing] = useState(false);

    // Animations
    const cardScale = useSharedValue(0);
    const cardOpacity = useSharedValue(0);
    const rewardScale = useSharedValue(0.5);
    const glowOpacity = useSharedValue(0.3);
    const sparkleRotation = useSharedValue(0);
    const sparkleScale = useSharedValue(0);
    const titlePulse = useSharedValue(1);

    // Handle close with exit animation
    const handleClose = () => {
        setIsClosing(true);
        // Animate out
        cardScale.value = withTiming(0.8, { duration: 200 });
        cardOpacity.value = withTiming(0, { duration: 200 });
        sparkleScale.value = withTiming(0, { duration: 150 });
        
        // Actually close after animation
        setTimeout(() => {
            setIsClosing(false);
            onClose();
        }, 220);
    };

    // Card entrance animation
    const cardStyle = useAnimatedStyle(() => ({
        transform: [{ scale: cardScale.value }],
        opacity: cardOpacity.value,
    }));

    // Reward item pop-in animation
    const rewardStyle = useAnimatedStyle(() => ({
        transform: [{ scale: rewardScale.value }],
    }));

    // Subtle glow pulse animation
    const glowStyle = useAnimatedStyle(() => ({
        opacity: glowOpacity.value,
    }));

    // Sparkle container rotation
    const sparkleContainerStyle = useAnimatedStyle(() => ({
        transform: [
            { rotate: `${sparkleRotation.value}deg` },
            { scale: sparkleScale.value }
        ],
        opacity: interpolate(sparkleScale.value, [0, 1], [0, 1]),
    }));

    // Title badge pulse animation
    const titlePulseStyle = useAnimatedStyle(() => ({
        transform: [{ scale: titlePulse.value }],
    }));

    useEffect(() => {
        if (visible) {
            // Card entrance
            cardScale.value = withSpring(1, { damping: 15, stiffness: 120 });
            cardOpacity.value = withTiming(1, { duration: 200 });
            
            // Reward pop-in with bounce
            rewardScale.value = withSequence(
                withTiming(0.5, { duration: 0 }),
                withSpring(1.1, { damping: 8, stiffness: 150 }),
                withSpring(1, { damping: 12, stiffness: 150 })
            );

            // Sparkle rotation animation (not for titles)
            if (!isLocked) {
                sparkleScale.value = withTiming(1, { duration: 400 });
                sparkleRotation.value = withRepeat(
                    withTiming(360, { duration: 12000, easing: Easing.linear }),
                    -1
                );

                // Title pulse animation (gentle breathing effect)
                titlePulse.value = withRepeat(
                    withSequence(
                        withTiming(1.05, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
                        withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) })
                    ),
                    -1,
                    true
                );
            }
        } else {
            cardScale.value = 0;
            cardOpacity.value = 0;
            rewardScale.value = 0.5;
            sparkleRotation.value = 0;
            sparkleScale.value = 0;
            titlePulse.value = 1;
        }
    }, [visible, isLocked]);

    // Fetch border image
    useEffect(() => {
        if (visible && reward) {
            setFetchedImage(null);
            if (reward.title.toLowerCase().includes('border')) {
                const fetchBorderImage = async () => {
                    try {
                        const borderName = reward.title.replace(' Border', '').replace('Border', '').trim();
                        const { data, error } = await db.gamification
                            .from('Cosmetic_avatar_borders')
                            .select('media_url, name')
                            .ilike('name', `%${borderName}%`)
                            .maybeSingle();

                        if (data?.media_url) {
                            let mediaPath = data.media_url;
                            if (mediaPath.includes('seasonal_summer') || mediaPath.includes('seasonal_winter')) {
                                mediaPath = mediaPath.replace('seasonal_summer', 'seasonal').replace('seasonal_winter', 'seasonal');
                            }
                            const { data: publicData } = db.public.storage
                                .from('border-skins')
                                .getPublicUrl(mediaPath);
                            if (publicData?.publicUrl) {
                                setFetchedImage(publicData.publicUrl);
                            }
                        }
                    } catch (e) {
                        console.log('Error fetching border image:', e);
                    }
                };
                fetchBorderImage();
            }
        }
    }, [visible, reward]);

    if (!visible || !reward) return null;

    const rewardTheme = getTheme(reward.title);
    const isTitle = reward.title.toLowerCase().includes('title');
    const isBorder = reward.title.toLowerCase().includes('border');

    // Render the main reward visual
    const renderRewardVisual = () => {
        if (isLocked) {
            return (
                <View style={styles.lockedContainer}>
                    <FontAwesome6 name="lock" size={60} color="#9CA3AF" />
                    <Text style={styles.lockedText}>Reach Level {reward.level}</Text>
                </View>
            );
        }

        // For items with images (coins, XP boost)
        if (reward.image) {
            return (
                <RNImage 
                    source={reward.image} 
                    style={styles.rewardImageLarge} 
                    resizeMode="contain" 
                />
            );
        }

        // For Title rewards - show styled title text with pulse animation
        if (isTitle) {
            const titleName = reward.title.replace(' Title', '').replace('Title', '').trim();
            return (
                <Animated.View style={[styles.titleContainer, titlePulseStyle]}>
                    <LinearGradient
                        colors={rewardTheme.colors}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.titleGradientBadge}
                    >
                        <Text style={styles.titleNameText}>{titleName}</Text>
                    </LinearGradient>
                </Animated.View>
            );
        }

        // For Border rewards - show border image large
        if (isBorder && fetchedImage) {
            return (
                <ExpoImage 
                    source={{ uri: fetchedImage }} 
                    style={styles.borderImageLarge} 
                    contentFit="contain" 
                />
            );
        }

        // Fallback: icon
        return (
            <View style={[styles.iconFallback, { backgroundColor: rewardTheme.colors[0] + '20' }]}>
                <FontAwesome6 name={rewardTheme.icon} size={50} color={rewardTheme.colors[0]} />
            </View>
        );
    };

    return (
        <View style={styles.absoluteOverlay}>
            <BlurView intensity={50} tint="dark" style={StyleSheet.absoluteFill} />
            <TouchableOpacity style={StyleSheet.absoluteFill} onPress={handleClose} activeOpacity={1} />
            
            <Animated.View style={[styles.card, { backgroundColor: theme.colors.surface }, cardStyle]}>
                

                {/* Main Reward Visual with sparkles */}
                <View style={styles.rewardWrapper}>
                    {/* Animated sparkle particles - hide for titles since they're rectangular */}
                    {!isLocked && !isTitle && (
                        <Animated.View style={[styles.sparkleContainer, sparkleContainerStyle]}>
                            {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => (
                                <View 
                                    key={i} 
                                    style={[
                                        styles.sparkle, 
                                        { 
                                            transform: [
                                                { rotate: `${angle}deg` },
                                                { translateY: -SCREEN_WIDTH * 0.16 }
                                            ],
                                            backgroundColor: i % 2 === 0 ? rewardTheme.colors[0] : rewardTheme.colors[1],
                                            width: i % 2 === 0 ? SCREEN_WIDTH * 0.025 : SCREEN_WIDTH * 0.018,
                                            height: i % 2 === 0 ? SCREEN_WIDTH * 0.025 : SCREEN_WIDTH * 0.018,
                                        }
                                    ]} 
                                />
                            ))}
                        </Animated.View>
                    )}

                    <Animated.View style={[styles.rewardVisualContainer, rewardStyle]}>
                        {renderRewardVisual()}
                    </Animated.View>
                </View>

                {/* Happy Sprig Celebration (appears when collected) */}
                {isClaimed && (
                    <View style={{ 
                        position: 'absolute', 
                        top: -65, 
                        right: -25, 
                        zIndex: 999, // Ensure it's on top of everything
                        elevation: 50, // Android requirement to break out of parent elevation
                        width: 130, // Explicit container size
                        height: 130,
                        overflow: 'visible'
                    }}>
                        <ExpoImage
                            source={require('../../assets/animations/happy_sprig.gif')}
                            style={{ width: '100%', height: '100%' }}
                            contentFit="contain"
                        />
                    </View>
                )}
                
                {/* Content */}
                <Text style={[styles.title, { color: theme.colors.text }]}>{reward.title}</Text>
                <Text style={[styles.levelLabel, { color: rewardTheme.colors[0] }]}>
                    Unlocked at Level {reward.level}
                </Text>
                
                <View style={[styles.divider, { backgroundColor: theme.colors.greyedOut }]} />
                
                <Text style={[styles.description, { color: theme.colors.typography }]}>
                    {reward.description}
                </Text>

                {/* Action Button */}
                {isLocked ? (
                    <TouchableOpacity style={styles.button} onPress={handleClose} activeOpacity={0.8}>
                        <View style={styles.lockedButton}>
                            <Text style={styles.buttonText}>🔒 Locked</Text>
                        </View>
                    </TouchableOpacity>
                ) : isClaimed ? (
                    <TouchableOpacity style={styles.button} onPress={handleClose}>
                        <View style={[styles.collectedButton, { borderColor: rewardTheme.colors[0] }]}>
                            <Text style={[styles.buttonText, { color: rewardTheme.colors[0] }]}>
                                Collected ✓
                            </Text>
                        </View>
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity style={styles.button} onPress={() => onClaimAction?.()}>
                        <LinearGradient
                            colors={rewardTheme.colors}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.claimButton}
                        >
                            <Text style={styles.buttonText}>Claim Reward!</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                )}
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    absoluteOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: SCREEN_WIDTH,
        height: SCREEN_HEIGHT,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 9999,
        elevation: 9999,
    },
    card: {
        width: Math.min(SCREEN_WIDTH * 0.88, 360),
        borderRadius: 28,
        padding: 28,
        alignItems: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 15 },
        shadowOpacity: 0.25,
        shadowRadius: 25,
        elevation: 15, // Android shadow
        overflow: 'visible', // CRITICAL for Sprig to verify
        backgroundColor: '#FFF'
    },
    glowBackground: {
        position: 'absolute',
        top: -50,
        width: 250,
        height: 250,
        borderRadius: 125,
    },
    glowGradient: {
        width: '100%',
        height: '100%',
        borderRadius: 150,
    },
    sparkleContainer: {
        position: 'absolute',
        width: SCREEN_WIDTH * 0.38,
        height: SCREEN_WIDTH * 0.38,
        alignItems: 'center',
        justifyContent: 'center',
    },
    sparkle: {
        position: 'absolute',
        borderRadius: 10,
        shadowColor: '#fff',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 4,
        elevation: 3,
    },
    rewardWrapper: {
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: SCREEN_WIDTH * 0.05,
        minHeight: SCREEN_WIDTH * 0.35,
    },
    rewardVisualContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: SCREEN_WIDTH * 0.3,
    },
    rewardImageLarge: {
        width: SCREEN_WIDTH * 0.25,
        height: SCREEN_WIDTH * 0.25,
    },
    borderImageLarge: {
        width: SCREEN_WIDTH * 0.3,
        height: SCREEN_WIDTH * 0.3,
    },
    lockedContainer: {
        alignItems: 'center',
        opacity: 0.6,
    },
    lockedText: {
        marginTop: 8,
        fontSize: 14,
        color: '#9CA3AF',
        fontWeight: '500',
    },
    titleContainer: {
        alignItems: 'center',
    },
    titleGradientBadge: {
        paddingHorizontal: 28,
        paddingVertical: 14,
        borderRadius: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 5,
    },
    titleNameText: {
        color: 'white',
        fontSize: 24,
        fontWeight: '800',
        textAlign: 'center',
        letterSpacing: 0.5,
    },
    iconFallback: {
        width: 100,
        height: 100,
        borderRadius: 50,
        justifyContent: 'center',
        alignItems: 'center',
    },
    title: {
        fontSize: 24,
        fontWeight: '800',
        textAlign: 'center',
        marginBottom: 6,
    },
    levelLabel: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 16,
    },
    divider: {
        width: '50%',
        height: 2,
        opacity: 0.15,
        marginBottom: 16,
        borderRadius: 1,
    },
    description: {
        fontSize: 15,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 24,
        paddingHorizontal: 8,
    },
    button: {
        width: '100%',
        height: 52,
        borderRadius: 16,
    },
    lockedButton: {
        flex: 1,
        backgroundColor: '#4B5563',
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    collectedButton: {
        flex: 1,
        backgroundColor: 'transparent',
        borderWidth: 2.5,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    claimButton: {
        flex: 1,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 6,
        elevation: 5,
    },
    buttonText: {
        color: 'white',
        fontSize: 17,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
});
