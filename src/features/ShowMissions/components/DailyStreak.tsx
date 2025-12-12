import React from 'react';
import { View, Text, Dimensions } from 'react-native';
import { StyleSheet as UnistylesSheet, useUnistyles } from 'react-native-unistyles';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import { LinearGradient } from 'expo-linear-gradient';
import { useUserStore } from '../../../stores/UserStore';

export default function DailyStreakComponent() {
  const { theme } = useUnistyles();
  const { profile } = useUserStore();

  const streak = profile?.streak_length || 0;

  // Check if completed today
  const lastDate = profile?.last_completed_date;
  const isCompletedToday = lastDate === new Date().toISOString().split('T')[0];

  // Logic: Cycle of 10 days. 
  // e.g. Day 12 -> 2 blocks filled in the Current Cycle [10-20]
  const cycleProgress = streak % 10;
  // if streak is 10, 20, 30... it counts as full bar (10/10) before jumping to next tier
  // visual fix: if cycleProgress is 0 but streak > 0, it means we just hit the milestone (10/10)
  const visualProgress = (cycleProgress === 0 && streak > 0) ? 10 : cycleProgress;

  const [timeLeft, setTimeLeft] = React.useState('');

  React.useEffect(() => {
    const updateTimeLeft = () => {
      const now = new Date();
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);

      const diff = endOfDay.getTime() - now.getTime();
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      setTimeLeft(`${hours}h ${minutes}m`);
    };

    updateTimeLeft();
    const interval = setInterval(updateTimeLeft, 60000);
    return () => clearInterval(interval);
  }, []);

  const getNextMultiplier = (s: number) => {
    if (s < 10) return 1.25;
    if (s < 20) return 1.50;
    if (s < 30) return 1.75;
    if (s < 39) return 2.00;
    return 2.0;
  };

  const MAX_STREAK_CAP = 40;
  const isMaxed = streak >= MAX_STREAK_CAP;

  const nextReward = getNextMultiplier(streak);

  const renderBlocks = () => {
    const blocks = [];
    const totalBlocks = 10;

    for (let i = 1; i <= totalBlocks; i++) {
      // If maxed, everything is filled
      const isFilled = isMaxed ? true : i <= visualProgress;
      const isLast = i === totalBlocks;

      blocks.push(
        <View key={i} style={[styles.blockContainer, { flex: isLast ? 1.5 : 1 }]}>
          <View style={[styles.blockBase, isFilled && styles.blockFilled]}>
            {isFilled && (
              <LinearGradient
                // Gold Gradient if Maxed, else Green/Teal
                colors={isMaxed ? ['#FFD700', '#FDB931'] : ['#329D9C', '#56C596']}
                style={StyleSheet.absoluteFillObject}
              />
            )}

            {isLast && (
              <View style={styles.rewardIconContainer}>
                <FontAwesome6
                  name={isMaxed ? "crown" : (isFilled ? "gift" : "lock")}
                  size={14}
                  color={isFilled ? (isMaxed ? "#783f04" : "white") : theme.colors.greyedOut}
                />
              </View>
            )}
          </View>
        </View>
      );
    }
    return blocks;
  };

  return (
    <LinearGradient
      colors={['rgba(45, 55, 72, 0.85)', 'rgba(26, 32, 44, 0.95)']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      {/* TOP ROW: Streak Count & Reward Badge */}
      <View style={styles.topRow}>
        <View style={styles.streakBadge}>
          {isCompletedToday ? (
            <View style={styles.doneBadge}>
              <FontAwesome6 name="check" size={14} color="#00D988" />
            </View>
          ) : (
            <FontAwesome6 name="fire" size={18} color={isMaxed ? "#FFD700" : "#FF512F"} solid />
          )}
          <Text style={[styles.streakText, isMaxed && { color: '#FFD700' }]}>{streak} Day Streak</Text>
        </View>

        {isMaxed ? (
          <View style={styles.maxBadge}>
            <Text style={styles.maxReachedText}>MAX REACHED</Text>
          </View>
        ) : (
          <View style={styles.nextRewardBadge}>
            <Text style={styles.nextRewardText}>Next: x{nextReward}</Text>
          </View>
        )}
      </View>

      {/* MIDDLE ROW: Status / Timer */}
      <View style={styles.statusRow}>
        {isCompletedToday ? (
          <Text style={styles.completedText}>Daily Streak Extended!</Text>
        ) : (
          <Text style={styles.timeLeftText}>⏰ {timeLeft} remaining to extend</Text>
        )}
      </View>

      {/* BOTTOM: Progress Bars */}
      <View style={styles.barContainer}>
        {renderBlocks()}
      </View>

      <Text style={[styles.hintText, isMaxed && { color: '#FFD700', fontWeight: 'bold' }]}>
        {isMaxed ? "Legendary Status! Max Multiplier Active" : `${10 - visualProgress} days until next multiplier upgrade`}
      </Text>
    </LinearGradient>
  );
}

const StyleSheet = UnistylesSheet;

const { width } = Dimensions.get('window');
const isSmallDevice = width < 380;

const styles = UnistylesSheet.create((theme) => ({
  container: {
    width: '100%',
    paddingVertical: isSmallDevice ? 10 : 15, // Reduced padding on small devices
    paddingHorizontal: 15,
    borderRadius: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  statusRow: {
    flexDirection: 'row',
    marginBottom: isSmallDevice ? 8 : 12,
  },

  // Badges & Text
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  streakText: {
    color: 'white',
    fontWeight: '800',
    fontSize: isSmallDevice ? 16 : 18,
    textShadowColor: 'rgba(0,0,0,0.1)',
    textShadowRadius: 2,
  },
  doneBadge: {
    backgroundColor: 'rgba(0, 217, 136, 0.2)',
    padding: 4,
    borderRadius: 8,
  },

  // Status Text
  completedText: {
    color: '#00D988',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  timeLeftText: {
    color: '#FFD700',
    fontSize: 12,
    fontWeight: '600',
    opacity: 0.9,
  },

  // Reward Badges
  maxBadge: {
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  maxReachedText: {
    color: '#FFD700',
    fontSize: 11,
    fontWeight: '800',
    textShadowColor: 'rgba(255, 215, 0, 0.3)',
    textShadowRadius: 4,
  },
  nextRewardBadge: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  nextRewardText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 12,
    fontWeight: '600',
  },

  barContainer: {
    flexDirection: 'row',
    height: isSmallDevice ? 10 : 14,
    gap: isSmallDevice ? 3 : 5, // Dynamic gap
  },
  blockContainer: {
    height: '100%',
  },
  blockBase: {
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 4,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  blockFilled: {
    // Gradient handled by LinearGradient child
  },
  rewardIconContainer: {
    zIndex: 1,
  },

  hintText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    marginTop: 8,
    textAlign: 'center',
  },
}));
