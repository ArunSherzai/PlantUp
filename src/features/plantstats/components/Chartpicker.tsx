import { View, TouchableOpacity, Text } from 'react-native';
import { StyleSheet, useUnistyles } from '~/lib/unistyles';

export const chartTypes = [
  { key: 'bar', label: 'Bars' },
  { key: 'line', label: 'Line' },
  { key: 'area', label: 'Area' },
  { key: 'dot', label: 'Dots' }, // point-only line chart

  // optional extra types:
  { key: 'pie', label: 'Pie' },
  { key: 'donut', label: 'Donut' },
  { key: 'radar', label: 'Radar' },
  { key: 'pyramid', label: 'Pyramid' },
];
export default function ChartTypePicker({ selected, onSelect }: any) {
  const { theme } = useUnistyles();

  return (
    <View style={styles.row}>
      {chartTypes.map((c) => (
        <TouchableOpacity
          key={c.key}
          onPress={() => onSelect(c.key)}
          style={[
            styles.button,
            {
              backgroundColor: selected === c.key ? theme.colors.surface : 'transparent',
            },
          ]}>
          <Text
            style={{
              color: selected === c.key ? theme.colors.text : theme.colors.greyedOut,
              fontFamily: theme.fonts.regular,
            }}>
            {c.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create(() => ({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
    marginTop: 6,
  },
  button: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
}));
