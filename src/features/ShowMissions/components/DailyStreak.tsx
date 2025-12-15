import React, { useState, useEffect } from 'react';
import { View, Text, Dimensions, TouchableOpacity, Alert, Image } from 'react-native';
import { StyleSheet as UnistylesSheet, useUnistyles } from 'react-native-unistyles';
import { LinearGradient } from 'expo-linear-gradient';
import { FontAwesome6 } from '@expo/vector-icons';
import { useUserStore } from '../../../stores/UserStore';

const FREEZE_ITEM_ID = 'streak_freeze_24h';

export default function DailyStreakComponent() {

  const { theme } = useUnistyles();
  const { profile, inventory, fetchInventory } = useUserStore();

  const streak = profile?.streak_length || 0;

  // Refresh inventory on mount to ensure we see new items
  useEffect(() => {
    fetchInventory();
  }, []);

  const freezeItem = inventory.find(i => i.item_id === FREEZE_ITEM_ID);
  const ownedFreezeQuantity = freezeItem?.quantity || 0;

  // Check if completed today
  const lastDate = profile?.last_completed_date;
  const isCompletedToday = lastDate === new Date().toISOString().split('T')[0];

  // Auto-Protection: Active if user has item AND hasn't completed today's quest
  const isProtected = !isCompletedToday && ownedFreezeQuantity > 0;

  // ... cycle progress logic ...
  const cycleProgress = streak % 10;
  const visualProgress = (cycleProgress === 0 && streak > 0) ? 10 : cycleProgress;

  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
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

      {/* TOP ROW: Streak Count (Protected or Normal) */}
      <View style={[styles.topRow, { justifyContent: 'space-between' }]}>
        <View style={styles.streakBadge}>
          {isCompletedToday ? (
            <View style={styles.doneBadge}>
              <FontAwesome6 name="check" size={14} color="#00D988" />
            </View>
          ) : !isProtected && (
            <FontAwesome6 
                name="fire" 
                size={18} 
                color={isMaxed ? "#FFD700" : "#FF512F"} 
                solid 
            />
          )}
          <Text style={[styles.streakText, isMaxed && { color: '#FFD700' }, isProtected && { color: '#A5F2F3' }]}>
            {isProtected ? `❄️ Frozen (${streak}) ❄️` : `${streak} Day Streak`}
          </Text>
        </View>

        {/* RIGHT SIDE: Freeze Count or Reward */}
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            {/* Freeze Item Count Badge */}
            {ownedFreezeQuantity > 0 && (
                <View style={styles.freezeCountBadge}>
                    <FontAwesome6 name="snowflake" size={12} color="#A5F2F3" />
                    <Text style={styles.freezeCountText}>{ownedFreezeQuantity}</Text>
                </View>
            )}

            {/* Status Badge: Protected OR Next Reward */}
            {isProtected && !isCompletedToday ? (
                <View style={styles.frozenStatusBadge}>
                <Text style={styles.frozenStatusText}>PROTECTED</Text>
                </View>
            ) : (!isMaxed && (
                <View style={styles.nextRewardBadge}>
                <Text style={styles.nextRewardText}>Next: x{nextReward}</Text>
                </View>
            ))}
        </View>
      </View>

      {/* MIDDLE ROW: Status / Timer */}
      <View style={styles.statusRow}>
        {isCompletedToday ? (
          <Text style={styles.completedText}>Daily Streak Extended!</Text>
        ) : (
          <Text style={styles.timeLeftText}>
             {`⏰ ${timeLeft} remaining`}
          </Text>
        )}
      </View>

      {/* BOTTOM: Progress Bars */}
      <View style={styles.barContainer}>
        {renderBlocks()}
      </View>

      {/* FOOTER: Hint Text */}
      <View style={{ marginTop: 12, justifyContent: 'center' }}>
          <Text style={[styles.hintText, isMaxed && { color: '#FFD700', fontWeight: 'bold' }, { textAlign: 'center', width: '100%' }]}>
            {isMaxed ? "Legendary Status! Max Multiplier Active" : `${10 - visualProgress} days until next multiplier upgrade`}
          </Text>
      </View>
    </LinearGradient>
  );
}

const StyleSheet = UnistylesSheet;

const { width } = Dimensions.get('window');
const isSmallDevice = width < 380;

const styles = UnistylesSheet.create((theme) => ({
  container: {
    width: '100%',
    paddingVertical: isSmallDevice ? 10 : 15,
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
    justifyContent: 'space-between',
    alignItems: 'center',
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
    fontSize: isSmallDevice ? 18 : 22,
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
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  timeLeftText: {
    color: '#FFD700',
    fontSize: 14,
    fontWeight: '600',
    opacity: 0.9,
  },

  // Reward Badges
  maxBadge: {
    // Removed container styles
  },
  maxReachedText: {
    color: '#FFD700',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  nextRewardBadge: {
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.5)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  nextRewardText: {
    color: '#FFD700',
    fontSize: 12,
    fontWeight: 'bold',
  },


  frozenStatusBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(165, 242, 243, 0.15)',
      borderWidth: 1,
      borderColor: 'rgba(165, 242, 243, 0.5)',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
  },
  frozenStatusText: {
      color: '#A5F2F3',
      fontSize: 12,
      fontWeight: 'bold',
      letterSpacing: 1,
  },
  
  freezeCountBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(165, 242, 243, 0.1)',
      borderWidth: 1,
      borderColor: 'rgba(165, 242, 243, 0.3)',
      paddingHorizontal: 6,
      paddingVertical: 4,
      borderRadius: 12,
      gap: 4,
  },
  freezeCountText: {
      color: '#A5F2F3',
      fontSize: 12,
      fontWeight: 'bold',
  },

  barContainer: {
    flexDirection: 'row',
    height: isSmallDevice ? 10 : 14,
    gap: isSmallDevice ? 3 : 5,
  },
  
  // Progress Bar
  progressContainer: {
    height: '100%',
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
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
}));
