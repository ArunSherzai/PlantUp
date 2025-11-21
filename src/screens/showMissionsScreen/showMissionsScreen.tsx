import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  StatusBar,
} from 'react-native';
import { useUnistyles, StyleSheet } from 'react-native-unistyles';
import { LinearGradient } from 'expo-linear-gradient';
import MaskedView from '@react-native-masked-view/masked-view';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import { db } from '../../utils/supabase';

const { height, width } = Dimensions.get('window');

// --- TYPES ---
type QuestData = {
  id: number;
  title: string;
  description: string; // Muss im Type definiert sein
  xp_reward: number;
  target_count: number;
  type: 'daily' | 'weekly' | 'conditional' | 'milestone';
};

type UserQuest = {
  id: number;
  status: 'active' | 'completed' | 'claimed';
  progress: number;
  plant_id: number | null;
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
      const {
        data: { user },
      } = await db.public.auth.getUser();
      if (!user) return;

      // Wir fragen jetzt die VIEW ab, nicht mehr die Tabelle!
      const { data, error } = await db.gamification
        .from('active_quests_with_plants') // <--- Der Name unserer View
        .select('*') // <--- Einfach alles holen!
        .eq('user_id', user.id)
        .order('status', { ascending: true });

      if (error) throw error;

      // Wir müssen die Datenstruktur leicht anpassen für dein altes State-Format
      // Hier mappen wir es schnell passend für deinen existierenden Code:
      const formattedData = data.map((item) => ({
        id: item.id,
        status: item.status,
        progress: item.progress,
        plant_id: item.plant_id,
        Plants: item.plant_name ? { nickname: item.plant_name } : null,
        Quests: {
          id: item.id, // Achtung: hier müsste man evtl quest_id in View holen
          title: item.title,
          description: item.description,
          xp_reward: item.xp_reward,
          target_count: item.target_count,
          type: item.type,
        },
      }));

      setQuests(formattedData as any);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchQuests();
  }, [fetchQuests]);

  // --- CLAIM LOGIC ---
  const handleClaim = async (userQuestId: number) => {
    try {
      setLoading(true);
      // 1. Kurze künstliche Wartezeit (für das Feeling)
      await new Promise((resolve) => setTimeout(resolve, 500));
      // 2. WICHTIG: Wir updaten den State LOKAL
      // Wir gehen durch die Liste der Quests, suchen die richtige ID
      // und ändern ihren Status manuell auf 'claimed'.
      setQuests((currentQuests) =>
        currentQuests.map((q) => {
          if (q.id === userQuestId) {
            // Kopie der Quest zurückgeben mit neuem Status
            return { ...q, status: 'claimed' };
          }
          return q;
        })
      );
    } catch (e) {
      console.error(e);
      alert('Something went wrong while claiming.');
    } finally {
      setLoading(false);
    }
  };

  const dailyQuests = quests.filter(
    (q) => q.Quests.type === 'daily' || q.Quests.type === 'conditional'
  );
  const weeklyQuests = quests.filter((q) => q.Quests.type === 'weekly');

  return (
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

      {/* BODY */}
      <View style={[styles.taskContainer, { backgroundColor: theme.colors.background }]}>
        <ScrollView
          contentContainerStyle={{ paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                fetchQuests();
              }}
            />
          }>
          {loading && !refreshing ? (
            <ActivityIndicator size="large" color={theme.colors.accent} style={{ marginTop: 20 }} />
          ) : (
            <>
              {/* Daily Quests */}
              <View style={styles.sectionBlock}>
                <Text style={styles.sectionTitle}>Daily Quests</Text>
                <View style={styles.mintQuestContainer}>
                  {dailyQuests.length > 0 ? (
                    dailyQuests.map((q, index) => (
                      <QuestCard
                        key={q.id}
                        quest={q}
                        onClaim={() => handleClaim(q.id)}
                        isLast={index === dailyQuests.length - 1}
                      />
                    ))
                  ) : (
                    <Text style={styles.emptyText}>You've completed all daily quests!</Text>
                  )}
                </View>
              </View>

              {/* Weekly Quests */}
              <View style={styles.sectionBlock}>
                <Text style={styles.sectionTitle}>Weekly Quests</Text>
                <View style={styles.mintQuestContainer}>
                  {weeklyQuests.length > 0 ? (
                    weeklyQuests.map((q, index) => (
                      <QuestCard
                        key={q.id}
                        quest={q}
                        onClaim={() => handleClaim(q.id)}
                        isLast={index === weeklyQuests.length - 1}
                      />
                    ))
                  ) : (
                    <Text style={styles.emptyText}>No weekly quests active.</Text>
                  )}
                </View>
              </View>
            </>
          )}
        </ScrollView>
      </View>
    </View>
  );
}

// --- QUEST CARD (SICHERE VERSION) ---
function QuestCard({
  quest,
  onClaim,
  isLast,
}: {
  quest: UserQuest;
  onClaim: () => void;
  isLast: boolean;
}) {
  const target = quest.Quests.target_count || 1;
  const percentage = Math.min(quest.progress / target, 1) * 100;

  const canClaim = quest.status === 'completed';
  const isClaimed = quest.status === 'claimed';

  const plantName = quest.Plants?.nickname || 'your plant';

  // --- SICHERHEITS-CHECK ---
  // 1. Falls description null/undefined ist (z.B. Netzwerkfehler), nimm leeren String ''
  // 2. Führe dann erst .replace aus
  const rawDesc = quest.Quests.description || '';
  const safeDescription = rawDesc.replace('{{plant_name}}', plantName);

  return (
    <View style={[styles.card, isLast && { marginBottom: 0 }, isClaimed && { opacity: 0.6 }]}>
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

          {/* Hier nutzen wir jetzt den sicheren Text */}
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
            <View style={styles.xpContainer}>
              <FontAwesome6
                name="star"
                size={12}
                color="#329D9C"
                style={{ marginRight: 4 }}
                solid
              />
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
          <Text style={styles.progressTextSubtle}>
            {quest.progress}/{target}
          </Text>
        </View>
      </View>
    </View>
  );
}

// --- STYLES ---
const styles = StyleSheet.create((theme) => ({
  bgContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '70%',
    justifyContent: 'flex-end',
    zIndex: -1,
  },
  bgImage: {
    width: '100%',
    height: '100%',
  },
  headerWrapper: {
    position: 'absolute',
    top: '8%',
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  taskContainer: {
    position: 'absolute',
    top: '45%',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 20,
    paddingTop: 25,
  },
  brandText: {
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '600',
    fontSize: 18,
  },
  headerTitle: {
    fontSize: 40,
    fontWeight: '900',
    color: 'white',
    lineHeight: 44,
  },
  comingSoonBar: {
    marginTop: 30,
    height: 60,
    width: '100%',
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  comingSoonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  sectionBlock: { marginBottom: 25 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 12,
    textAlign: 'center',
  },
  mintQuestContainer: {
    backgroundColor: '#E0F7FA',
    borderRadius: 20,
    padding: 15,
    borderWidth: 2,
    borderColor: '#B2EBF2',
  },
  emptyText: { textAlign: 'center', color: '#888', fontStyle: 'italic', padding: 10 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 15,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  questTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  questDescription: {
    fontSize: 12,
    color: '#777',
    marginTop: 2,
    lineHeight: 16,
  },
  xpContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E0F2F1',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#B2DFDB',
  },
  xpText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#00796B',
  },
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
  claimButtonText: {
    color: 'white',
    fontWeight: '800',
    fontSize: 11,
    letterSpacing: 0.5,
  },
  progressBarBg: {
    height: 10,
    backgroundColor: '#E0E0E0',
    borderRadius: 5,
    overflow: 'hidden',
    marginTop: 5,
  },
  progressBarFill: { height: '100%', borderRadius: 5 },
  progressTextSubtle: {
    fontSize: 11,
    color: '#888',
    fontWeight: '600',
  },
}));
