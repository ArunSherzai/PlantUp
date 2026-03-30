import { View, Text } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { LineChart } from 'react-native-gifted-charts';
import { StyleSheet, useUnistyles } from '~/lib/unistyles';

import { trendOptions } from '../api/options';

export default function HistoryCard({ historyData, calculateAverages, lastXdays }: any) {
  const { theme } = useUnistyles();

  if (!historyData?.length) return null;

  const safeMonth = calculateAverages(lastXdays(historyData, 30)) ?? {};

  const keyMap: Record<string, string> = {
    temperature: 'temperature',
    humidity: 'humidity',
    soil: 'soil_moisture',
    light: 'light',
    ec: 'electrical_conductivity',
  };

  const toSafeNumber = (val: any, fallback = 0) => {
    const n = typeof val === 'number' ? val : val != null ? Number(val) : fallback;
    return Number.isFinite(n) ? n : fallback;
  };

  const getSparkFor = (valueKey: string) => {
    const plantKey = keyMap[valueKey];
    const list = lastXdays(historyData, 30).map((p: any) => ({
      value: toSafeNumber(p?.[plantKey], 0),
    }));
    const cleaned = list.filter((d: any) => Number.isFinite(d.value));
    return cleaned.length ? cleaned : [{ value: 0 }];
  };

  return (
    <View style={[styles.card, { backgroundColor: theme.colors.background }]}>
      <Text style={[styles.title, { color: theme.colors.text }]}>Longer view</Text>
      <Text style={[styles.subtitle, { color: theme.colors.greyedOut }]}>
        30-day averages and movement
      </Text>

      <View style={styles.grid}>
        {trendOptions.map((opt) => {
          const plantKey = keyMap[opt.value];
          const avgRaw = safeMonth?.[plantKey];
          const avg = toSafeNumber(avgRaw, NaN);
          const avgLabel = Number.isFinite(avg) ? avg.toFixed(avg > 99 ? 0 : 1) : '--';

          return (
            <View
              key={opt.value}
              style={[styles.sparkCard, { backgroundColor: theme.colors.surface }]}>
              <View style={styles.sparkHeader}>
                <View style={[styles.sparkIconWrap, { backgroundColor: `${opt.color}16` }]}>
                  <Feather name={opt.icon as any} size={14} color={opt.color} />
                </View>
                <Text style={[styles.sparkLabel, { color: theme.colors.text }]}>{opt.label}</Text>
              </View>

              <LineChart
                data={getSparkFor(opt.value)}
                height={46}
                thickness={2.4}
                curved
                hideDataPoints
                hideRules
                hideYAxisText
                hideAxesAndRules
                initialSpacing={0}
                endSpacing={0}
                spacing={6}
                color={opt.color}
                areaChart
                startFillColor={`${opt.color}22`}
                endFillColor={`${opt.color}03`}
                startOpacity={0.18}
                endOpacity={0.03}
              />

              <Text style={[styles.sparkValue, { color: theme.colors.text }]}>
                {avgLabel} {opt.unit}
              </Text>
              <Text style={[styles.sparkCaption, { color: theme.colors.greyedOut }]}>
                30-day average
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
  title: {
    fontSize: 20,
    fontFamily: theme.fonts.header,
  },
  subtitle: {
    fontSize: 12,
    marginBottom: 12,
    fontFamily: theme.fonts.regular,
  },
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
    marginBottom: 8,
  },
  sparkIconWrap: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  sparkLabel: {
    fontSize: 12,
    fontFamily: theme.fonts.regular,
    flexShrink: 1,
  },
  sparkValue: {
    marginTop: 6,
    fontSize: 14,
    fontFamily: theme.fonts.header,
  },
  sparkCaption: {
    marginTop: 2,
    fontSize: 11,
    fontFamily: theme.fonts.regular,
  },
}));
