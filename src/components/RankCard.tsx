import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { useUnistyles } from 'react-native-unistyles';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { getLevelProgress, getXPForNextLevel, getTotalXPForLevel } from '../utils/leveling';

type RankCardProps = {
    level: number;
    xp: number;
    rankName?: string;
};

export default function RankCard({ level, xp, rankName = 'Blooming Sprout' }: RankCardProps) {
    const { theme } = useUnistyles();

    const progress = getLevelProgress(xp, level);
    const xpForNext = getXPForNextLevel(level);
    const currentLevelXP = getTotalXPForLevel(level);
    const xpInLevel = xp - currentLevelXP;
    const xpNeededInLevel = xpForNext - currentLevelXP;

    const animatedStyle = useAnimatedStyle(() => {
        return {
            width: withTiming(`${progress * 100}%`, { duration: 1000 }),
        };
    });

    return (
        <View style={styles.container}>
            {/* Emblem Glow Effect */}
            <View style={styles.glowContainer}>
                <LinearGradient
                    colors={['rgba(76, 175, 80, 0.2)', 'transparent']}
                    style={styles.glow}
                />
            </View>

            {/* Rank Emblem */}
            <View style={styles.emblemContainer}>
                {/* Placeholder for Rank Emblem */}
                <View style={styles.emblemPlaceholder}>
                    <Image
                        source={require('../../assets/images/icon.png')}
                        style={{ width: 60, height: 60, tintColor: '#2E7D32' }}
                    />
                </View>
            </View>

            {/* Level & Rank Info */}
            <View style={styles.infoContainer}>
                <Text style={styles.levelText}>Level {level}</Text>
                <Text style={styles.xpText}>{xpInLevel} / {xpNeededInLevel} XP</Text>
            </View>

            {/* Progress Bar */}
            <View style={styles.progressBarBg}>
                <Animated.View style={[styles.progressBarFill, animatedStyle]}>
                    <LinearGradient
                        colors={['#4CAF50', '#81C784']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={{ flex: 1 }}
                    />
                </Animated.View>
            </View>

            <Text style={styles.rankName}>Rank: <Text style={styles.rankNameBold}>{rankName}</Text></Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 20,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 5,
        marginVertical: 20,
        width: '100%',
        minHeight: 350,
        paddingTop: '20%',
    },
    glowContainer: {
        position: 'absolute',
        top: -20,
        left: 0,
        right: 0,
        alignItems: 'center',
    },
    glow: {
        width: 150,
        height: 150,
        borderRadius: 75,
    },
    emblemContainer: {
        marginBottom: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emblemPlaceholder: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#E8F5E9',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: '#A5D6A7',
    },
    infoContainer: {
        alignItems: 'center',
        marginBottom: 10,
    },
    levelText: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#1B5E20',
    },
    xpText: {
        fontSize: 12,
        color: '#757575',
        marginTop: 4,
    },
    progressBarBg: {
        width: '100%',
        height: 12,
        backgroundColor: '#E0E0E0',
        borderRadius: 6,
        overflow: 'hidden',
        marginBottom: 10,
    },
    progressBarFill: {
        height: '100%',
        borderRadius: 6,
    },
    rankName: {
        fontSize: 14,
        color: '#424242',
    },
    rankNameBold: {
        fontWeight: 'bold',
        color: '#2E7D32',
    },
});
