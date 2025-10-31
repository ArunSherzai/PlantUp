import {
  View,
  Text,
  ActivityIndicator,
  TouchableOpacity,
  ImageBackground,
  ScrollView,
} from 'react-native';
import { useUnistyles, StyleSheet } from 'react-native-unistyles';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useState, useEffect, useCallback } from 'react';
import Feather from '@expo/vector-icons/Feather';
import { BarChart } from 'react-native-gifted-charts';
import * as Location from 'expo-location';
import { db } from '../../utils/supabase';

export default function ShowPlantStats() {
  const { theme } = useUnistyles();
  const navigation = useNavigation<any>();

  // --- States ---
  const [name, setName] = useState('--');
  const [temperature, setTemperature] = useState('—');
  const [humidity, setHumidity] = useState('—');
  const [plants, setPlants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDropdownVisible, setDropdownVisible] = useState(false);
  const [selectedOptionLabel, setSelectedOptionLabel] = useState<
    'Temperature' | 'Humidity' | 'Soil Moisture' | 'Light' | 'EC'
  >('Temperature');
  const [barColor, setBarColor] = useState('#fdae11');
  const [plantsList, setPlantsList] = useState<any[]>([]);
  const [selectedPlant, setSelectedPlant] = useState<any>(null);
  const [isPlantDropdownVisible, setPlantDropdownVisible] = useState(false);

  // Refresh on focus
  useFocusEffect(
    useCallback(() => {
      fetchUserPlants();
      return () => {};
    }, [])
  );

  useEffect(() => {
    (async () => {
      try {
        await fetchUserPlants();

        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          console.warn('Location permission not granted');
          return;
        }

        const location = await Location.getCurrentPositionAsync({});
        const { latitude, longitude } = location.coords;

        const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true&hourly=relative_humidity_2m`;
        const res = await fetch(url);
        const data = await res.json();

        const temp = data?.current_weather?.temperature;
        setTemperature(`${temp?.toFixed(1)}°`);

        const humidityData = data?.hourly?.relative_humidity_2m?.[0];
        if (humidityData) setHumidity(`${humidityData}%`);
      } catch (err) {
        console.error('Error fetching weather data:', err);
      }
    })();
  }, []);

  // --- Fetch Plant + Sensor Data ---
  async function fetchUserPlants() {
    setLoading(true);
    try {
      const {
        data: { user },
        error: userError,
      } = await db.public.auth.getUser();

      if (userError || !user) throw userError ?? new Error('No user logged in');

      const { data: plantsData, error: plantsError } = await db.social
        .from('Plants')
        .select('id, nickname')
        .eq('user_id', user.id);

      if (plantsError) throw plantsError;

      setPlantsList(plantsData ?? []);
      if (plantsData && plantsData.length > 0) {
        setSelectedPlant(plantsData[0]);
        setName(plantsData[0].nickname);
        await fetchPlantControllers(plantsData[0].id);
      } else {
        setName('--');
      }
    } catch (err) {
      console.error('Error fetching user plants:', err);
      setPlants([]);
    } finally {
      setLoading(false);
    }
  }

  async function fetchPlantControllers(plantId: string) {
    try {
      const { data, error } = await db.micro
        .from('Controllers')
        .select('temperature, humidity, soil_moisture, light, electrical_conductivity, created_at')
        .eq('plant_id', plantId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setPlants(data ?? []);
    } catch (err) {
      console.error('Error fetching controller data:', err);
      setPlants([]);
    }
  }

  const getChartData = () => {
    if (!plants.length) return [];

    return plants.map((p) => {
      const timeLabel = new Date(p.created_at).toISOString().slice(11, 16);

      let value = 0;
      if (selectedOptionLabel === 'Temperature') value = p.temperature ?? 0;
      if (selectedOptionLabel === 'Humidity') value = p.humidity ?? 0;
      if (selectedOptionLabel === 'Soil Moisture') value = p.soil_moisture ?? 0;
      if (selectedOptionLabel === 'Light') value = p.light ?? 0;
      if (selectedOptionLabel === 'EC') value = p.electrical_conductivity ?? 0;

      return {
        value,
        label: timeLabel,
        frontColor: barColor,
      };
    });
  };

  const giftedBarData = getChartData();
  const maxY = giftedBarData.length > 0 ? Math.max(...giftedBarData.map((d) => d.value)) : 0;

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text>Loading your plant data...</Text>
      </View>
    );
  }

  return (
    <ImageBackground
      source={require('../../../assets/images/statsBackground.png')}
      style={styles.backgroundImage}>
      <View style={styles.topHeader}>
        <TouchableOpacity style={styles.arrowIcon} onPress={() => navigation.goBack()}>
          <Feather name="arrow-left" size={24} color="white" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.plantDropdownButton}
          onPress={() => setPlantDropdownVisible(!isPlantDropdownVisible)}>
          <Text style={styles.plantDropdownText}>{selectedPlant?.nickname ?? 'Select plant'}</Text>
          <Feather name="chevron-down" size={18} color="white" />
        </TouchableOpacity>

        {isPlantDropdownVisible && (
          <View style={styles.plantDropdownMenu}>
            {plantsList.map((plant) => (
              <TouchableOpacity
                key={plant.id}
                style={styles.plantDropdownItem}
                onPress={async () => {
                  setSelectedPlant(plant);
                  setPlantDropdownVisible(false);
                  setName(plant.nickname);
                  await fetchPlantControllers(plant.id);
                }}>
                <Text style={styles.plantDropdownItemText}>{plant.nickname}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      <View style={styles.headerContainer}>
        <Text style={styles.headerTitle}>How's</Text>
        <Text style={styles.headerTitle}>{name}?</Text>
      </View>

      <ScrollView
        style={styles.formContainer}
        contentContainerStyle={{ paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled">
        {/* Weather Cards */}
        <View style={styles.card}>
          <View style={styles.cardTopRow}>
            <Text style={styles.cardValueText}>{temperature}</Text>
            <Feather name="sun" size={36} color="#FFD700" />
          </View>
          <View style={styles.cardSeparator} />
          <Text style={styles.cardLabelText}>Today's weather</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.cardTopRow}>
            <Text style={styles.cardValueText}>{humidity}</Text>
            <Feather name="droplet" size={36} color="#1E90FF" />
          </View>
          <View style={styles.cardSeparator} />
          <Text style={styles.cardLabelText}>Today's humidity</Text>
        </View>

        {/* Chart Card */}
        <View style={styles.chartCard}>
          <Text style={styles.chartCardTitle}>Today's Stats</Text>

          <TouchableOpacity
            style={styles.dropdownIconContainer}
            onPress={() => setDropdownVisible(!isDropdownVisible)}>
            <Text style={styles.selectedOptionText}>{selectedOptionLabel}</Text>
            <Feather
              name="chevron-down"
              size={20}
              color={theme.colors.text}
              style={{ marginLeft: 5 }}
            />
          </TouchableOpacity>

          <View style={{ marginTop: 55 }}>
            <BarChart
              data={giftedBarData}
              height={200}
              barWidth={25}
              width={250}
              initialSpacing={10}
              xAxisThickness={1}
              yAxisThickness={1}
              xAxisColor={theme.colors.greyedOut}
              yAxisColor={theme.colors.greyedOut}
              xAxisLabelTextStyle={{ color: theme.colors.text, fontSize: 10 }}
              yAxisTextStyle={{ color: theme.colors.text }}
              noOfSections={4}
              maxValue={maxY + 5}
              barBorderRadius={4}
              hideRules
            />
          </View>

          {isDropdownVisible && (
            <View style={styles.dropdownMenu}>
              {[
                { label: 'Temperature', color: '#fdae11' },
                { label: 'Humidity', color: '#329d9c' },
                { label: 'Soil Moisture', color: '#22b261' },
                { label: 'Light', color: '#ffd700' },
                { label: 'EC', color: '#9b59b6' },
              ].map((option, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.dropdownItem}
                  onPress={() => {
                    setBarColor(option.color);
                    setSelectedOptionLabel(option.label as any);
                    setDropdownVisible(false);
                  }}>
                  <Text style={styles.dropdownItemText}>{option.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </ImageBackground>
  );
}

// --- Styles ---
const styles = StyleSheet.create((theme) => ({
  card: {
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    width: '100%',
    marginBottom: 20,
    padding: 20,
  },
  chartCard: {
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    width: '100%',
    marginBottom: 20,
    padding: 5,
    paddingRight: 10,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  cardValueText: {
    fontSize: 48,
    fontWeight: '300',
    color: theme.colors.text,
  },
  cardSeparator: {
    height: 1,
    backgroundColor: theme.colors.greyedOut || '#E0E0E0',
    marginBottom: 10,
  },
  cardLabelText: {
    fontSize: 14,
    color: theme.colors.greyedOut || '#757575',
    fontFamily: theme.fonts.regular,
  },
  backgroundImage: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 40,
  },
  arrowIcon: {
    margin: 5,
  },
  plantDropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  plantDropdownText: {
    color: 'white',
    fontSize: 16,
    marginRight: 6,
  },
  plantDropdownMenu: {
    position: 'absolute',
    top: 50,
    right: 20,
    backgroundColor: 'white',
    borderRadius: 10,
    paddingVertical: 5,
    elevation: 5,
    zIndex: 10,
    minWidth: 140,
  },
  plantDropdownItem: {
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  plantDropdownItemText: {
    fontSize: 16,
    color: '#333',
  },
  headerContainer: {
    paddingLeft: 20,
    marginTop: 30,
  },
  headerTitle: {
    fontSize: 48,
    fontWeight: 'bold',
    color: 'white',
  },
  formContainer: {
    backgroundColor: 'white',
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    padding: 20,
  },
  dropdownIconContainer: {
    position: 'absolute',
    top: 15,
    right: 15,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface || '#EFEFEF',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  selectedOptionText: {
    fontSize: 16,
    color: theme.colors.text,
    fontFamily: theme.fonts.regular,
    marginRight: 3,
  },
  dropdownMenu: {
    position: 'absolute',
    top: 45,
    right: 15,
    backgroundColor: theme.colors.background,
    borderRadius: 15,
    paddingVertical: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    zIndex: 20,
    minWidth: 140,
  },
  dropdownItem: {
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  dropdownItemText: {
    fontSize: 16,
    color: theme.colors.text,
    fontFamily: theme.fonts.regular,
  },
  chartCardTitle: {
    position: 'absolute',
    top: 15,
    left: 15,
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
    zIndex: 5,
  },
}));
