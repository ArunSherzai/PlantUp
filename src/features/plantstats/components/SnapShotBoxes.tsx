import { View, Text } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { StyleSheet, useUnistyles } from '~/lib/unistyles';

export default function SnapshotBoxes({ latest }: any) {
  const { theme } = useUnistyles();

  const items = [
    {
      label: 'Soil',
      value: latest?.soil_moisture != null ? `${latest.soil_moisture}%` : '--',
      icon: 'droplet',
      color: theme.colors.accent,
    },
    {
      label: 'Temp',
      value: latest?.temperature != null ? `${latest.temperature}°C` : '--',
      icon: 'thermometer',
      color: theme.colors.primary,
    },
    {
      label: 'Light',
      value: latest?.light != null ? `${latest.light}` : '--',
      icon: 'sun',
      color: theme.colors.accent,
    },
    {
      label: 'EC',
      value:
        latest?.electrical_conductivity != null ? latest.electrical_conductivity.toFixed(2) : '--',
      icon: 'zap',
      color: theme.colors.primary,
    },
  ];

  return (
    <View style={styles.row}>
      {items.map((item, i) => (
        <View key={i} style={[styles.card, { backgroundColor: theme.colors.background }]}>
          <Feather name={item.icon as any} size={20} color={item.color} />
          <Text style={[styles.value, { color: theme.colors.text }]}>{item.value}</Text>
          <Text style={[styles.label, { color: theme.colors.greyedOut }]}>{item.label}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },

  card: {
    width: '24%',
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',

    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },

  value: {
    marginTop: 6,
    fontSize: 17,
    fontFamily: theme.fonts.header,
  },

  label: {
    marginTop: 2,
    fontSize: 12,
    fontFamily: theme.fonts.regular,
  },
}));
