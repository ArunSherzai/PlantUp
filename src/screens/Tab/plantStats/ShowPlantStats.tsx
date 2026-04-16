import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { View, Text, Image, TouchableOpacity } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useUnistyles, StyleSheet } from '~/lib/unistyles';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { db } from '../../../utils/supabase';
import { useUserStore } from '~/stores/UserStore';
import { useTutorialStore } from '~/stores/TutorialStore';
import { GestureHandlerRootView, ScrollView } from 'react-native-gesture-handler';
import DraggableBottomSheet from '~/components/DraggableBottomSheet';
import { FontAwesome6 } from '@expo/vector-icons';
import { ErrorHandlerService } from '~/core/error/services/ErrorHandlerService';

import Header from '~/features/plantstats/components/Header';
import LoadingScreen from '~/features/plantstats/components/LoadingScreen';
import TrendChartCard from '~/features/plantstats/components/TrendChartCard';
import OverviewCard from '~/features/plantstats/components/OverviewCard';
import HistoryCard from '~/features/plantstats/components/HistoryCard';
import MiniTrendCard from '~/features/plantstats/components/MiniTrend';
import SnapshotBoxes from '~/features/plantstats/components/SnapShotBoxes';
import { vw, vh } from '~/features/plantlist/styles/plantStyles';

import { calculateAverages, lastXdays } from '~/features/plantstats/api/history';
import { calculateHealth, calculateHealthFull } from '~/features/plantstats/api/healthScore';
import type { HealthResult } from '~/features/mentor';
import { getTodayQuestKey, trackQuestAction } from '~/features/quests/questProgress';

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
  time?: string | null;
  created_at: string | null;
}

interface PlantSummary {
  id: string;
  nickname: string | null;
  sensor_id?: string | null;
  plant_data?: PlantDataSummary | PlantDataSummary[];
}

interface PlantDataSummary {
  [key: string]: string | number | null | undefined;
  common_name?: string | null;
  ideal_temperature_min_winter?: number | null;
  ideal_temperature_min_summer?: number | null;
  ideal_temperature_max_winter?: number | null;
  ideal_temperature_max_summer?: number | null;
  ideal_soil_moisture_min_summer?: number | null;
  ideal_soil_moisture_min_winter?: number | null;
  ideal_soil_moisture_max_summer?: number | null;
  ideal_soil_moisture_max_winter?: number | null;
  ideal_humidity_min_winter?: number | null;
  ideal_humidity_min_summer?: number | null;
  ideal_humidity_max_winter?: number | null;
  ideal_humidity_max_summer?: number | null;
  ideal_ec_min_winter?: number | null;
  ideal_ec_min_summer?: number | null;
  ideal_ec_max_winter?: number | null;
  ideal_ec_max_summer?: number | null;
  ideal_light_min_winter?: number | null;
  ideal_light_min_summer?: number | null;
  ideal_light_max_winter?: number | null;
  ideal_light_max_summer?: number | null;
  ideal_soil_type?: string | null;
}

const PLANT_DATA_SELECT = `
  common_name,
  ideal_temperature_min_winter,
  ideal_temperature_min_summer,
  ideal_temperature_max_winter,
  ideal_temperature_max_summer,
  ideal_soil_moisture_min_summer,
  ideal_soil_moisture_min_winter,
  ideal_soil_moisture_max_summer,
  ideal_soil_moisture_max_winter,
  ideal_humidity_min_winter,
  ideal_humidity_min_summer,
  ideal_humidity_max_winter,
  ideal_humidity_max_summer,
  ideal_ec_min_winter,
  ideal_ec_min_summer,
  ideal_ec_max_winter,
  ideal_ec_max_summer,
  ideal_light_min_winter,
  ideal_light_min_summer,
  ideal_light_max_winter,
  ideal_light_max_summer,
  ideal_soil_type
`;

function getPlantData(plant?: PlantSummary | null): PlantDataSummary | null {
  if (!plant?.plant_data) return null;
  return Array.isArray(plant.plant_data) ? (plant.plant_data[0] ?? null) : plant.plant_data;
}

function getCareSeason(date = new Date()): 'summer' | 'winter' {
  const month = date.getMonth();
  return month >= 10 || month <= 1 ? 'winter' : 'summer';
}

function formatIdealRange(min?: number | null, max?: number | null, unit = '', decimals = 0) {
  if (min == null && max == null) return null;

  const formatValue = (value: number) => `${value.toFixed(decimals)}${unit}`;
  if (min != null && max != null) return `${formatValue(min)} - ${formatValue(max)}`;
  if (min != null) return `from ${formatValue(min)}`;
  return `up to ${formatValue(max as number)}`;
}

function getIdealNumber(plantData: PlantDataSummary, key: string) {
  const value = plantData[key];
  return typeof value === 'number' ? value : null;
}

function buildIdealStats(plantData: PlantDataSummary | null, season: 'summer' | 'winter') {
  if (!plantData) return [];

  const seasonalKey = season === 'winter' ? 'winter' : 'summer';
  return [
    {
      label: 'Temperature',
      icon: 'temperature-half',
      value: formatIdealRange(
        getIdealNumber(plantData, `ideal_temperature_min_${seasonalKey}`),
        getIdealNumber(plantData, `ideal_temperature_max_${seasonalKey}`),
        '°C'
      ),
    },
    {
      label: 'Soil moisture',
      icon: 'droplet',
      value: formatIdealRange(
        getIdealNumber(plantData, `ideal_soil_moisture_min_${seasonalKey}`),
        getIdealNumber(plantData, `ideal_soil_moisture_max_${seasonalKey}`),
        '%'
      ),
    },
    {
      label: 'Humidity',
      icon: 'cloud',
      value: formatIdealRange(
        getIdealNumber(plantData, `ideal_humidity_min_${seasonalKey}`),
        getIdealNumber(plantData, `ideal_humidity_max_${seasonalKey}`),
        '%'
      ),
    },
    {
      label: 'EC',
      icon: 'bolt',
      value: formatIdealRange(
        getIdealNumber(plantData, `ideal_ec_min_${seasonalKey}`),
        getIdealNumber(plantData, `ideal_ec_max_${seasonalKey}`),
        ' mS/cm',
        2
      ),
    },
    {
      label: 'Light',
      icon: 'sun',
      value: formatIdealRange(
        getIdealNumber(plantData, `ideal_light_min_${seasonalKey}`),
        getIdealNumber(plantData, `ideal_light_max_${seasonalKey}`),
        ' lux'
      ),
    },
    {
      label: 'Soil type',
      icon: 'seedling',
      value: plantData.ideal_soil_type?.trim() || null,
    },
  ].filter((item) => item.value);
}

async function fetchPlantById(plantId: string): Promise<PlantSummary | null> {
  const { data, error } = await db.social
    .from('Plants')
    .select(`id, nickname, plant_data:Plant_data!Plants_plant_data_id_fkey(${PLANT_DATA_SELECT})`)
    .eq('id', plantId)
    .maybeSingle();

  if (error) {
    ErrorHandlerService.handle(error, { showUI: false });
    return null;
  }

  return (data as PlantSummary | null) ?? null;
}

async function fetchFirstPlantForUser(userId: string): Promise<PlantSummary | null> {
  const { data, error } = await db.social
    .from('Plants')
    .select(`id, nickname, plant_data:Plant_data!Plants_plant_data_id_fkey(${PLANT_DATA_SELECT})`)
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    ErrorHandlerService.handle(error, { showUI: false });
    return null;
  }

  return (data as PlantSummary | null) ?? null;
}

function getControllerTimestamp(controller?: Pick<PlantController, 'time' | 'created_at'> | null) {
  return controller?.time ?? controller?.created_at ?? null;
}

function toTimestampMs(controller?: Pick<PlantController, 'time' | 'created_at'> | null) {
  const timestamp = getControllerTimestamp(controller);
  if (!timestamp) return Number.NEGATIVE_INFINITY;

  const date = new Date(timestamp);
  return Number.isFinite(date.getTime()) ? date.getTime() : Number.NEGATIVE_INFINITY;
}

async function fetchLatestController(deviceId: string): Promise<PlantController | null> {
  const { data, error } = await db.micro
    .from('Controllers')
    .select(
      'id, temperature, humidity, soil_moisture, light, electrical_conductivity, time, created_at'
    )
    .eq('device_id', deviceId)
    .order('time', { ascending: false })
    .limit(10);

  if (error) {
    ErrorHandlerService.handle(error, { showUI: false });
    return null;
  }

  const rows = ((data as PlantController[] | null) ?? []).sort(
    (a, b) => toTimestampMs(b) - toTimestampMs(a)
  );

  return rows[0] ?? null;
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
    <View style={[styles.rangeRow, { backgroundColor: theme.colors.surface }]}>
      {keys.map((key) => {
        const isSelected = selectedRange === key;
        return (
          <TouchableOpacity
            key={key}
            onPress={() => setSelectedRange(key)}
            style={[
              styles.rangeButton,
              { backgroundColor: isSelected ? theme.colors.primary : 'transparent' },
            ]}>
            <Text
              style={[
                styles.rangeButtonText,
                { color: isSelected ? '#fff' : theme.colors.secondary },
              ]}>
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

  const [name, setName] = useState('--');
  const [selectedPlant, setSelectedPlant] = useState<PlantSummary | null>(null);
  const [emptyStateMessage, setEmptyStateMessage] = useState('No sensor data linked yet.');
  const [latest, setLatest] = useState<PlantController | null>(null);
  const [historyData, setHistoryData] = useState<PlantController[]>([]);
  const [allHistoryData, setAllHistoryData] = useState<PlantController[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [selectedOptionLabel, setSelectedOptionLabel] = useState<
    'Temperature' | 'Humidity' | 'Soil Moisture' | 'Light' | 'EC'
  >('Temperature');
  const [timeRange, setTimeRange] = useState<TimeRangeKey>('Last 1 Hour');
  const [barColor, setBarColor] = useState('#fdae11');
  const [isIdealStatsOpen, setIsIdealStatsOpen] = useState(false);

  const profile = useUserStore((state) => state.profile);
  const startTutorial = useTutorialStore((state) => state.startTutorial);
  const isDataFreshRef = useRef(false);

  useEffect(() => {
    if (profile?.tutorial_progress && !profile.tutorial_progress['plant_stats_tutorial']) {
      const timeout = setTimeout(() => startTutorial('plant_stats_tutorial'), 700);
      return () => clearTimeout(timeout);
    }
  }, [profile, startTutorial]);

  const { chartData } = useMemo(() => {
    if (!historyData.length) {
      return { chartData: [] };
    }

    const sortedHistory = [...historyData].reverse();
    const cData = sortedHistory.map((point) => {
      const timestamp = getControllerTimestamp(point);
      const label = timestamp
        ? new Date(timestamp).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
          })
        : '--:--';

      let value = 0;
      switch (selectedOptionLabel) {
        case 'Temperature':
          value = point.temperature ?? 0;
          break;
        case 'Humidity':
          value = point.humidity ?? 0;
          break;
        case 'Soil Moisture':
          value = point.soil_moisture ?? 0;
          break;
        case 'Light':
          value = point.light ?? 0;
          break;
        case 'EC':
          value = point.electrical_conductivity ?? 0;
          break;
      }

      return { value, label, frontColor: barColor };
    });

    return { chartData: cData };
  }, [historyData, selectedOptionLabel, barColor]);

  const summaryTrends = useMemo(() => {
    if (!allHistoryData.length) {
      return { soil: [], temp: [], light: [], ec: [] };
    }

    const sorted = [...allHistoryData].sort((a, b) => toTimestampMs(a) - toTimestampMs(b));
    return {
      soil: sorted.map((point) => point.soil_moisture),
      temp: sorted.map((point) => point.temperature),
      light: sorted.map((point) => point.light),
      ec: sorted.map((point) => point.electrical_conductivity),
    };
  }, [allHistoryData]);

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

  const fetchPlantData = useCallback(async (plant: PlantSummary, range: TimeRangeKey) => {
    setLoadingHistory(true);

    try {
      const { data: deviceData } = await db.micro
        .from('Devices')
        .select('id')
        .eq('plant_id', plant.id)
        .maybeSingle();

      const deviceId = deviceData?.id;

      if (!deviceId) {
        setLatest(null);
        setAllHistoryData([]);
        setHistoryData([]);
        isDataFreshRef.current = false;
        setEmptyStateMessage('This plant is not linked to a Sensor Box yet.');
        return;
      }

      const serverLatest = await fetchLatestController(deviceId);

      if (serverLatest) {
        setLatest(serverLatest);
        setEmptyStateMessage('');

        const { limit, hours } = TIME_RANGES[range];

        const { data, error } = await db.micro
          .from('Controllers')
          .select(
            'id, temperature, humidity, soil_moisture, light, electrical_conductivity, time, created_at'
          )
          .eq('device_id', deviceId)
          .order('time', { ascending: false })
          .limit(TIME_RANGES['All Time'].limit);

        if (error) {
          ErrorHandlerService.handle(error, { showUI: false });
        }

        const baseData = ((data as PlantController[] | null) ?? []).sort(
          (a, b) => toTimestampMs(b) - toTimestampMs(a)
        );

        if (baseData.length > 0) {
          setAllHistoryData(baseData);

          const latestAvailableMs = toTimestampMs(baseData[0]);
          const cutoffMs =
            hours !== null && Number.isFinite(latestAvailableMs)
              ? latestAvailableMs - hours * 60 * 60 * 1000
              : null;
          const filteredData = baseData
            .filter((row) => {
              if (cutoffMs === null) return true;
              return toTimestampMs(row) >= cutoffMs;
            })
            .slice(0, limit);

          setHistoryData(filteredData);
          isDataFreshRef.current = true;
        } else {
          setAllHistoryData([]);
          setHistoryData([]);
          isDataFreshRef.current = true;
        }
      } else {
        setLatest(null);
        setAllHistoryData([]);
        setHistoryData([]);
        isDataFreshRef.current = false;
        setEmptyStateMessage('This plant has a Sensor Box, but no measurements were found yet.');
      }
    } catch (err) {
      ErrorHandlerService.handle(err, { showUI: false });
    } finally {
      setLoading(false);
      setLoadingHistory(false);
    }
  }, []);

  const initializeScreen = useCallback(async () => {
    setLoading(true);

    try {
      const { data: auth } = await db.public.auth.getUser();
      const user = auth?.user;
      if (!user) throw new Error('No user');

      const targetPlant = initialPlantId
        ? await fetchPlantById(initialPlantId)
        : await fetchFirstPlantForUser(user.id);

      if (targetPlant) {
        setSelectedPlant(targetPlant);
        setName(targetPlant.nickname?.trim() || 'your plant');

        await Promise.allSettled([
          fetchPlantData(targetPlant, timeRange),
          trackPlantStatsQuestViews(targetPlant.id, timeRange),
        ]);
      } else if (initialPlantId) {
        const fallbackPlant = { id: initialPlantId, nickname: 'your plant' };
        setSelectedPlant(fallbackPlant);
        setName('your plant');

        await Promise.allSettled([
          fetchPlantData(fallbackPlant, timeRange),
          trackPlantStatsQuestViews(initialPlantId, timeRange),
        ]);
      } else {
        setName('your plant');
        setEmptyStateMessage('No plants were found for this account.');
        setLoading(false);
      }
    } catch (e) {
      ErrorHandlerService.handle(e, { showUI: false });
      setLoading(false);
    }
  }, [fetchPlantData, initialPlantId, timeRange, trackPlantStatsQuestViews]);

  useEffect(() => {
    initializeScreen();
  }, [initializeScreen]);

  useEffect(() => {
    if (selectedPlant) {
      fetchPlantData(selectedPlant, timeRange);
      trackPlantStatsQuestViews(selectedPlant.id, timeRange);
    }
  }, [fetchPlantData, selectedPlant, timeRange, trackPlantStatsQuestViews]);

  useEffect(() => {
    setIsIdealStatsOpen(false);
  }, [selectedPlant?.id]);

  const selectedPlantType = Array.isArray(selectedPlant?.plant_data)
    ? selectedPlant.plant_data[0]?.common_name
    : selectedPlant?.plant_data?.common_name;
  const selectedPlantData = getPlantData(selectedPlant);
  const careSeason = getCareSeason();
  const idealStats = buildIdealStats(selectedPlantData, careSeason);

  const fullHealth: HealthResult | null = latest
    ? calculateHealthFull(latest as unknown as Record<string, number | null>, selectedPlantType, {
        history: historyData as unknown as Array<Record<string, any>>,
      })
    : null;

  const health = fullHealth?.health_percent ?? (latest ? calculateHealth(latest) : null);
  const statusLabel = isDataFreshRef.current ? 'Live data connected' : 'Waiting for live data';
  const lastUpdatedText = getControllerTimestamp(latest)
    ? new Date(getControllerTimestamp(latest) as string).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

  if (loading) return <LoadingScreen />;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={styles.container}>
        <View style={styles.headerBg}>
          <Image
            source={require('../../../../assets/images/statsBackground.png')}
            style={styles.headerImage}
            resizeMode="cover"
          />
          <View style={[styles.headerContent, { paddingTop: insets.top + vh * 2 }]}>
            <Header navigation={navigation} />
            <View style={styles.titleContainer}>
              <Text style={[styles.headerTitle, { color: 'white' }]}>How&apos;s</Text>
              <Text style={[styles.headerTitle, { color: 'white' }]}>{name}?</Text>
            </View>
          </View>
        </View>

        <DraggableBottomSheet initialHeight={0.7} maxHeight={0.9}>
          <ScrollView
            overScrollMode="never"
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            style={[styles.sheet, { backgroundColor: 'transparent' }]}>
            <OverviewCard latest={latest} health={health} />

            {!latest && (
              <View style={[styles.emptyStateCard, { backgroundColor: theme.colors.background }]}>
                <Text style={[styles.emptyStateTitle, { color: theme.colors.text }]}>
                  No live plant data yet
                </Text>
                <Text style={[styles.emptyStateBody, { color: theme.colors.greyedOut }]}>
                  {emptyStateMessage}
                </Text>
              </View>
            )}

            <SnapshotBoxes latest={latest} />

            {selectedPlantData && idealStats.length > 0 && (
              <View style={[styles.idealStatsCard, { backgroundColor: theme.colors.background }]}>
                <TouchableOpacity
                  activeOpacity={0.8}
                  style={styles.idealStatsHeader}
                  onPress={() => setIsIdealStatsOpen((current) => !current)}>
                  <View style={styles.idealStatsTitleWrap}>
                    <Text style={[styles.idealStatsEyebrow, { color: theme.colors.primary }]}>
                      Ideal conditions
                    </Text>
                    <Text style={[styles.idealStatsTitle, { color: theme.colors.text }]}>
                      {selectedPlantData.common_name || 'This plant'}
                    </Text>
                  </View>
                  <View style={styles.idealStatsHeaderActions}>
                    <View
                      style={[styles.seasonPill, { backgroundColor: `${theme.colors.primary}18` }]}>
                      <Text style={[styles.seasonPillText, { color: theme.colors.primary }]}>
                        {careSeason === 'winter' ? 'Winter' : 'Summer'}
                      </Text>
                    </View>
                    <FontAwesome6
                      name={isIdealStatsOpen ? 'chevron-up' : 'chevron-down'}
                      size={14}
                      color={theme.colors.greyedOut}
                    />
                  </View>
                </TouchableOpacity>

                {isIdealStatsOpen && (
                  <View style={styles.idealStatsGrid}>
                    {idealStats.map((item) => (
                      <View
                        key={item.label}
                        style={[
                          styles.idealStatItem,
                          { borderColor: `${theme.colors.greyedOut}22` },
                        ]}>
                        <FontAwesome6
                          name={item.icon as any}
                          size={14}
                          color={theme.colors.primary}
                        />
                        <View style={styles.idealStatTextWrap}>
                          <Text style={[styles.idealStatLabel, { color: theme.colors.greyedOut }]}>
                            {item.label}
                          </Text>
                          <Text style={[styles.idealStatValue, { color: theme.colors.text }]}>
                            {item.value}
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )}

            <View style={styles.infoRow}>
              <TouchableOpacity
                onPress={() => startTutorial('sensor_info_tutorial')}
                style={styles.infoTrigger}>
                <FontAwesome6 name="circle-info" size={12} color={theme.colors.greyedOut} />
                <Text style={[styles.infoText, { color: theme.colors.greyedOut }]}>
                  What do these mean?
                </Text>
              </TouchableOpacity>
            </View>

            {selectedPlant?.id && (
              <TouchableOpacity
                onPress={() =>
                  navigation.navigate('DailyMentor', {
                    plantId: selectedPlant.id,
                    health: fullHealth,
                  })
                }
                style={[styles.mentorCard, { backgroundColor: theme.colors.primary }]}>
                <View style={styles.mentorIconWrap}>
                  <FontAwesome6 name="wand-magic-sparkles" size={16} color="white" />
                </View>
                <View style={styles.mentorTextWrap}>
                  <Text style={styles.mentorTitle}>Daily mentor advice</Text>
                  <Text style={styles.mentorSubtitle}>
                    Get a quick summary and next best action.
                  </Text>
                </View>
              </TouchableOpacity>
            )}

            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Sensor trends</Text>
              <View style={styles.sectionMetaWrap}>
                {lastUpdatedText && (
                  <Text style={[styles.sectionMeta, { color: theme.colors.greyedOut }]}>
                    {lastUpdatedText}
                  </Text>
                )}
                {loadingHistory && (
                  <Text style={[styles.sectionMeta, { color: theme.colors.greyedOut }]}>
                    Updating...
                  </Text>
                )}
              </View>
            </View>

            <View style={styles.statusRow}>
              <View
                style={[
                  styles.statusPill,
                  {
                    backgroundColor: `${isDataFreshRef.current ? theme.colors.primary : theme.colors.greyedOut}18`,
                  },
                ]}>
                <Text
                  style={[
                    styles.statusPillText,
                    {
                      color: isDataFreshRef.current ? theme.colors.primary : theme.colors.secondary,
                    },
                  ]}>
                  {statusLabel}
                </Text>
              </View>
            </View>

            <TimeRangePicker selectedRange={timeRange} setSelectedRange={setTimeRange} />

            <TrendChartCard
              barData={chartData}
              selectedOptionLabel={selectedOptionLabel}
              setSelectedOptionLabel={setSelectedOptionLabel}
              barColor={barColor}
              setBarColor={setBarColor}
            />

            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                Quick sensor summary
              </Text>
            </View>

            <View style={styles.miniTrendRow}>
              <MiniTrendCard title="Soil Moisture" data={summaryTrends.soil} />
              <MiniTrendCard title="Temperature" data={summaryTrends.temp} />
            </View>
            <View style={styles.miniTrendRow}>
              <MiniTrendCard title="Light" data={summaryTrends.light} />
              <MiniTrendCard title="EC" data={summaryTrends.ec} />
            </View>

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
    padding: vw * 5,
  },
  titleContainer: {
    marginTop: vh * 4,
    marginBottom: vh * 2,
    paddingHorizontal: vw * 2,
  },
  headerTitle: {
    fontSize: vw * 12,
    fontFamily: theme.fonts.header,
    fontWeight: 'bold',
    lineHeight: vw * 12,
  },
  sheet: {
    borderTopLeftRadius: vw * 7,
    borderTopRightRadius: vw * 7,
    marginTop: vh * 2.5,
  },
  scrollContent: {
    paddingBottom: vh * 25,
    paddingHorizontal: vw * 5,
    paddingTop: vh * 1.5,
  },
  statusPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
  },
  statusPillText: {
    fontSize: vw * 3,
    fontFamily: theme.fonts.header,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingTop: vh * 0.2,
    paddingRight: vw * 4,
    marginBottom: 8,
  },
  infoTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoText: {
    fontSize: 12,
    marginLeft: 5,
  },
  mentorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    marginTop: 14,
    marginBottom: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  mentorIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  mentorTextWrap: {
    flex: 1,
  },
  mentorTitle: {
    color: 'white',
    fontFamily: theme.fonts.header,
    fontSize: 14,
    marginBottom: 2,
  },
  mentorSubtitle: {
    color: 'rgba(255,255,255,0.84)',
    fontFamily: theme.fonts.regular,
    fontSize: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 6,
  },
  sectionMetaWrap: {
    alignItems: 'flex-end',
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: theme.fonts.header,
  },
  sectionMeta: {
    fontSize: 12,
    fontFamily: theme.fonts.regular,
  },
  statusRow: {
    marginBottom: 8,
  },
  idealStatsCard: {
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginTop: 8,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  idealStatsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  idealStatsTitleWrap: {
    flex: 1,
    paddingRight: 10,
  },
  idealStatsEyebrow: {
    fontSize: 12,
    fontFamily: theme.fonts.header,
    marginBottom: 3,
  },
  idealStatsTitle: {
    fontSize: 16,
    fontFamily: theme.fonts.header,
  },
  seasonPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  idealStatsHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  seasonPillText: {
    fontSize: 12,
    fontFamily: theme.fonts.header,
  },
  idealStatsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  idealStatItem: {
    width: '48%',
    minHeight: 64,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 10,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  idealStatTextWrap: {
    flex: 1,
    marginLeft: 8,
  },
  idealStatLabel: {
    fontSize: 11,
    fontFamily: theme.fonts.regular,
    marginBottom: 2,
  },
  idealStatValue: {
    fontSize: 13,
    lineHeight: 17,
    fontFamily: theme.fonts.header,
  },
  miniTrendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  emptyStateCard: {
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginTop: -6,
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 16,
    fontFamily: theme.fonts.header,
    marginBottom: 6,
  },
  emptyStateBody: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: theme.fonts.regular,
  },
  rangeRow: {
    flexDirection: 'row',
    borderRadius: vw * 3,
    padding: vw * 0.8,
    marginVertical: vh * 1.5,
    alignSelf: 'center',
  },
  rangeButton: {
    flex: 1,
    paddingVertical: vh * 1,
    paddingHorizontal: vw * 3,
    borderRadius: vw * 2.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rangeButtonText: {
    fontSize: vw * 3.5,
    fontWeight: '700',
    fontFamily: theme.fonts.regular,
  },
}));
