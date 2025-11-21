import { View, Text } from 'react-native';
import { BarChart } from 'react-native-gifted-charts';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

export default function HistoryCard({ plants, calculateAverages, lastXdays }: any) {
  const { theme } = useUnistyles();

  if (!plants.length) return null;

  const week = calculateAverages(lastXdays(plants, 7));
  const month = calculateAverages(lastXdays(plants, 30));

  return (
    <View style={[styles.card, { backgroundColor: theme.colors.background }]}>
      <Text style={[styles.title, { color: theme.colors.text }]}>Past Trends</Text>
      <Text style={[styles.subtitle, { color: theme.colors.greyedOut }]}>
        Weekly & Monthly Overview
      </Text>

      {/* WEEKLY */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>This Week</Text>

        <View style={styles.row}>
          <View style={styles.metric}>
            <Text style={[styles.metricLabel, { color: theme.colors.greyedOut }]}>Moisture</Text>
            <Text style={[styles.metricValue, { color: theme.colors.text }]}>
              {Math.round(week?.soil_moisture ?? 0)}%
            </Text>
          </View>

          <View style={styles.metric}>
            <Text style={[styles.metricLabel, { color: theme.colors.greyedOut }]}>EC</Text>
            <Text style={[styles.metricValue, { color: theme.colors.text }]}>
              {week?.ec?.toFixed(2) ?? '--'}
            </Text>
          </View>

          <View style={styles.metric}>
            <Text style={[styles.metricLabel, { color: theme.colors.greyedOut }]}>Light</Text>
            <Text style={[styles.metricValue, { color: theme.colors.text }]}>
              {Math.round(week?.light ?? 0)}
            </Text>
          </View>
        </View>
      </View>

      {/* MONTHLY */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>This Month</Text>

        {/* Sparkline */}
        <View style={[styles.spark, { backgroundColor: theme.colors.surface }]}>
          <BarChart
            data={lastXdays(plants, 30).map((x: any) => ({
              value: x.soil_moisture ?? 0,
              frontColor: theme.colors.accent,
            }))}
            barWidth={4}
            spacing={2}
            height={60}
            initialSpacing={0}
            hideYAxisText
            hideRules
            isAnimated
          />
        </View>

        <View style={styles.row}>
          <View style={styles.metric}>
            <Text style={[styles.metricLabel, { color: theme.colors.greyedOut }]}>Avg Temp</Text>
            <Text style={[styles.metricValue, { color: theme.colors.text }]}>
              {Math.round(month?.temperature ?? 0)}°
            </Text>
          </View>

          <View style={styles.metric}>
            <Text style={[styles.metricLabel, { color: theme.colors.greyedOut }]}>Avg Moist</Text>
            <Text style={[styles.metricValue, { color: theme.colors.text }]}>
              {Math.round(month?.soil_moisture ?? 0)}%
            </Text>
          </View>

          <View style={styles.metric}>
            <Text style={[styles.metricLabel, { color: theme.colors.greyedOut }]}>Avg EC</Text>
            <Text style={[styles.metricValue, { color: theme.colors.text }]}>
              {month?.ec?.toFixed(2) ?? '--'}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  card: {
    borderRadius: 20,
    padding: 18,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  title: { fontSize: 20, fontFamily: theme.fonts.header },
  subtitle: { fontSize: 12, marginBottom: 12 },
  section: { marginBottom: 15 },
  sectionTitle: { fontSize: 15, marginBottom: 6, fontFamily: theme.fonts.regular },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  metric: { width: '30%' },
  metricLabel: { fontSize: 12 },
  metricValue: { fontSize: 16, fontFamily: theme.fonts.header },
  spark: {
    borderRadius: 12,
    paddingVertical: 6,
    marginBottom: 10,
  },
}));
