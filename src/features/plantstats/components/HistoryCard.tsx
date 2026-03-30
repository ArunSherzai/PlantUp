import { View, Text } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { LineChart } from 'react-native-gifted-charts';
import { StyleSheet, useUnistyles } from '~/lib/unistyles';

import { trendOptions } from '../api/options';

export default function HistoryCard({ plants, calculateAverages, lastXdays }: any) {
  const { theme } = useUnistyles();

  if (!plants?.length) return null;

  const safeWeek = calculateAverages(lastXdays(plants, 7)) ?? {};
  const safeMonth = calculateAverages(lastXdays(plants, 30)) ?? {};

  // Map trendOptions -> actual plant keys
  const keyMap: any = {
    temperature: 'temperature',
    humidity: 'humidity',
    soil: 'soil_moisture',
    light: 'light',
    ec: 'electrical_conductivity',
  };

  // Helper: safe numeric
  const toSafeNumber = (val: any, fallback = 0) => {
    const n = typeof val === 'number' ? val : val != null ? Number(val) : fallback;

    return Number.isFinite(n) ? n : fallback;
  };

  // Helper: safe sparkline generator
  const getSparkFor = (valueKey: string) => {
    const plantKey = keyMap[valueKey];

    const list = lastXdays(plants, 30).map((p: any) => ({
      value: toSafeNumber(p?.[plantKey], 0),
    }));

    // gifted-charts dies on empty / NaN arrays
    const cleaned = list.filter((d) => Number.isFinite(d.value));

    return cleaned.length ? cleaned : [{ value: 0 }];
  };

  return (
    <View style={[styles.card, { backgroundColor: theme.colors.background }]}>
      <Text style={[styles.title, { color: theme.colors.text }]}>Past Trends</Text>
      <Text style={[styles.subtitle, { color: theme.colors.greyedOut }]}>30-day overview</Text>

      <View style={styles.grid}>
        {trendOptions.map((opt) => {
          const plantKey = keyMap[opt.value];

          const avgRaw = safeMonth?.[plantKey];
          const avg = toSafeNumber(avgRaw, NaN);

          const avgLabel = Number.isFinite(avg) ? avg.toFixed(1) : '--';

          return (
            <View
              key={opt.value}
              style={[styles.sparkCard, { backgroundColor: theme.colors.surface }]}>
              {/* Header */}
              <View style={styles.sparkHeader}>
                <Feather name={opt.icon as any} size={14} color={opt.color} />
                <Text style={[styles.sparkLabel, { color: theme.colors.text }]}>{opt.label}</Text>
              </View>

              {/* 30-day sparkline */}
              <LineChart
                data={getSparkFor(opt.value)}
                height={50}
                thickness={2}
                curved
                hideDataPoints
                hideRules
                hideYAxisText
                initialSpacing={0}
                spacing={6}
                color={opt.color}
              />

              {/* Avg value */}
              <Text style={[styles.sparkValue, { color: theme.colors.text }]}>
                {avgLabel} {opt.unit}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  card: {
    borderRadius: 20,
    padding: 18,
    marginBottom: 20,
    elevation: 4,
  },

  title: { fontSize: 20, fontFamily: theme.fonts.header },
  subtitle: { fontSize: 12, marginBottom: 12 },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },

  sparkCard: {
    width: '48%',
    borderRadius: 14,
    padding: 10,
    marginBottom: 12,
  },

  sparkHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  sparkLabel: {
    marginLeft: 6,
    fontSize: 12,
    fontFamily: theme.fonts.regular,
  },
  sparkValue: {
    marginTop: 4,
    fontSize: 14,
    fontFamily: theme.fonts.header,
  },
}));
