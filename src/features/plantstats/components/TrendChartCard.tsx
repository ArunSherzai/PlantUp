import { View, Text, TouchableOpacity } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { BarChart } from 'react-native-gifted-charts';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { vw, vh } from '~/features/plantlist/styles/plantStyles';

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

  const BAR_WIDTH = vw * 7;
  const SPACING = vw * 3.5;

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
              size={vw * 5}
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
        height={vh * 25}
        spacing={SPACING}
        initialSpacing={vw * 2}
        maxValue={maxY + 2}
        barBorderRadius={vw * 2}
        barWidth={BAR_WIDTH}
        hideRules
        xAxisThickness={0}
        yAxisThickness={0}
        xAxisLabelTextStyle={{ color: theme.colors.text, fontSize: vw * 3 }}
        yAxisTextStyle={{ color: theme.colors.text, fontSize: vw * 3 }}
        noOfSections={5}
      />
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  card: {
    borderRadius: vw * 5,
    padding: vw * 4,
    marginBottom: vh * 1.5,
    elevation: 4,
    width: '100%',
    overflow: 'hidden',
  },
  headerRow: {
    marginBottom: vh * 0.5,
  },
  title: {
    fontSize: vw * 4.5,
    fontFamily: theme.fonts.header,
  },
  subtitle: {
    fontSize: vw * 3,
    fontFamily: theme.fonts.regular,
    marginTop: -2,
  },
  iconRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: vh * 1.5,
    width: '100%',
  },
  iconButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: vw * 2,
    paddingVertical: vh * 0.5,
    borderRadius: vw * 2.5,
    borderWidth: 1,
    width: '16%',
    justifyContent: 'center',
  },
}));
