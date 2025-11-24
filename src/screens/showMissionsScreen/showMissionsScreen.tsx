import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  StatusBar,
  LayoutChangeEvent,
  SectionList,
} from 'react-native';
import { useUnistyles, StyleSheet } from 'react-native-unistyles';
import { LinearGradient } from 'expo-linear-gradient';
import MaskedView from '@react-native-masked-view/masked-view';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { db } from '../../utils/supabase';
import DraggableBottomSheet from '../../components/DraggableBottomSheet';

const { height } = Dimensions.get('window');

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

export default function ShowMissionsScreen() {
  const { theme } = useUnistyles();
  const [quests, setQuests] = useState<UserQuest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // --- FETCH DATA ---
  const fetchQuests = useCallback(async () => {
    try {
      const { data: { user } } = await db.public.auth.getUser();
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
  }, [fetchQuests]);

  // --- CLAIM LOGIC ---
  const handleClaim = useCallback(async (userQuestId: number) => {
    try {
      setLoading(true);
      await new Promise((resolve) => setTimeout(resolve, 500));

      const { error } = await db.gamification
        .from('User_quests')
        .update({
          status: 'claimed',
          completed_at: new Date().toISOString(),
        })
        .eq('id', userQuestId)
        .select();

      if (error) throw error;

      setQuests((currentQuests) =>
        currentQuests.map((q) => {
          if (q.id === userQuestId) {
            return { ...q, status: 'claimed' };
          }
          return q;
        })
      );
    } catch (e) {
      console.error('Error claiming:', e);
      alert('Fehler beim Claimen.');
    } finally {
      setLoading(false);
    }
  }, []);

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

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={{ flex: 1 }}>
        <StatusBar barStyle="light-content" />

        {/* HINTERGRUND */}
        <View style={styles.bgContainer}>
          <Image
            source={require('../../../assets/images/showDailyMissionsBackground.png')}
            style={styles.bgImage}
            resizeMode="cover"
          />
        </View>

        {/* HEADER */}
        <View style={styles.headerWrapper}>
          <View style={{ alignSelf: 'flex-start', marginBottom: 10 }}>
            <Text style={styles.brandText}>PlantUp</Text>
          </View>

          <MaskedView
            style={{ height: 100, width: '100%' }}
            maskElement={<Text style={styles.headerTitle}>Quests and{'\n'}Daily Rewards!</Text>}>
            <LinearGradient
              colors={['#FFFFFF', '#E0F7FA']}
              start={{ x: 0.2, y: 0 }}
              end={{ x: 0.8, y: 1 }}
              style={{ flex: 1 }}
            />
          </MaskedView>

          <View style={styles.comingSoonBar}>
            <Text style={styles.comingSoonText}>Daily Streak • Coming Soon</Text>
            <LinearGradient
              colors={['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.25)', 'rgba(255,255,255,0.1)']}
              style={StyleSheet.absoluteFillObject}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            />
          </View>
        </View>

        {/* DRAGGABLE BOTTOM SHEET */}
        <DraggableBottomSheet
          initialHeight={0.55}
          maxHeight={0.75}
        >
          <View style={{ flex: 1, paddingHorizontal: 20 }}>
            
            {loading && !refreshing ? (
              <ActivityIndicator size="large" color={theme.colors.accent} style={{ marginTop: 20 }} />
            ) : (
              // --- SECTION LIST START ---
              <SectionList
                sections={sections}
                keyExtractor={(item) => item.id.toString()}
                
                // --- PERFORMANCE PROPS (Optimiert für Android) ---
                removeClippedSubviews={true} // Wichtig! Versteckt unsichtbares.
                initialNumToRender={6}       // Rendert genug für den ersten Blick.
                maxToRenderPerBatch={4}      // Lädt moderat nach beim Scrollen.
                windowSize={7}               // Behält ein bisschen was im Speicher (weniger Ruckeln beim Zurückscrollen).
                
                // HILFT DER LISTE DIE GRÖSSE ZU SCHÄTZEN (Wichtig gegen Ruckeln!)
                // Wir nehmen an: Header ~40px, Item ~110px
                // (Wenn Items unterschiedlich hoch sind, diesen Block löschen, aber mit fixen Höhen ist es schneller)
                // getItemLayout={(data, index) => (
                //   {length: 110, offset: 110 * index, index}
                // )}
                
                contentContainerStyle={{ paddingBottom: height * 0.5 }}
                showsVerticalScrollIndicator={false}
                
                renderSectionHeader={({ section: { title } }) => (
                  <View style={styles.sectionHeaderContainer}>
                    <Text style={styles.sectionTitle}>{title}</Text>
                  </View>
                )}
                
                renderItem={({ item }) => {
                  // Leere Listen
                  if (item.type === 'empty') {
                     const text = item.id === 'empty-daily' 
                        ? "You've completed all daily quests!" 
                        : "No weekly quests active.";
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
                    }}
                    tintColor={theme.colors.accent}
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
}: {
  quest: UserQuest;
  onClaim: () => void;
  isLast: boolean;
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

  return (
    <View style={[styles.card, isClaimed && { opacity: 0.6 }]}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <View style={{ flex: 1, paddingRight: 10 }}>
          <Text style={styles.questTitle} numberOfLines={1}>{quest.Quests.title}</Text>
          <Text style={styles.questDescription} numberOfLines={2}>{safeDescription}</Text>
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
            <View style={styles.xpContainer}>
              <FontAwesome6 name="star" size={12} color="#329D9C" style={{ marginRight: 4 }} solid />
              <Text style={styles.xpText}>{quest.Quests.xp_reward} XP</Text>
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
          <Text style={styles.progressTextSubtle}>{progress}/{target}</Text>
        </View>
      </View>
    </View>
  );
}

// --- STYLES ---
const styles = StyleSheet.create((theme) => ({
  bgContainer: { position: 'absolute', top: 0, left: 0, width: '100%', height: '70%', justifyContent: 'flex-end', zIndex: -1 },
  bgImage: { width: '100%', height: '100%' },
  headerWrapper: { position: 'absolute', top: '8%', left: 0, right: 0, paddingHorizontal: 20, alignItems: 'center' },
  brandText: { color: 'rgba(255,255,255,0.9)', fontWeight: '600', fontSize: 18 },
  headerTitle: { fontSize: 40, fontWeight: '900', color: 'white', lineHeight: 44 },
  comingSoonBar: { marginTop: 30, height: 60, width: '100%', borderRadius: 18, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)' },
  comingSoonText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  
  sectionHeaderContainer: {marginBottom: 10 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#000', textAlign: 'center' },
  itemWrapperMint: { backgroundColor: '#E0F7FA', paddingHorizontal: 15, paddingVertical: 8, marginHorizontal: 0, borderRadius: 12, marginBottom: 10 },
  mintQuestContainerEmpty: { backgroundColor: '#E0F7FA', borderRadius: 20, padding: 15, borderWidth: 2, borderColor: '#B2EBF2' },
  emptyText: { textAlign: 'center', color: '#888', fontStyle: 'italic', padding: 10 },
  
  card: { backgroundColor: '#fff', borderRadius: 15, padding: 15, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  questTitle: { fontSize: 15, fontWeight: '600', color: '#333' },
  questDescription: { fontSize: 12, color: '#777', marginTop: 2, lineHeight: 16 },
  xpContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#E0F2F1', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20, borderWidth: 1, borderColor: '#B2DFDB' },
  xpText: { fontSize: 12, fontWeight: '700', color: '#00796B' },
  claimButtonStyled: { width: 70, height: 32, borderRadius: 16, overflow: 'hidden', justifyContent: 'center', alignItems: 'center', shadowColor: '#329D9C', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 3, elevation: 3 },
  claimButtonText: { color: 'white', fontWeight: '800', fontSize: 11, letterSpacing: 0.5 },
  progressBarBg: { height: 10, backgroundColor: '#E0E0E0', borderRadius: 5, overflow: 'hidden', marginTop: 5 },
  progressBarFill: { height: '100%', borderRadius: 5 },
  progressTextSubtle: { fontSize: 11, color: '#888', fontWeight: '600' },
}));