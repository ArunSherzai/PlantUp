import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ImageBackground, ScrollView, TouchableOpacity } from 'react-native';
import { useNavigation, useFocusEffect, useRoute } from '@react-navigation/native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import * as Location from 'expo-location';
import Feather from '@expo/vector-icons/Feather';
import { db } from '../../utils/supabase';

// --- COMPONENTS ---
import Header from '~/features/plantstats/components/Header';
import PlantSelector from '~/features/plantstats/components/PlantSelector';
import LoadingScreen from '~/features/plantstats/components/LoadingScreen';
import TrendChartCard from '~/features/plantstats/components/TrendChartCard';
import WeatherRow from '~/features/plantstats/components/WeatherRow';
import OverviewCard from '~/features/plantstats/components/OverviewCard';
import HistoryCard from '~/features/plantstats/components/HistoryCard';
import ChartTypePicker from '~/features/plantstats/components/Chartpicker';
import MiniTrendCard from '~/features/plantstats/components/MiniTrend';

// --- API HELPERS ---
import { calculateAverages, lastXdays } from '~/features/plantstats/api/history';
import { calculateHealth } from '~/features/plantstats/api/healthScore';
import SnapshotBoxes from '~/features/plantstats/components/SnapShotBoxes';
import UnifiedChart from '~/features/plantstats/components/UnifiedChart';
export default function ShowPlantStats() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { theme } = useUnistyles();
  const [chartType, setChartType] = useState('bar');

  const { plantId: initialPlantId, plantName: initialPlantName } = route.params ?? {};

  // --- STATE ---
  const [name, setName] = useState(initialPlantName || '--');
  const [temperature, setTemperature] = useState('—');
  const [humidity, setHumidity] = useState('—');

  const [plantsList, setPlantsList] = useState<any[]>([]);
  const [selectedPlant, setSelectedPlant] = useState<any>(null);

  const [plants, setPlants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // dropdowns
  const [isPlantDropdownVisible, setPlantDropdownVisible] = useState(false);
  const [isDropdownVisible, setDropdownVisible] = useState(false);

  // chart selector
  const [selectedOptionLabel, setSelectedOptionLabel] = useState<
    'Temperature' | 'Humidity' | 'Soil Moisture' | 'Light' | 'EC'
  >('Temperature');

  const [barColor, setBarColor] = useState('#fdae11');

  // ---- WEATHER FETCH ----
  useEffect(() => {
    (async () => {
      try {
        await fetchUserPlants();

        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;

        const loc = await Location.getCurrentPositionAsync({});
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${loc.coords.latitude}&longitude=${loc.coords.longitude}&current_weather=true&hourly=relative_humidity_2m`;

        const res = await fetch(url);
        const data = await res.json();

        const t = data?.current_weather?.temperature;
        if (t != null) setTemperature(`${t.toFixed(1)}°`);

        const h = data?.hourly?.relative_humidity_2m?.[0];
        if (h != null) setHumidity(`${h}%`);
      } catch (err) {
        console.error(err);
      }
    })();
  }, []);

  // ---- SUPABASE FETCH: Plants ----
  async function fetchUserPlants() {
    setLoading(true);
    try {
      const { data: auth } = await db.public.auth.getUser();
      const user = auth?.user;
      if (!user) throw new Error('No user logged in.');

      const { data } = await db.social.from('Plants').select('id, nickname').eq('user_id', user.id);

      setPlantsList(data ?? []);

      if (data?.length) {
        setSelectedPlant(data[0]);
        setName(data[0].nickname);
        await fetchPlantControllers(data[0].id);
      }
    } catch (e) {
      console.error('fetchUserPlants error:', e);
    } finally {
      setLoading(false);
    }
  }

  // ---- SUPABASE: Sensor Controllers ----
  async function fetchPlantControllers(plantId: string) {
    try {
      const { data } = await db.micro
        .from('Controllers')
        .select('temperature, humidity, soil_moisture, light, electrical_conductivity, created_at')
        .eq('plant_id', plantId)
        .order('created_at', { ascending: false })
        .limit(100);

      setPlants(data ?? []);
    } catch (err) {
      console.error(err);
      setPlants([]);
    }
  }

  // ---- CHART DATA ----
  const chartData = () => {
    if (!plants.length) return [];

    return plants.map((p) => {
      const label = new Date(p.created_at).toISOString().slice(11, 16);

      const value =
        selectedOptionLabel === 'Temperature'
          ? p.temperature
          : selectedOptionLabel === 'Humidity'
            ? p.humidity
            : selectedOptionLabel === 'Soil Moisture'
              ? p.soil_moisture
              : selectedOptionLabel === 'Light'
                ? p.light
                : p.electrical_conductivity;

      return {
        value: value ?? 0,
        label,
        frontColor: barColor,
      };
    });
  };

  const barData = chartData();
  const maxY = barData.length ? Math.max(...barData.map((d) => d.value)) : 0;

  const latest = plants.length ? plants[0] : null;
  const health = latest ? calculateHealth(latest) : null;

  // ---- LOADING SCREEN ----
  if (loading) return <LoadingScreen />;

  // ---- MAIN UI ----
  return (
    <ImageBackground
      source={require('../../../assets/images/statsBackground.png')}
      style={styles.bg}>
      {/* HEADER */}
      <Header navigation={navigation}>
        <PlantSelector
          plantsList={plantsList}
          selectedPlant={selectedPlant}
          isVisible={isPlantDropdownVisible}
          setVisible={setPlantDropdownVisible}
          onSelectPlant={async (p: any) => {
            setSelectedPlant(p);
            setName(p.nickname);
            setPlantDropdownVisible(false);
            await fetchPlantControllers(p.id);
          }}
        />
      </Header>

      {/* TITLE */}
      <View style={styles.headerContainer}>
        <Text style={[styles.headerTitle, { color: 'white' }]}>How's</Text>
        <Text style={[styles.headerTitle, { color: 'white' }]}>{name}?</Text>
      </View>

      {/* CONTENT */}
      <ScrollView
        overScrollMode="never"
        contentContainerStyle={{ paddingBottom: 50 }}
        style={[styles.sheet, { backgroundColor: theme.colors.background }]}>
        {/* OVERVIEW */}
        <OverviewCard latest={latest} health={health} />
        {/* Snapshots */}
        <SnapshotBoxes latest={latest} />
        {/* WEATHER */}
        {/* <WeatherRow temperature={temperature} humidity={humidity} /> */}
        <TrendChartCard
          barData={barData}
          maxY={maxY}
          selectedOptionLabel={selectedOptionLabel}
          setSelectedOptionLabel={setSelectedOptionLabel}
          barColor={barColor}
          setBarColor={setBarColor}
          isDropdownVisible={isDropdownVisible}
          setDropdownVisible={setDropdownVisible}
        />
        {/* TREND */}

        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <MiniTrendCard title="Soil Moisture" data={plants.map((p) => p.soil_moisture)} />
          <MiniTrendCard title="Temperature" data={plants.map((p) => p.temperature)} />
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <MiniTrendCard title="Light" data={plants.map((p) => p.temperature)} />
          <MiniTrendCard title="EC" data={plants.map((p) => p.soil_moisture)} />
        </View>

        {/* LAST UPDATED 

        
        <ChartTypePicker selected={chartType} onSelect={setChartType} />
        <UnifiedChart type={chartType} data={barData} />
        {latest && (
          <Text style={[styles.lastUpdated, { color: theme.colors.greyedOut }]}>
            Last update:{' '}
            {new Date(latest.created_at).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        )}*/}
        {/* HISTORY (WEEK + MONTH)        
        <HistoryCard plants={plants} calculateAverages={calculateAverages} lastXdays={lastXdays} />*/}
      </ScrollView>
    </ImageBackground>
  );
}

// ---- STYLES FOR THIS SCREEN ----
const styles = StyleSheet.create((theme) => ({
  bg: { flex: 1, justifyContent: 'flex-end' },

  headerContainer: {
    paddingLeft: 20,
    marginTop: 30,
  },
  headerTitle: {
    fontSize: 48,
    fontFamily: theme.fonts.header,
    fontWeight: 'bold',
  },

  sheet: {
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    padding: 20,
    marginTop: 20,
  },

  lastUpdated: {
    marginTop: 8,
    fontSize: 11,
    textAlign: 'center',
    fontFamily: theme.fonts.regular,
  },
}));
