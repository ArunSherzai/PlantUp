import {
  View,
  Text,
  ActivityIndicator,
  TouchableOpacity,
  ImageBackground,
  ScrollView,
} from 'react-native';
import { useUnistyles, StyleSheet } from 'react-native-unistyles';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useState, useEffect } from 'react';
import Feather from '@expo/vector-icons/Feather';
import { BarChart } from 'react-native-gifted-charts';
import * as Location from 'expo-location';
import { db } from '../../utils/supabase'; // Assuming 'db' is your initialized Supabase client

export default function ShowPlantStats() {
  const { theme } = useUnistyles();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { plantId: initialPlantId } = route.params || {};

  // State to hold the current user
  const [userId, setUserId] = useState<string | null>(null);

  const [name, setName] = useState('--');
  const [temperature, setTemperature] = useState('—');
  const [humidity, setHumidity] = useState('—');
  const [plants, setPlants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedOptionLabel, setSelectedOptionLabel] = useState<
    'Temperature' | 'Humidity' | 'Soil Moisture' | 'Light' | 'EC'
  >('Temperature');
  const [barColor, setBarColor] = useState('#fdae11');
  const [isDropdownVisible, setDropdownVisible] = useState(false);

  async function fetchPlantById(id: string) {
    try {
      const { data, error } = await db.social
        .from('Plants')
        .select('id, nickname')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    } catch (err) {
      console.error('Error loading plant:', err);
      return null;
    }
  }

  async function fetchPlantControllers(plantId: string) {
    try {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);

      const { data, error } = await db.micro
        .from('Controllers')
        .select('temperature, humidity, soil_moisture, light, electrical_conductivity, created_at')
        .eq('plant_id', plantId)
        .gte('created_at', startOfDay.toISOString())
        .lt('created_at', endOfDay.toISOString())
        .order('created_at', { ascending: true });

      if (error) throw error;
      setPlants(data ?? []);
    } catch (err) {
      console.error('Error fetching controller data:', err);
      setPlants([]);
    }
  }

  // MODIFIED: Accepts userId as an argument
  async function triggerCheckStatusQuest(currentUserId: string) {
    try {
      if (!currentUserId) return; // Guard against null user ID

      // Load all active quests for the user
      const { data: quests, error } = await db.gamification
        .from('User_quests')
        .select(
          `
          id,
          progress,
          status,
          quest:Quests (
            action_code,
            target_count
          )
        `
        )
        // FIX: Use currentUserId instead of the undefined 'user?.id'
        .eq('user_id', currentUserId)
        .neq('status', 'completed');

      if (error) {
        console.log('CHECK_STATUS quest fetch error:', error);
        return;
      }

      if (!quests?.length) return;

      // Update all CHECK_STATUS quests
      for (const uq of quests) {
        if (uq.quest?.action_code === 'CHECK_STATUS') {
          const newProgress = (uq.progress ?? 0) + 1;

          await db.gamification
            .from('User_quests')
            .update({
              progress: newProgress,
              status: newProgress >= uq.quest.target_count ? 'completed' : 'in_progress',
              completed_at: newProgress >= uq.quest.target_count ? new Date().toISOString() : null,
            })
            .eq('id', uq.id);
        }
      }
    } catch (err) {
      console.error('CHECK_STATUS error:', err);
    }
  }

  useEffect(() => {
    (async () => {
      setLoading(true);

      if (!initialPlantId) {
        console.error('No plantId passed to ShowPlantStats');
        setLoading(false);
        return;
      }

      // --- FIX: Fetch the authenticated user's ID first ---
      const {
        data: { user },
      } = await db.public.auth.getUser();
      if (user) {
        setUserId(user.id);
        // Trigger quest with the retrieved user ID
        await triggerCheckStatusQuest(user.id);
      }
      // ---------------------------------------------------

      const plant = await fetchPlantById(initialPlantId);
      if (plant) {
        setName(plant.nickname);
      }

      // Load sensor data
      await fetchPlantControllers(initialPlantId);

      // Load local weather
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const location = await Location.getCurrentPositionAsync({});
          const url = `https://api.open-meteo.com/v1/forecast?latitude=${location.coords.latitude}&longitude=${location.coords.longitude}&current_weather=true&hourly=relative_humidity_2m`;

          const res = await fetch(url);
          const data = await res.json();
          const temp = data.current_weather?.temperature;
          const hum = data.hourly?.relative_humidity_2m?.[0];

          if (temp !== undefined) setTemperature(`${temp.toFixed(1)}°`);
          if (hum !== undefined) setHumidity(`${hum}%`);
        }
      } catch (err) {
        console.error('Weather fetch error:', err);
      }

      setLoading(false);
    })();
  }, [initialPlantId]); // Added userId to dependencies if we were relying on it, but fetching it in useEffect is safer.

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
        <Text>Loading plant stats...</Text>
      </View>
    );
  }

  return (
    <ImageBackground
      source={require('../../../assets/images/statsBackground.png')}
      style={styles.backgroundImage}>
      {/* Header */}
      <View style={styles.topHeader}>
        <TouchableOpacity style={styles.arrowIcon} onPress={() => navigation.goBack()}>
          <Feather name="arrow-left" size={24} color="white" />
        </TouchableOpacity>

        <View style={{ width: 24 }} />
      </View>

      <View style={styles.headerContainer}>
        <Text style={styles.headerTitle}>How's</Text>
        <Text style={styles.headerTitle}>{name}?</Text>
      </View>

      <ScrollView
        overScrollMode="never"
        style={styles.formContainer}
        contentContainerStyle={{ paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled">
        {/* Temperature Card */}
        <View style={styles.card}>
          <View style={styles.cardTopRow}>
            <Text style={styles.cardValueText}>{temperature}</Text>
            <Feather name="sun" size={36} color="#FFD700" />
          </View>
          <View style={styles.cardSeparator} />
          <Text style={styles.cardLabelText}>Today's weather</Text>
        </View>

        {/* Humidity Card */}
        <View style={styles.card}>
          <View style={styles.cardTopRow}>
            <Text style={styles.cardValueText}>{humidity}</Text>
            <Feather name="droplet" size={36} color="#1E90FF" />
          </View>
          <View style={styles.cardSeparator} />
          <Text style={styles.cardLabelText}>Today's humidity</Text>
        </View>

        {/* Chart */}
        <View style={styles.chartCard}>
          <Text style={styles.chartCardTitle}>Today's Stats</Text>

          <TouchableOpacity
            style={styles.dropdownIconContainer}
            onPress={() => setDropdownVisible(!isDropdownVisible)}>
            <Text style={styles.selectedOptionText}>{selectedOptionLabel}</Text>
            <Feather name="chevron-down" size={20} color={theme.colors.text} />
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
    backgroundColor: theme.colors.greyedOut,
    marginBottom: 10,
  },
  cardLabelText: {
    fontSize: 14,
    color: theme.colors.greyedOut,
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
  headerPlantName: {
    color: 'white',
    fontSize: 20,
    fontWeight: '600',
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
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
    elevation: 2,
  },
  selectedOptionText: {
    fontSize: 16,
    color: theme.colors.text,
    fontFamily: theme.fonts.regular,
  },
  dropdownMenu: {
    position: 'absolute',
    top: 45,
    right: 15,
    backgroundColor: theme.colors.background,
    borderRadius: 15,
    paddingVertical: 5,
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
