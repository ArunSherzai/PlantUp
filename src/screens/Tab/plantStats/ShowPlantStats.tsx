import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { View, Text, Image, TouchableOpacity } from 'react-native';
import { useNavigation, useFocusEffect, useRoute } from '@react-navigation/native';
import { useUnistyles, StyleSheet } from 'react-native-unistyles';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db } from '../../../utils/supabase';
import { GestureHandlerRootView, ScrollView } from 'react-native-gesture-handler';
import DraggableBottomSheet from '~/components/DraggableBottomSheet';

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

// --- CONSTANTS ---
const CACHE_KEY_PREFIX = 'plant_history_';
const TIME_RANGES = {
  'Last 1 Hour (5 Recs)': 5,
  'Last 24 Hours (50 Recs)': 50,
  'Last Week (300 Recs)': 300,
  'All Time (Max 1000 Recs)': 1000,
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
    console.error('Cache save failed', e);
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

  if (error) console.error('Error fetching latest:', error);
  return data as PlantController;
}

const TimeRangePicker = ({ selectedRange, setSelectedRange }: any) => {
  const { theme } = useUnistyles();
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginVertical: vh * 1.5 }}>
      {Object.keys(TIME_RANGES).map((key) => (
        <TouchableOpacity
          key={key}
          onPress={() => setSelectedRange(key as TimeRangeKey)}
          style={{
            padding: vw * 2, // Responsive padding
            borderRadius: vw * 1.5,
            backgroundColor: selectedRange === key ? theme.colors.primary : theme.colors.background,
            borderWidth: selectedRange === key ? 1 : 0,
            borderColor: selectedRange === key ? theme.colors.primary : 'transparent',
          }}>
          <Text
            style={{
              color: selectedRange === key ? theme.colors.text : theme.colors.secondary,
              fontSize: vw * 3, // Responsive font
            }}>
            {key.split('(')[0].trim()}
          </Text>
        </TouchableOpacity>
      ))}
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
  const [temperature, setTemperature] = useState('—'); // Weather
  const [humidity, setHumidity] = useState('—'); // Weather
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
  const [timeRange, setTimeRange] = useState<TimeRangeKey>('Last 1 Hour (5 Recs)');
  const [barColor, setBarColor] = useState('#fdae11');
  const [debugHealth, setDebugHealth] = useState<number | null>(null);

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

  // 🟢 2. QUEST CHECKER: Fire and forget (doesn't block UI)
  const runQuestCheck = async (uid: string) => {
    try {
      const { data: quests } = await db.gamification
        .from('User_quests')
        .select(`id, progress, status, quest:Quests (action_code, target_count)`)
        .eq('user_id', uid)
        .eq('status', 'active'); // ✅ only active quests

      if (!quests) return;

      const updates = quests
        .filter((q: any) => {
          const target = q.quest?.target_count ?? 0;
          const current = q.progress ?? 0;

          return (
            q.quest?.action_code === 'CHECK_STATUS' && current < target // ✅ only update if not already reached
          );
        })
        .map((uq: any) => {
          const newProgress = (uq.progress ?? 0) + 1;
          const target = uq.quest?.target_count ?? 0;

          return db.gamification
            .from('User_quests')
            .update({
              progress: newProgress,
              status: newProgress >= target ? 'completed' : 'active',
              completed_at: newProgress >= target ? new Date().toISOString() : null,
            })
            .eq('id', uq.id);
        });

      await Promise.all(updates);
    } catch (err) {
      console.error('runQuestCheck error:', err);
    }
  };

  // 🟢 3. WEATHER FETCHER: Separated from critical path
  const fetchWeather = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;

      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }); // Balanced is faster
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${loc.coords.latitude}&longitude=${loc.coords.longitude}&current_weather=true&hourly=relative_humidity_2m`;

      const res = await fetch(url);
      const data = await res.json();

      if (data?.current_weather?.temperature != null)
        setTemperature(`${data.current_weather.temperature.toFixed(1)}°`);
      if (data?.hourly?.relative_humidity_2m?.[0] != null)
        setHumidity(`${data.hourly.relative_humidity_2m[0]}%`);
    } catch (e) {
      console.log('Weather fetch silent fail');
    }
  };

  // 🟢 4. CORE DATA LOGIC
  const fetchPlantData = useCallback(async (plantId: string, range: TimeRangeKey) => {
    setLoadingHistory(true);

    try {
      // Step A: Load Cache immediately to show something
      const cacheKey = CACHE_KEY_PREFIX + plantId;
      const cached = await getCache(cacheKey);

      let latestTimestamp = null;

      if (cached && cached.data) {
        setHistoryData(cached.data);
        // If we don't have a "Latest" yet, use the cache's first item
        setLatest((prev) => prev || cached.data[0]);
        latestTimestamp = cached.timestamp;
      }

      // Step B: Get current server latest (Fast - 1 row)
      const serverLatest = await fetchLatestController(plantId);

      if (serverLatest) {
        setLatest(serverLatest);

        // Determine if we need to fetch full history
        // 1. If no cache
        // 2. If server data is newer than cache
        // 3. If user changed time range (we might need more data than what is cached)
        const isServerNewer =
          !latestTimestamp || new Date(serverLatest.created_at) > new Date(latestTimestamp);

        if (isServerNewer || range !== 'Last 1 Hour (5 Recs)') {
          const limit = TIME_RANGES[range];
          const { data: newData } = await db.micro
            .from('Controllers')
            .select(
              'id, temperature, humidity, soil_moisture, light, electrical_conductivity, created_at'
            )
            .eq('plant_id', plantId)
            .order('created_at', { ascending: false })
            .limit(limit);

          if (newData && newData.length > 0) {
            setHistoryData(newData as PlantController[]);
            isDataFreshRef.current = true;

            // Only cache large datasets to save IO operations
            if (limit >= 50) {
              await setCache(cacheKey, { timestamp: serverLatest.created_at, data: newData });
            }
          }
        } else {
          isDataFreshRef.current = false;
        }
      }
    } catch (err) {
      console.error('Data fetch error:', err);
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

        // 2. PARALLEL EXECUTION: Fire all 3 tasks at once
        await Promise.allSettled([
          fetchPlantData(targetPlant.id, timeRange), // Main Data
          fetchWeather(), // External API (don't await strictly)
          runQuestCheck(user.id), // Background Task
        ]);
      } else {
        setLoading(false);
      }
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  }, [initialPlantId, fetchPlantData]); // Removed timeRange dependency to prevent loop

  useFocusEffect(
    useCallback(() => {
      initializeScreen();
    }, [initializeScreen])
  );

  // Handle Time Range Change specifically
  useEffect(() => {
    if (selectedPlant?.id && !loading) {
      fetchPlantData(selectedPlant.id, timeRange);
    }
  }, [timeRange]);

  const health = latest ? calculateHealth(latest) : null;

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
        <DraggableBottomSheet initialHeight={0.70} maxHeight={0.9}>
          <ScrollView
            overScrollMode="never"
            contentContainerStyle={{ paddingBottom: vh * 25, paddingHorizontal: vw * 5, paddingTop: vh * 1.5 }}
            showsVerticalScrollIndicator={false}
            style={[styles.sheet, { backgroundColor: "transparent" }]}>
            
            {/* Debug Controls */}
            <View style={{ flexDirection: 'row', justifyContent: 'center', marginBottom: 10, flexWrap: 'wrap', gap: 5 }}>
              {[10, 20, 50, 100].map(val => (
                <TouchableOpacity 
                  key={val} 
                  onPress={() => setDebugHealth(val)}
                  style={{ backgroundColor: theme.colors.surface, padding: 5, borderRadius: 5, borderWidth: 1, borderColor: theme.colors.greyedOut }}
                >
                  <Text style={{ fontSize: 10, color: theme.colors.text }}>{val}%</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity 
                onPress={() => setDebugHealth(null)}
                style={{ backgroundColor: '#ef4444', padding: 5, borderRadius: 5 }}
              >
                <Text style={{ fontSize: 10, color: 'white' }}>Reset</Text>
              </TouchableOpacity>
            </View>

            <OverviewCard latest={latest} health={debugHealth !== null ? debugHealth : health} />
            <SnapshotBoxes latest={latest} />

            {/* Status Indicators */}
            <View style={{ flexDirection: 'row', justifyContent: 'center', gap: vw * 2.5, marginTop: vh * 1.5 }}>
              <Text
                style={[
                  styles.statusText,
                  { color: isDataFreshRef.current ? theme.colors.primary : theme.colors.secondary },
                ]}>
                {isDataFreshRef.current ? 'Live Data' : 'Cached Data'}
              </Text>
              {loadingHistory && (
                <Text style={[styles.statusText, { color: theme.colors.greyedOut }]}>Updating...</Text>
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
