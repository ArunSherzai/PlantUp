import { View, Text } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { StyleSheet, useUnistyles } from '~/lib/unistyles';

export default function WeatherRow({ temperature, humidity }: any) {
  const { theme } = useUnistyles();

  return (
    <View style={styles.row}>
      {/* Temperature */}
      <View style={[styles.cardSmall, { backgroundColor: theme.colors.background }]}>
        <View style={styles.cardTopRow}>
          <Text style={[styles.cardValueText, { color: theme.colors.text }]}>{temperature}</Text>
          <Feather name="sun" size={32} color={theme.colors.accent} />
        </View>
        <Text style={[styles.cardLabelText, { color: theme.colors.greyedOut }]}>
          Today's weather
        </Text>
      </View>

      {/* Humidity */}
      <View style={[styles.cardSmall, { backgroundColor: theme.colors.background }]}>
        <View style={styles.cardTopRow}>
          <Text style={[styles.cardValueText, { color: theme.colors.text }]}>{humidity}</Text>
          <Feather name="droplet" size={32} color={theme.colors.accent} />
        </View>
        <Text style={[styles.cardLabelText, { color: theme.colors.greyedOut }]}>
          Today's humidity
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  cardSmall: {
    width: '48%',
    borderRadius: 18,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardValueText: {
    fontSize: 28,
    fontFamily: theme.fonts.header,
  },
  cardLabelText: {
    fontSize: 13,
    fontFamily: theme.fonts.regular,
  },
}));
