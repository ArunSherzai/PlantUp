import { View, Text } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { StyleSheet, useUnistyles } from '~/lib/unistyles';
import { vw, vh } from '~/features/plantlist/styles/plantStyles';

import { trendOptions } from '../api/options';

export default function MiniTrendCard({ title, data }: any) {
  const { theme } = useUnistyles();

  const meta = trendOptions.find((o) => o.label === title || title.includes(o.label)) ?? {
    color: theme.colors.accent,
    icon: 'bar-chart',
    unit: '',
  };

  const safeValues = (Array.isArray(data) ? data : [])
    .map((value: any) => (typeof value === 'number' ? value : Number(value)))
    .filter((value: number) => Number.isFinite(value));

  const latest = safeValues.length ? safeValues[safeValues.length - 1] : null;
  const previous = safeValues.length > 1 ? safeValues[safeValues.length - 2] : null;
  const delta = latest != null && previous != null ? latest - previous : null;
  const direction =
    delta == null ? 'minus' : delta > 0 ? 'trending-up' : delta < 0 ? 'trending-down' : 'minus';
  const directionColor =
    delta == null ? theme.colors.greyedOut : delta > 0 ? meta.color : delta < 0 ? '#ef4444' : theme.colors.greyedOut;

  const formatValue = (value: number | null) =>
    value == null ? '--' : `${value.toFixed(value > 99 ? 0 : 1)}${meta.unit ? ` ${meta.unit}` : ''}`;

  return (
    <View style={[styles.card, { backgroundColor: theme.colors.background }]}>
      <View style={styles.topRow}>
        <View style={[styles.iconWrap, { backgroundColor: `${meta.color}16` }]}>
          <Feather name={meta.icon as any} size={vw * 3.8} color={meta.color} />
        </View>
        <Feather name={direction as any} size={vw * 4.2} color={directionColor} />
      </View>

      <Text style={[styles.title, { color: theme.colors.text }]} numberOfLines={1}>
        {title}
      </Text>
      <Text style={[styles.value, { color: theme.colors.text }]} numberOfLines={1}>
        {formatValue(latest)}
      </Text>
      <Text style={[styles.helper, { color: theme.colors.greyedOut }]} numberOfLines={1}>
        {delta == null
          ? 'Waiting for more data'
          : delta === 0
            ? 'Stable'
            : `${delta > 0 ? '+' : ''}${delta.toFixed(1)} since last reading`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  card: {
    padding: vw * 3.2,
    borderRadius: vw * 4,
    width: '48%',
    marginBottom: vh * 1.5,
    elevation: 3,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconWrap: {
    width: vw * 9,
    height: vw * 9,
    borderRadius: vw * 4.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: vw * 3.2,
    fontFamily: theme.fonts.regular,
    marginBottom: 6,
  },
  value: {
    fontSize: vw * 4.1,
    fontFamily: theme.fonts.header,
    marginBottom: 4,
  },
  helper: {
    fontSize: vw * 2.7,
    fontFamily: theme.fonts.regular,
    lineHeight: vw * 3.6,
  },
}));
