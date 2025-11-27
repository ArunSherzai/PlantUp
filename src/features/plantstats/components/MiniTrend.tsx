import { View, Text } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { BarChart } from 'react-native-gifted-charts';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

// SHARED OPTIONS IMPORT
import { trendOptions } from '../api/options';

export default function MiniTrendCard({ title, data }: any) {
  const { theme } = useUnistyles();

  // Find matching option by label
  const meta = trendOptions.find((o) => o.label === title || title.includes(o.label)) ?? {
    color: theme.colors.accent,
    icon: 'bar-chart',
    unit: '',
  };

  return (
    <View style={[styles.card, { backgroundColor: theme.colors.background }]}>
      {/* Title + Icon + Unit */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
        <Feather name={meta.icon as any} size={14} color={meta.color} style={{ marginRight: 6 }} />
        <Text style={[styles.title, { color: theme.colors.text }]}>
          {title} {meta.unit ? `(${meta.unit})` : ''}
        </Text>
      </View>

      <View style={styles.wrapper}>
        <BarChart
          data={data.map((v: number) => ({
            value: v ?? 0,
            frontColor: meta.color,
            spacing: 3,
          }))}
          yAxisThickness={0}
          noOfSections={1}
          height={60}
          spacing={3}
          barWidth={7}
          hideRules
          initialSpacing={0}
          yAxisLabelWidth={20}
          disableScroll={false}
          showScrollIndicator={false}
          xAxisLabelTextStyle={{ color: theme.colors.text }}
          yAxisTextStyle={{ color: theme.colors.text }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  card: {
    padding: 10,
    borderRadius: 16,
    width: '48%',
    marginBottom: 12,
    elevation: 3,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'column',
  },
  wrapper: {
    width: '100%',
    overflow: 'hidden',
    flex: 1,
    padding: 2,
    paddingTop: 5,
    marginRight: 20,
    marginLeft: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 13, marginBottom: 0, fontFamily: theme.fonts.header },
}));
