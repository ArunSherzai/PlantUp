import { View, Text } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { BarChart } from 'react-native-gifted-charts';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { vw, vh } from '~/features/plantlist/styles/plantStyles';

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
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: vh * 0.8 }}>
        <Feather name={meta.icon as any} size={vw * 3.5} color={meta.color} style={{ marginRight: vw * 1.5 }} />
        <Text style={[styles.title, { color: theme.colors.text }]}>
          {title} {meta.unit ? `(${meta.unit})` : ''}
        </Text>
      </View>

      <View style={styles.wrapper}>
        <BarChart
          data={data.map((v: number) => ({
            value: v ?? 0,
            frontColor: meta.color,
            spacing: vw * 0.8,
          }))}
          yAxisThickness={0}
          noOfSections={1}
          height={vh * 8}
          spacing={vw * 0.8}
          barWidth={vw * 1.8}
          hideRules
          initialSpacing={0}
          yAxisLabelWidth={vw * 5}
          disableScroll={false}
          showScrollIndicator={false}
          xAxisLabelTextStyle={{ color: theme.colors.text, fontSize: vw * 2.5 }}
          yAxisTextStyle={{ color: theme.colors.text, fontSize: vw * 2.5 }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  card: {
    padding: vw * 2.5,
    borderRadius: vw * 4,
    width: '48%',
    marginBottom: vh * 1.5,
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
    padding: vw * 0.5,
    paddingTop: vh * 0.5,
    marginRight: vw * 5,
    marginLeft: vw * 2.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: vw * 3.2, marginBottom: 0, fontFamily: theme.fonts.header },
}));
