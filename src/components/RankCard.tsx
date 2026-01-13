import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useUnistyles } from 'react-native-unistyles';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { getLevelProgress, getXPForNextLevel, getTotalXPForLevel } from '../utils/leveling';
import VirtualPlant from './VirtualPlant';

type RankCardProps = {
  level: number;
  xp: number;
  rankName?: string;
  seed?: number;
};

export default function RankCard({ level, xp, rankName = 'Blooming Sprout', seed = 12345 }: RankCardProps) {
  const { theme } = useUnistyles();

  const RANK_GRADIENTS: Record<string, [string, string]> = {
    Evergreen: ['#29d071', '#23b060'],
    Roseheart: ['#f68580', '#e57373'],
    Sapling: ['#68cf67', '#5cb85c'],
    Seedling: ['#4fab4b', '#439a40'],
    Sprout: ['#42973b', '#388e3c'],
    Sunflower: ['#f1aa21', '#ffa000'],
  };

  const gradientColors = RANK_GRADIENTS[rankName] || ['#4CAF50', '#388E3C'];

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
    <LinearGradient
      colors={gradientColors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}>

      {/* Virtual Plant instead of Emblem */}
      <View style={styles.emblemContainer}>
        <VirtualPlant level={level} seed={seed} width={150} height={180} />
      </View>

      {/* Level & Rank Info */}
      <View style={styles.infoContainer}>
        <Text style={styles.levelText}>Level {level}</Text>
        <Text style={styles.xpText}>
          {xpInLevel} / {xpNeededInLevel} XP
        </Text>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressBarBg}>
        <Animated.View style={[styles.progressBarFill, animatedStyle]} />
      </View>

      <Text style={styles.rankName}>
        Rank: <Text style={styles.rankNameBold}>{rankName}</Text>
      </Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 20,
    padding: 25,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
    marginVertical: 20,
    width: '100%',
    minHeight: 380, // Increased height for the plant
    justifyContent: 'center',
  },
  emblemContainer: {
    marginBottom: 10,
    alignItems: 'center',
    justifyContent: 'center',
    height: 180, // Fixed height for plant container
  },
  infoContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  levelText: {
    fontSize: 36,
    fontWeight: '900',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  xpText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 5,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  progressBarBg: {
    width: '100%',
    height: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: 7,
    overflow: 'hidden',
    marginBottom: 15,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 7,
    backgroundColor: '#FFFFFF',
  },
  rankName: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.95)',
    fontWeight: '500',
  },
  rankNameBold: {
    fontWeight: '800',
    color: '#FFFFFF',
    fontSize: 20,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
});
