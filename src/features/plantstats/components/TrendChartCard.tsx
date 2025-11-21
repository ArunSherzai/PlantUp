import { View, Text, TouchableOpacity } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { BarChart } from 'react-native-gifted-charts';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

export default function TrendChartCard({
  barData,
  maxY,
  selectedOptionLabel,
  setSelectedOptionLabel,
  barColor,
  setBarColor,
  isDropdownVisible,
  setDropdownVisible,
}: any) {
  const { theme } = useUnistyles();

  const options = [
    { label: 'Temperature', color: '#fdae11' },
    { label: 'Humidity', color: '#329d9c' },
    { label: 'Soil Moisture', color: '#22b261' },
    { label: 'Light', color: '#ffd700' },
    { label: 'EC', color: '#9b59b6' },
  ];

  return (
    <View style={[styles.card, { backgroundColor: theme.colors.background }]}>
      <View style={styles.headerRow}>
        <View>
          <Text style={[styles.title, { color: theme.colors.text }]}>Today&apos;s stats</Text>

          <Text style={[styles.subtitle, { color: theme.colors.greyedOut }]}>
            {selectedOptionLabel} • {barData.length} points
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.dropdownButton, { backgroundColor: theme.colors.surface }]}
          onPress={() => setDropdownVisible(!isDropdownVisible)}>
          <Text style={[styles.selectedLabel, { color: theme.colors.text }]}>
            {selectedOptionLabel}
          </Text>
          <Feather name="chevron-down" size={18} color={theme.colors.text} />
        </TouchableOpacity>
      </View>

      <View style={{ marginTop: 10 }}>
        <BarChart
          data={barData}
          height={200}
          barWidth={22}
          width={260}
          spacing={14}
          initialSpacing={10}
          maxValue={maxY + 5}
          barBorderRadius={8}
          hideRules
          xAxisThickness={0}
          yAxisThickness={0}
          xAxisLabelTextStyle={{ color: theme.colors.greyedOut }}
          yAxisTextStyle={{ color: theme.colors.greyedOut }}
        />
      </View>

      {isDropdownVisible && (
        <View style={[styles.dropdownMenu, { backgroundColor: theme.colors.background }]}>
          {options.map((o, i) => (
            <TouchableOpacity
              key={i}
              style={styles.dropdownItem}
              onPress={() => {
                setSelectedOptionLabel(o.label);
                setBarColor(o.color);
                setDropdownVisible(false);
              }}>
              <Text style={[styles.dropdownText, { color: theme.colors.text }]}>{o.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  card: {
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontFamily: theme.fonts.header,
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
    fontFamily: theme.fonts.regular,
  },
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  selectedLabel: {
    marginRight: 4,
    fontSize: 13,
    fontFamily: theme.fonts.regular,
  },
  dropdownMenu: {
    position: 'absolute',
    top: 48,
    right: 16,
    zIndex: 20,
    borderRadius: 12,
    paddingVertical: 5,
    elevation: 5,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 2 },
  },
  dropdownItem: {
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  dropdownText: {
    fontSize: 14,
    fontFamily: theme.fonts.regular,
  },
}));
