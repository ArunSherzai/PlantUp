import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  LayoutChangeEvent,
  SectionList,
  Alert,
} from 'react-native';
import { useUnistyles, StyleSheet } from 'react-native-unistyles';
import { LinearGradient } from 'expo-linear-gradient';
import MaskedView from '@react-native-masked-view/masked-view';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

// Eigene Imports
import { db } from '../../../utils/supabase';
import DraggableBottomSheet from '../../../components/DraggableBottomSheet';
import { useUserStore } from '../../../stores/UserStore';
import DailyStreakComponent from '~/features/ShowMissions/components/DailyStreak';
import BoosterWidget from '~/features/ShowMissions/components/BoosterWidget';


const { height, width } = Dimensions.get('window');

// --- TYPES ---
type QuestData = {
  id: number;
  title: string;
  description: string;
  xp_reward: number;
  target_count: number;
  type: 'daily' | 'weekly' | 'conditional' | 'milestone';
};

type UserQuest = {
  id: number;
  status: 'active' | 'completed' | 'claimed';
  progress: number;
  plant_id: string | null;
  Plants: { nickname: string } | null;
  Quests: QuestData;
};

// --- HELPER --
const getStreakMultiplier = (streak: number) => {
  if (streak < 10) return 1.0;
  if (streak < 20) return 1.25;
  if (streak < 30) return 1.50;
  if (streak < 39) return 1.75;
  return 2.0;
};

export default function ShowMissionsScreen() {
  const { theme } = useUnistyles();
  const [quests, setQuests] = useState<UserQuest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const { addXP, updateStreak, profile, fetchProfile, fetchInventory } = useUserStore();

  // --- FETCH DATA ---
  const fetchQuests = useCallback(async () => {
    try {
      const {
        data: { user },
      } = await db.public.auth.getUser();
      if (!user) return;

      const { data, error } = await db.gamification
        .from('active_quests_with_plants')
        .select('*')
        .eq('user_id', user.id)
        .order('status', { ascending: true });

      if (error) throw error;

      const formattedData = data.map((item: any) => ({
        id: item.id,
        status: item.status,
        progress: item.progress,
        plant_id: item.plant_id,
        Plants: item.plant_name ? { nickname: item.plant_name } : null,
        Quests: {
          id: item.quest_id || item.id,
          title: item.title,
          description: item.description,
          xp_reward: item.xp_reward,
          target_count: item.target_count,
          type: item.type,
        },
      }));

      setQuests(formattedData as any);
    } catch (e) {
      console.error('Error fetching quests:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchQuests();
    fetchProfile(); 
  }, [fetchQuests]);

  // Alert for Rescued Streak
  useEffect(() => {
    if (profile?.streak_rescued_date) {
        const today = new Date().toISOString().split('T')[0];
        if (profile.streak_rescued_date === today) {
            Alert.alert(
                'Streak Rescued! ❄️', 
                'You missed a day, but your streak was saved by a Freeze item!'
            );
        }
    }
  }, [profile?.streak_rescued_date]);

  // --- CLAIM LOGIC ---
  const handleClaim = useCallback(async (userQuestId: number) => {
    try {
      setLoading(true);

      // Call RPC
      const { data, error } = await db.public.rpc('claim_quest', {
        user_quest_id: userQuestId,
      });

      if (error) throw error;

      const result = data as any;
      if (!result.success) {
        Alert.alert('Info', result.message || 'Could not claim quest.');
        return;
      }

      // Update Local State
      const gainedXP = result.xp_gained;
      const newStreak = result.new_streak;
      const multiplier = result.multiplier;

      // 1. Update Profile Store
      await addXP(gainedXP);
      const todayDate = new Date().toISOString().split('T')[0];
      updateStreak(newStreak, todayDate);

      // 2. Update Quest List locally to avoid full refetch
      setQuests((currentQuests) =>
        currentQuests.map((q) => {
          if (q.id === userQuestId) {
            return { ...q, status: 'claimed' };
          }
          return q;
        })
      );

      // 3. Show Success Message
      Alert.alert(
        'Quest Claimed!',
        `You earned ${gainedXP} XP!\nStreak: ${newStreak} days (${multiplier}x Multiplier)`
      );

    } catch (e) {
      console.error('Error claiming:', e);
      Alert.alert('Error', 'Failed to claim quest.');
    } finally {
      setLoading(false);
    }
  }, [addXP, updateStreak]);

  // Listen filtern
  const dailyQuests = quests.filter((q) => {
    if (q.Quests.type === 'daily') return true;
    if (q.Quests.type === 'conditional') return q.status !== 'claimed';
    return false;
  });

  const weeklyQuests = quests.filter((q) => q.Quests.type === 'weekly');

  // Sections erstellen
  const sections = [
    {
      title: 'Daily Quests',
      data: dailyQuests.length > 0 ? dailyQuests : [{ id: 'empty-daily', type: 'empty' } as any],
    },
    {
      title: 'Weekly Quests',
      data: weeklyQuests.length > 0 ? weeklyQuests : [{ id: 'empty-weekly', type: 'empty' } as any],
    },
  ];

  // --- MULTIPLIER CALCULATION ---
  const currentStreak = profile?.streak_length || 0;
  const streakMultiplier = getStreakMultiplier(currentStreak);
  
  const boostEndTime = profile?.active_boost_end_time;
  const isBoostActive = boostEndTime && new Date(boostEndTime) > new Date();
  const boostMultiplier = isBoostActive ? 0.5 : 0;

  const totalMultiplier = streakMultiplier + boostMultiplier;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={{ flex: 1 }}>
        {/* HINTERGRUND */}
        <View style={styles.bgContainer}>
          <Image
            source={require('../../../../assets/images/showDailyMissionsBackground.png')}
            style={styles.bgImage}
            resizeMode="cover"
          />
        </View>

        {/* HEADER */}
        <View style={styles.headerWrapper}>
          <View style={{ alignSelf: 'flex-start', marginBottom: 10 }}>
            <Text style={styles.brandText}>PlantUp</Text>
          </View>
          
          {/* Top Right Booster Widget */}
          <View style={{ position: 'absolute', top: 5, right: 20, zIndex: 100 }}>
             <BoosterWidget />
          </View>

          <MaskedView
            style={{ height: 110, width: '100%', marginBottom: 10 }}
            maskElement={<Text style={styles.headerTitle}>Quests and{'\n'}Daily Rewards!</Text>}>
            <LinearGradient
              colors={['#FFFFFF', '#E0F7FA']}
              start={{ x: 0.2, y: 0 }}
              end={{ x: 0.8, y: 1 }}
              style={{ flex: 1 }}
            />
          </MaskedView>

          <View style={styles.wrapper}>
            <DailyStreakComponent />
          </View>
        </View>

        {/* DRAGGABLE BOTTOM SHEET */}
        <DraggableBottomSheet initialHeight={0.55} maxHeight={0.75}>
          <View style={{ flex: 1, paddingHorizontal: 20 }}>
            {loading && !refreshing ? (
              <ActivityIndicator
                size="large"
                color={theme.colors.primary}
                style={{ marginTop: 20 }}
              />
            ) : (
              // --- SECTION LIST START ---
              <SectionList
                sections={sections}
                keyExtractor={(item) => item.id.toString()}
                // --- PERFORMANCE PROPS (Optimiert für Android) ---
                removeClippedSubviews={true} // Wichtig! Versteckt unsichtbares.
                initialNumToRender={6} // Rendert genug für den ersten Blick.
                maxToRenderPerBatch={4} // Lädt moderat nach beim Scrollen.
                windowSize={7} // Behält ein bisschen was im Speicher (weniger Ruckeln beim Zurückscrollen).

                contentContainerStyle={{ paddingBottom: height * 0.5 }}
                showsVerticalScrollIndicator={false}
                ListHeaderComponent={<MultiplierBanner multiplier={totalMultiplier} isBoosterActive={!!isBoostActive} />}
                renderSectionHeader={({ section: { title } }) => (
                  <View style={styles.sectionHeaderContainer}>
                    <Text style={styles.sectionTitle}>{title}</Text>
                  </View>
                )}
                renderItem={({ item }) => {
                  // Leere Listen
                  if (item.type === 'empty') {
                    const text =
                      item.id === 'empty-daily'
                        ? "You've completed all daily quests!"
                        : 'No weekly quests active.';
                    return (
                      <View style={styles.mintQuestContainerEmpty}>
                        <Text style={styles.emptyText}>{text}</Text>
                      </View>
                    );
                  }

                  // Echte Quest
                  return (
                    <View style={styles.itemWrapperMint}>
                      <QuestCard
                        quest={item}
                        onClaim={() => handleClaim(item.id)}
                        isLast={false}
                        multiplier={totalMultiplier}
                      />
                    </View>
                  );
                }}
                refreshControl={
                  <RefreshControl
                    refreshing={refreshing}
                    onRefresh={() => {
                      setRefreshing(true);
                      fetchQuests();
                      fetchProfile();
                      fetchInventory(); // Added to refresh booster data
                    }}
                    tintColor={theme.colors.primary}
                  />
                }
              />
            )}
          </View>
        </DraggableBottomSheet>


      </View>
    </GestureHandlerRootView>
  );
}

// --- QUEST CARD (Normal, kein Memo) ---
function QuestCard({
  quest,
  onClaim,
  isLast,
  multiplier,
}: {
  quest: UserQuest;
  onClaim: () => void;
  isLast: boolean;
  multiplier: number;
}) {
  if (!quest || !quest.Quests) return null;

  const target = quest.Quests.target_count || 1;
  const progress = quest.progress || 0;
  const percentage = Math.min(progress / target, 1) * 100;

  const canClaim = quest.status === 'completed';
  const isClaimed = quest.status === 'claimed';

  const plantName = quest.Plants?.nickname || 'your plant';
  const rawDesc = quest.Quests.description || '';
  const safeDescription = rawDesc.replace('{{plant_name}}', plantName);

  // Multiplier Visuals
  const hasMultiplier = multiplier > 1.0;
  // Rot/Orange Gradient Style
  const fireColor = '#FF512F';

  const xpBgColor = '#FFF';
  const xpBorderColor = hasMultiplier ? fireColor : '#329D9C';
  const xpTextColor = hasMultiplier ? fireColor : '#329D9C';

  // Calculate potential XP with multiplier for display
  const baseXP = quest.Quests.xp_reward;
  const displayXP = Math.floor(baseXP * multiplier);

  return (
    <View style={[styles.card, isClaimed && { opacity: 0.6 }]}>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 8,
        }}>
        <View style={{ flex: 1, paddingRight: 10 }}>
          <Text style={styles.questTitle} numberOfLines={1}>
            {quest.Quests.title}
          </Text>
          <Text style={styles.questDescription} numberOfLines={2}>
            {safeDescription}
          </Text>
        </View>

        {canClaim ? (
          <TouchableOpacity onPress={onClaim} disabled={isClaimed}>
            <View style={styles.claimButtonStyled}>
              <LinearGradient
                colors={['#329D9C', '#00D988']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={StyleSheet.absoluteFillObject}
              />
              <Text style={styles.claimButtonText}>CLAIM</Text>
            </View>
          </TouchableOpacity>
        ) : (
          !isClaimed && (
            <View style={[styles.xpContainer, { borderColor: xpBorderColor }]}>
              {/* Subtle background for multiplier */}
              {hasMultiplier && (
                <LinearGradient
                  colors={['rgba(221, 36, 118, 0.05)', 'rgba(255, 81, 47, 0.05)']}
                  style={StyleSheet.absoluteFillObject}
                />
              )}
              <FontAwesome6
                name={hasMultiplier ? "fire" : "star"}
                size={12}
                color={xpTextColor}
                style={{ marginRight: 4 }}
                solid
              />
              <Text style={[styles.xpText, { color: xpTextColor }]}>
                {displayXP} XP
              </Text>
            </View>
          )
        )}
        {isClaimed && <FontAwesome6 name="check" size={20} color="#329D9C" />}
      </View>

      <View style={{ marginTop: 5 }}>
        <View style={styles.progressBarBg}>
          <LinearGradient
            colors={['#329D9C', '#8bdcbd']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.progressBarFill, { width: `${percentage}%` }]}
          />
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
          <Text style={styles.progressTextSubtle}>{percentage.toFixed(0)}%</Text>
          <Text style={styles.progressTextSubtle}>
            {progress}/{target}
          </Text>
        </View>
      </View>
    </View>
  );
}

const MultiplierBanner = ({ multiplier, isBoosterActive }: { multiplier: number, isBoosterActive: boolean }) => {
  if (multiplier <= 1.0) return null;

  // Dynamic text
  let title = "XP Bonus Active! 🔥";
  let subtitle = `You're earning ${multiplier}x XP on all quests!`;

  if (isBoosterActive && multiplier > 1.5) { 
      // Both active (e.g. 1.25 streak + 0.5 boost = 1.75)
      title = "Mega XP Boost! 🚀";
      subtitle = `Booster & Streak combined: ${multiplier}x XP!`;
  } else if (isBoosterActive) {
      title = "Fertilizer Boost Active! 🌱";
      subtitle = `Your values are boosted by +0.5x!`;
  }

  return (
    <View style={styles.bannerContainer}>
      <LinearGradient
        colors={['#DD2476', '#FF512F']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={StyleSheet.absoluteFillObject}
      />
      <View style={styles.bannerContent}>
        <View style={styles.bannerIconContainer}>
          <FontAwesome6 name="fire" size={16} color="white" solid />
        </View>
        <View style={{ flex: 1, paddingRight: 10 }}>
          <Text style={styles.bannerTitle}>{title}</Text>
          <Text style={styles.bannerSubtitle}>{subtitle}</Text>
        </View>
        <Text style={styles.bannerMultiplier}>x{multiplier}</Text>
      </View>
    </View>
  );
};

// --- STYLES ---
const styles = StyleSheet.create((theme) => ({
  bgContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '55%',
    justifyContent: 'flex-end',
    zIndex: -1,
  },
  bgImage: { width: '100%', height: '100%' },
  headerWrapper: {
    position: 'absolute',
    top: height < 850 ? 40 : '6%',
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  brandText: { color: 'rgba(255,255,255,0.9)', fontWeight: '600', fontSize: 18 },
  headerTitle: { fontSize: width < 380 ? 32 : 40, fontWeight: '900', color: 'white', lineHeight: width < 380 ? 36 : 44 },
  comingSoonBar: {
    borderRadius: 18,
    height: 60,
    width: '100%',
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  wrapper: { width: '100%', flexDirection: 'column' },

  sectionHeaderContainer: { marginBottom: 10 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: theme.colors.text, textAlign: 'center' },
  itemWrapperMint: {
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 15,
    paddingVertical: 8,
    marginHorizontal: 0,
    borderRadius: 12,
    marginBottom: 10,
  },
  mintQuestContainerEmpty: {
    backgroundColor: theme.colors.surface,
    borderRadius: 20,
    padding: 15,
    borderWidth: 2,
    borderColor: theme.colors.greyedOut,
  },
  emptyText: {
    textAlign: 'center',
    color: theme.colors.typography,
    fontStyle: 'italic',
    padding: 10,
  },

  card: {
    backgroundColor: theme.colors.background,
    borderRadius: 15,
    padding: 15,
    shadowColor: theme.colors.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  questTitle: { fontSize: 15, fontWeight: '600', color: theme.colors.text },
  questDescription: { fontSize: 12, color: theme.colors.typography, marginTop: 2, lineHeight: 16 },
  xpContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    // borderColor overwritten by logic
    overflow: 'hidden', // for gradient bg
  },
  xpText: { fontSize: 12, fontWeight: '700' },

  multiplierTag: {
    backgroundColor: '#FF512F',
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 1,
    marginLeft: 6,
  },
  multiplierText: { color: 'white', fontSize: 9, fontWeight: 'bold' },

  claimButtonStyled: {
    width: 70,
    height: 32,
    borderRadius: 16,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#329D9C',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 3,
  },
  claimButtonText: { color: 'white', fontWeight: '800', fontSize: 11, letterSpacing: 0.5 },
  progressBarBg: {
    height: 10,
    backgroundColor: theme.colors.greyedOut,
    borderRadius: 5,
    overflow: 'hidden',
    marginTop: 5,
  },
  progressBarFill: { height: '100%', borderRadius: 5 },
  progressTextSubtle: { fontSize: 11, color: theme.colors.typography, fontWeight: '600' },
  bannerContainer: {
    marginHorizontal: 20,
    marginTop: 10,
    marginBottom: 20,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#FF512F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  bannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  bannerIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  bannerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: 'white',
    marginBottom: 2,
  },
  bannerSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '500',
  },
  bannerMultiplier: {
    fontSize: 24,
    fontWeight: '900',
    color: 'white',
    marginLeft: 'auto',
    opacity: 0.9,
    fontStyle: 'italic',
  },
}));
