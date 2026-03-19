import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { View, Text, Image, TouchableOpacity } from 'react-native';
import { useNavigation, useFocusEffect, useRoute } from '@react-navigation/native';
import { useUnistyles, StyleSheet } from 'react-native-unistyles';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db } from '../../../utils/supabase';
import { useUserStore } from '~/stores/UserStore';
import { useTutorialStore } from '~/stores/TutorialStore';
import { GestureHandlerRootView, ScrollView } from 'react-native-gesture-handler';
import DraggableBottomSheet from '~/components/DraggableBottomSheet';
import { FontAwesome6 } from '@expo/vector-icons';
import { ErrorHandlerService } from '~/core/error/services/ErrorHandlerService';

// --- COMPONENTS ---
import Header from '~/features/plantstats/components/Header';
import LoadingScreen from '~/features/plantstats/components/LoadingScreen';
import TrendChartCard from '~/features/plantstats/components/TrendChartCard';
import OverviewCard from '~/features/plantstats/components/OverviewCard';
import HistoryCard from '~/features/plantstats/components/HistoryCard';
import MiniTrendCard from '~/features/plantstats/components/MiniTrend';
import SnapshotBoxes from '~/features/plantstats/components/SnapShotBoxes';
import { vw, vh } from '~/features/plantlist/styles/plantStyles'; // Import existing responsive utils

// --- API HELPERS ---
import { calculateAverages, lastXdays } from '~/features/plantstats/api/history';
import { calculateHealth } from '~/features/plantstats/api/healthScore';
import { calculateHealthFull } from '~/features/plantstats/api/healthScore';
import type { HealthResult } from '~/features/mentor';
import { getTodayQuestKey, trackQuestAction } from '~/features/quests/questProgress';

// --- CONSTANTS ---
const CACHE_KEY_PREFIX = 'plant_history_';
const TIME_RANGES = {
  'Last 1 Hour': { limit: 50, hours: 1 },
  'Last 24 Hours': { limit: 200, hours: 24 },
  'Last Week': { limit: 500, hours: 168 },
  'All Time': { limit: 1000, hours: null },
};

type TimeRangeKey = keyof typeof TIME_RANGES;

interface PlantController {
  id: string;
  temperature: number | null;
  humidity: number | null;
  soil_moisture: number | null;
  light: number | null;
  electrical_conductivity: number | null;
  created_at: string;
}

// ----------------------------------------------------------------------------
// 🟢 OPTIMIZED DATA FETCHING FUNCTIONS
// ----------------------------------------------------------------------------

async function getCache(key: string) {
  try {
    const data = await AsyncStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  } catch (e) {
    return null;
  }
}

async function setCache(key: string, value: any) {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    ErrorHandlerService.handle(e, { showUI: false });
  }
}

// Fetch ONLY the latest row (very fast)
async function fetchLatestController(plantId: string): Promise<PlantController | null> {
  const { data, error } = await db.micro
    .from('Controllers')
    .select('id, temperature, humidity, soil_moisture, light, electrical_conductivity, created_at')
    .eq('plant_id', plantId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle(); // maybeSingle is safer than single if no data exists

  if (error) ErrorHandlerService.handle(error, { showUI: false });
  return data as PlantController;
}

const RANGE_LABELS: Record<TimeRangeKey, string> = {
  'Last 1 Hour': '1H',
  'Last 24 Hours': '24H',
  'Last Week': '7D',
  'All Time': 'All',
};

const TimeRangePicker = ({
  selectedRange,
  setSelectedRange,
}: {
  selectedRange: TimeRangeKey;
  setSelectedRange: (key: TimeRangeKey) => void;
}) => {
  const { theme } = useUnistyles();
  const keys = Object.keys(TIME_RANGES) as TimeRangeKey[];

  return (
    <View
      style={{
        flexDirection: 'row',
        backgroundColor: theme.colors.surface,
        borderRadius: vw * 3,
        padding: vw * 0.8,
        marginVertical: vh * 1.5,
        alignSelf: 'center',
      }}>
      {keys.map((key) => {
        const isSelected = selectedRange === key;
        return (
          <TouchableOpacity
            key={key}
            onPress={() => setSelectedRange(key)}
            style={{
              flex: 1,
              paddingVertical: vh * 1,
              paddingHorizontal: vw * 3,
              borderRadius: vw * 2.5,
              backgroundColor: isSelected ? theme.colors.primary : 'transparent',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <Text
              style={{
                color: isSelected ? '#fff' : theme.colors.secondary,
                fontSize: vw * 3.5,
                fontWeight: isSelected ? '700' : '500',
                fontFamily: theme.fonts.regular,
              }}>
              {RANGE_LABELS[key]}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

export default function ShowPlantStats() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { theme } = useUnistyles();
  const insets = useSafeAreaInsets();

  const { plantId: initialPlantId } = route.params ?? {};

  // State
  const [userId, setUserId] = useState<string | null>(null);
  const [name, setName] = useState('--');
  const [selectedPlant, setSelectedPlant] = useState<any>(null);

  // Data State
  const [latest, setLatest] = useState<PlantController | null>(null);
  const [historyData, setHistoryData] = useState<PlantController[]>([]);

  // UI State
  const [loading, setLoading] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(false); // New state for background loading
  const [isDropdownVisible, setDropdownVisible] = useState(false);
  const [selectedOptionLabel, setSelectedOptionLabel] = useState<
    'Temperature' | 'Humidity' | 'Soil Moisture' | 'Light' | 'EC'
  >('Temperature');
  const [timeRange, setTimeRange] = useState<TimeRangeKey>('Last 1 Hour');
  const [barColor, setBarColor] = useState('#fdae11');
  const [debugHealth, setDebugHealth] = useState<number | null>(null);

  const profile = useUserStore((state) => state.profile);
  const startTutorial = useTutorialStore((state) => state.startTutorial);

  useEffect(() => {
    if (profile && profile.tutorial_progress) {
      setTimeout(() => {
        if (!profile.tutorial_progress['plant_stats_tutorial']) {
          startTutorial('plant_stats_tutorial');
        }
      }, 700);
    }
  }, [profile, startTutorial]);

  const isDataFreshRef = useRef(false);

  // 🟢 1. MEMOIZATION: Calculate Chart & MiniTrend data only when history changes
  // This prevents iterating over 1000 items 5 times on every render
  const { chartData, maxY, sensorTrends } = useMemo(() => {
    if (!historyData.length) {
      return { chartData: [], maxY: 0, sensorTrends: { soil: [], temp: [], light: [], ec: [] } };
    }

    // Prepare MiniTrend Data (Single iteration)
    const sensorTrends = {
      soil: [] as (number | null)[],
      temp: [] as (number | null)[],
      light: [] as (number | null)[],
      ec: [] as (number | null)[],
    };

    historyData.forEach((p) => {
      sensorTrends.soil.push(p.soil_moisture);
      sensorTrends.temp.push(p.temperature);
      sensorTrends.light.push(p.light);
      sensorTrends.ec.push(p.electrical_conductivity);
    });

    // Prepare Chart Data
    // Note: Reversing array can be expensive, do it only if necessary for the chart library
    const sortedHistory = [...historyData].reverse();

    const cData = sortedHistory.map((p) => {
      const label = new Date(p.created_at).toISOString().slice(11, 16);
      let value = 0;
      switch (selectedOptionLabel) {
        case 'Temperature':
          value = p.temperature ?? 0;
          break;
        case 'Humidity':
          value = p.humidity ?? 0;
          break;
        case 'Soil Moisture':
          value = p.soil_moisture ?? 0;
          break;
        case 'Light':
          value = p.light ?? 0;
          break;
        case 'EC':
          value = p.electrical_conductivity ?? 0;
          break;
      }
      return { value, label, frontColor: barColor };
    });

    const mY = cData.length ? Math.max(...cData.map((d) => d.value)) : 0;

    return { chartData: cData, maxY: mY, sensorTrends };
  }, [historyData, selectedOptionLabel, barColor]);

  const trackPlantStatsQuestViews = useCallback(async (plantId: string, range: TimeRangeKey) => {
    const today = getTodayQuestKey();

    await trackQuestAction({
      actionCode: 'CHECK_STATUS',
      eventKey: `${today}:${plantId}:status`,
      plantId,
    });

    const currentHour = new Date().getHours();
    if (currentHour >= 20) {
      await trackQuestAction({
        actionCode: 'CHECK_NIGHT_STATS',
        eventKey: `${today}:${plantId}:night`,
        plantId,
      });
    }

    if (range === 'Last Week') {
      await trackQuestAction({
        actionCode: 'CHECK_WEEKLY_CHART',
        eventKey: `${today}:${plantId}:weekly-chart`,
        plantId,
      });
    }
  }, []);

  // 🟢 4. CORE DATA LOGIC
  const fetchPlantData = useCallback(async (plantId: string, range: TimeRangeKey) => {
    setLoadingHistory(true);

    try {
      const cacheKey = CACHE_KEY_PREFIX + plantId;

      // Step A: Get current server latest (Fast - 1 row)
      const serverLatest = await fetchLatestController(plantId);

      if (serverLatest) {
        setLatest(serverLatest);

        // Step B: Always fetch with proper time filtering
        const { limit, hours } = TIME_RANGES[range];

        let query = db.micro
          .from('Controllers')
          .select(
            'id, temperature, humidity, soil_moisture, light, electrical_conductivity, created_at'
          )
          .eq('plant_id', plantId);

        // Apply time-based filter BEFORE ordering and limiting
        if (hours !== null) {
          const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
          query = query.gte('created_at', cutoff);
        }

        query = query.order('created_at', { ascending: false }).limit(limit);

        const { data: newData } = await query;

        if (newData && newData.length > 0) {
          setHistoryData(newData as PlantController[]);
          isDataFreshRef.current = true;

          // Cache the result for quick loading next time
          if (limit >= 50) {
            await setCache(cacheKey, { timestamp: serverLatest.created_at, data: newData, range });
          }
        } else {
          setHistoryData([]);
          isDataFreshRef.current = true;
        }
      }
    } catch (err) {
      ErrorHandlerService.handle(err, { showUI: false });
    } finally {
      setLoading(false);
      setLoadingHistory(false);
    }
  }, []);

  // 🟢 5. INITIAL MOUNT (Parallel Execution)
  const initializeScreen = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Get Auth and Plants first
      const { data: auth } = await db.public.auth.getUser();
      const user = auth?.user;
      if (!user) throw new Error('No user');
      setUserId(user.id);

      const { data: plants } = await db.social
        .from('Plants')
        .select('id, nickname')
        .eq('user_id', user.id);

      const targetPlant = plants?.find((p) => p.id === initialPlantId) || plants?.[0];

      if (targetPlant) {
        setSelectedPlant(targetPlant);
        setName(targetPlant.nickname);

        // 2. PARALLEL EXECUTION: Fire all tasks at once
        await Promise.allSettled([
          fetchPlantData(targetPlant.id, timeRange),
          trackPlantStatsQuestViews(targetPlant.id, timeRange),
        ]);
      } else {
        setLoading(false);
      }
    } catch (e) {
      ErrorHandlerService.handle(e, { showUI: false });
      setLoading(false);
    }
  }, [initialPlantId, fetchPlantData, timeRange, trackPlantStatsQuestViews]);

  useEffect(() => {
    initializeScreen();
  }, [initializeScreen]);

  // Handle Time Range Change specifically
  useEffect(() => {
    if (selectedPlant?.id) {
      fetchPlantData(selectedPlant.id, timeRange);
      trackPlantStatsQuestViews(selectedPlant.id, timeRange);
    }
  }, [fetchPlantData, selectedPlant?.id, timeRange, trackPlantStatsQuestViews]);

  const health = latest ? calculateHealth(latest) : null;

  // Full HealthResult for the Mentor card (includes deviations, trends)
  const fullHealth: HealthResult | null = latest
    ? calculateHealthFull(latest as unknown as Record<string, number | null>, undefined, {
        history: historyData as unknown as Array<Record<string, any>>,
      })
    : null;

  if (loading) return <LoadingScreen />;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={styles.container}>
        {/* Header Background */}
        <View style={styles.headerBg}>
          <Image
            source={require('../../../../assets/images/statsBackground.png')}
            style={styles.headerImage}
            resizeMode="cover"
          />
          <View style={[styles.headerContent, { paddingTop: insets.top + vh * 2 }]}>
            <Header navigation={navigation} />
            <View style={styles.titleContainer}>
              <Text style={[styles.headerTitle, { color: 'white' }]}>How's</Text>
              <Text style={[styles.headerTitle, { color: 'white' }]}>{name}?</Text>
            </View>
          </View>
        </View>

        {/* Draggable Bottom Sheet */}
        <DraggableBottomSheet initialHeight={0.7} maxHeight={0.9}>
          <ScrollView
            overScrollMode="never"
            contentContainerStyle={{
              paddingBottom: vh * 25,
              paddingHorizontal: vw * 5,
              paddingTop: vh * 1.5,
            }}
            showsVerticalScrollIndicator={false}
            style={[styles.sheet, { backgroundColor: 'transparent' }]}>
            {/* Debug Controls */}
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'center',
                marginBottom: 10,
                flexWrap: 'wrap',
                gap: 5,
              }}>
              {[10, 20, 50, 100].map((val) => (
                <TouchableOpacity
                  key={val}
                  onPress={() => setDebugHealth(val)}
                  style={{
                    backgroundColor: theme.colors.surface,
                    padding: 5,
                    borderRadius: 5,
                    borderWidth: 1,
                    borderColor: theme.colors.greyedOut,
                  }}>
                  <Text style={{ fontSize: 10, color: theme.colors.text }}>{val}%</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                onPress={() => setDebugHealth(null)}
                style={{ backgroundColor: '#ef4444', padding: 5, borderRadius: 5 }}>
                <Text style={{ fontSize: 10, color: 'white' }}>Reset</Text>
              </TouchableOpacity>
            </View>

            <OverviewCard latest={latest} health={debugHealth !== null ? debugHealth : health} />

            <SnapshotBoxes latest={latest} />

            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'flex-end',
                paddingTop: vh * 0.2,
                paddingRight: vw * 4,
              }}>
              <TouchableOpacity
                onPress={() => startTutorial('sensor_info_tutorial')}
                style={{ flexDirection: 'row', alignItems: 'center' }}>
                <FontAwesome6 name="circle-info" size={12} color={theme.colors.greyedOut} />
                <Text style={{ fontSize: 12, marginLeft: 5, color: theme.colors.greyedOut }}>
                  What do these mean?
                </Text>
              </TouchableOpacity>
            </View>

            {/* Daily Mentor Trigger Button */}
            {selectedPlant?.id && (
              <TouchableOpacity
                onPress={() =>
                  navigation.navigate('DailyMentor', {
                    plantId: selectedPlant.id,
                    health: fullHealth,
                  })
                }
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: theme.colors.primary,
                  paddingVertical: 12,
                  borderRadius: 12,
                  marginTop: 16,
                  marginHorizontal: 4,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.1,
                  shadowRadius: 4,
                  elevation: 2,
                }}>
                <FontAwesome6 name={'wand-magic-sparkles'} size={16} color="white" />
                <Text
                  style={{
                    color: 'white',
                    fontFamily: theme.fonts.header,
                    fontSize: 14,
                    marginLeft: 8,
                  }}>
                  View Daily Mentor Advice
                </Text>
              </TouchableOpacity>
            )}

            {/* Status Indicators */}
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'center',
                gap: vw * 2.5,
                marginTop: vh * 1.5,
              }}>
              <Text
                style={[
                  styles.statusText,
                  { color: isDataFreshRef.current ? theme.colors.primary : theme.colors.secondary },
                ]}>
                {isDataFreshRef.current ? 'Live Data' : 'Cached Data'}
              </Text>
              {loadingHistory && (
                <Text style={[styles.statusText, { color: theme.colors.greyedOut }]}>
                  Updating...
                </Text>
              )}
            </View>

            <TimeRangePicker selectedRange={timeRange} setSelectedRange={setTimeRange} />

            <TrendChartCard
              barData={chartData}
              maxY={maxY}
              selectedOptionLabel={selectedOptionLabel}
              setSelectedOptionLabel={setSelectedOptionLabel}
              barColor={barColor}
              setBarColor={setBarColor}
              isDropdownVisible={isDropdownVisible}
              setDropdownVisible={setDropdownVisible}
            />

            {/* 🟢 Optimised MiniTrends using memoized data */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <MiniTrendCard title="Soil Moisture" data={sensorTrends.soil} />
              <MiniTrendCard title="Temperature" data={sensorTrends.temp} />
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <MiniTrendCard title="Light" data={sensorTrends.light} />
              <MiniTrendCard title="EC" data={sensorTrends.ec} />
            </View>

            {latest && (
              <Text style={[styles.lastUpdated, { color: theme.colors.greyedOut }]}>
                Last update:{' '}
                {new Date(latest.created_at).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
            )}

            <HistoryCard
              historyData={historyData}
              calculateAverages={calculateAverages}
              lastXdays={lastXdays}
            />
          </ScrollView>
        </DraggableBottomSheet>
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create((theme) => ({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  headerBg: {
    height: '55%',
    width: '100%',
    position: 'absolute',
    top: 0,
  },
  headerImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  headerContent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    padding: vw * 5, // Responsive padding
  },
  titleContainer: {
    marginTop: vh * 4, // Increased top margin
    marginBottom: vh * 2, // Added bottom spacing
    paddingHorizontal: vw * 2,
  },
  headerTitle: {
    fontSize: vw * 12,
    fontFamily: theme.fonts.header,
    fontWeight: 'bold',
    lineHeight: vw * 12,
  },
  sheet: {
    borderTopLeftRadius: vw * 7, // Responsive radius
    borderTopRightRadius: vw * 7,
    marginTop: vh * 2.5,
  },
  statusText: {
    fontSize: vw * 3.2,
    textAlign: 'center',
    fontFamily: theme.fonts.regular,
  },
  lastUpdated: {
    marginTop: vh * 1,
    fontSize: vw * 3,
    textAlign: 'center',
    fontFamily: theme.fonts.regular,
  },
}));
