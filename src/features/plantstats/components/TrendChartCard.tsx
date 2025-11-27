import { View, Text, TouchableOpacity } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { BarChart } from 'react-native-gifted-charts';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

// IMPORT SHARED OPTIONS
import { trendOptions } from '../api/options';

export default function TrendChartCard({
  barData,
  maxY,
  selectedOptionLabel,
  setSelectedOptionLabel,
  barColor,
  setBarColor,
}: any) {
  const { theme } = useUnistyles();

  // Find currently selected option
  const current = trendOptions.find((o) => o.label === selectedOptionLabel);

  const unit = current?.unit ?? '';
  const iconColor = current?.color ?? barColor;

  const BAR_WIDTH = 22;
  const SPACING = 14;

  return (
    <View style={[styles.card, { backgroundColor: theme.colors.background }]}>
      {/* HEADER */}
      <View style={styles.headerRow}>
        <Text style={[styles.title, { color: theme.colors.text }]}>Today's stats</Text>

        <Text style={[styles.subtitle, { color: theme.colors.greyedOut }]}>
          {selectedOptionLabel} {unit ? `(${unit})` : ''} • {barData.length} points
        </Text>
      </View>

      {/* ICON SELECTOR ROW */}
      <View style={styles.iconRow}>
        {trendOptions.map((o, i) => (
          <TouchableOpacity
            key={i}
            style={[
              styles.iconButton,
              {
                backgroundColor:
                  selectedOptionLabel === o.label ? theme.colors.surface : theme.colors.background,
                borderColor: selectedOptionLabel === o.label ? o.color : theme.colors.greyedOut,
              },
            ]}
            onPress={() => {
              setSelectedOptionLabel(o.label);
              setBarColor(o.color);
            }}>
            <Feather
              name={o.icon as any}
              size={20}
              color={selectedOptionLabel === o.label ? o.color : theme.colors.greyedOut}
            />
          </TouchableOpacity>
        ))}
      </View>

      {/* CHART */}
      <BarChart
        data={barData.reverse().map((b: any) => ({
          ...b,
          frontColor: barColor,
        }))}
        height={200}
        spacing={SPACING}
        initialSpacing={10}
        maxValue={maxY + 2}
        barBorderRadius={8}
        barWidth={30}
        hideRules
        xAxisThickness={0}
        yAxisThickness={0}
        xAxisLabelTextStyle={{ color: theme.colors.text }}
        yAxisTextStyle={{ color: theme.colors.text }}
        noOfSections={5}
      />
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  card: {
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    elevation: 4,
    width: '100%',
    overflow: 'hidden',
  },
  headerRow: {
    marginBottom: 4,
  },
  title: {
    fontSize: 18,
    fontFamily: theme.fonts.header,
  },
  subtitle: {
    fontSize: 12,
    fontFamily: theme.fonts.regular,
    marginTop: -2,
  },
  iconRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 10,
    width: '100%',
  },
  iconButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    width: '16%',
    justifyContent: 'center',
  },
}));
