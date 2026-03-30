import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { LineChart } from 'react-native-gifted-charts';
import { StyleSheet, useUnistyles } from '~/lib/unistyles';
import { vw, vh } from '~/features/plantlist/styles/plantStyles';

import { trendOptions } from '../api/options';

export default function TrendChartCard({
  barData,
  selectedOptionLabel,
  setSelectedOptionLabel,
  barColor,
  setBarColor,
}: any) {
  const { theme } = useUnistyles();
  const scrollRef = useRef<ScrollView | null>(null);

  const current = trendOptions.find((o) => o.label === selectedOptionLabel);
  const unit = current?.unit ?? '';
  const safeData = Array.isArray(barData) ? barData : [];

  const pointSlotWidth = vw * 12;
  const initialSpacing = pointSlotWidth * 0.45;
  const fixedAxisWidth = vw * 11;

  const chartData = safeData.map((point: any) => ({
    value: typeof point?.value === 'number' ? point.value : Number(point?.value) || 0,
    label: point?.label ?? '',
  }));

  const values = chartData
    .map((point: any) => point.value)
    .filter((value: number) => Number.isFinite(value));

  const currentValue = values.length ? values[values.length - 1] : null;
  const minValue = values.length ? Math.min(...values) : null;
  const maxValue = values.length ? Math.max(...values) : null;
  const avgValue = values.length
    ? values.reduce((sum: number, value: number) => sum + value, 0) / values.length
    : null;

  const yAxisConfigByMetric: Record<string, { maxValue: number; sections: number }> = {
    Temperature: { maxValue: 40, sections: 4 },
    Humidity: { maxValue: 100, sections: 4 },
    'Soil Moisture': { maxValue: 100, sections: 4 },
    Light: { maxValue: 1000, sections: 4 },
    EC: { maxValue: 3, sections: 3 },
  };

  const baseYAxisConfig =
    yAxisConfigByMetric[selectedOptionLabel] ?? { maxValue: 100, sections: 4 };
  const actualMaxValue = values.length ? Math.max(...values) : 0;
  const roundedLightMax =
    actualMaxValue <= 1000
      ? 1000
      : Math.ceil(actualMaxValue / 250) * 250;
  const yAxisConfig =
    selectedOptionLabel === 'Light'
      ? { ...baseYAxisConfig, maxValue: roundedLightMax }
      : baseYAxisConfig;
  const yAxisLabels = Array.from({ length: yAxisConfig.sections + 1 }, (_, index) => {
    const step = yAxisConfig.maxValue / yAxisConfig.sections;
    return Math.round((yAxisConfig.maxValue - step * index) * 10) / 10;
  });

  const chartWidth = Math.max(vw * 84, chartData.length * pointSlotWidth + initialSpacing * 2);

  const formatMetric = (value: number | null) =>
    value == null ? '--' : `${value.toFixed(value > 99 ? 0 : 1)}${unit ? ` ${unit}` : ''}`;

  useEffect(() => {
    const timeout = setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: false });
    }, 0);

    return () => clearTimeout(timeout);
  }, [selectedOptionLabel, chartWidth, chartData.length]);

  return (
    <View style={[styles.card, { backgroundColor: theme.colors.background }]}>
      <View style={styles.headerRow}>
        <View style={styles.titleWrap}>
          <Text style={[styles.title, { color: theme.colors.text }]}>Current trend</Text>
          <Text style={[styles.subtitle, { color: theme.colors.greyedOut }]}>
            {selectedOptionLabel} {unit ? `(${unit})` : ''} • {chartData.length} points
          </Text>
        </View>

        <View
          style={[
            styles.currentValueBadge,
            { backgroundColor: `${current?.color ?? barColor}18` },
          ]}>
          <Text style={[styles.currentValueText, { color: current?.color ?? barColor }]}>
            {formatMetric(currentValue)}
          </Text>
        </View>
      </View>

      <View style={styles.metricRow}>
        <View style={[styles.metricCard, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.metricLabel, { color: theme.colors.greyedOut }]}>Min</Text>
          <Text style={[styles.metricValue, { color: theme.colors.text }]}>
            {formatMetric(minValue)}
          </Text>
        </View>
        <View style={[styles.metricCard, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.metricLabel, { color: theme.colors.greyedOut }]}>Avg</Text>
          <Text style={[styles.metricValue, { color: theme.colors.text }]}>
            {formatMetric(avgValue)}
          </Text>
        </View>
        <View style={[styles.metricCard, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.metricLabel, { color: theme.colors.greyedOut }]}>Max</Text>
          <Text style={[styles.metricValue, { color: theme.colors.text }]}>
            {formatMetric(maxValue)}
          </Text>
        </View>
      </View>

      <View style={styles.iconRow}>
        {trendOptions.map((o, i) => (
          <TouchableOpacity
            key={i}
            style={[
              styles.iconButton,
              {
                backgroundColor:
                  selectedOptionLabel === o.label ? `${o.color}16` : theme.colors.surface,
                borderColor:
                  selectedOptionLabel === o.label ? o.color : `${theme.colors.greyedOut}55`,
              },
            ]}
            onPress={() => {
              setSelectedOptionLabel(o.label);
              setBarColor(o.color);
            }}>
            <Feather
              name={o.icon as any}
              size={vw * 4.4}
              color={selectedOptionLabel === o.label ? o.color : theme.colors.greyedOut}
            />
          </TouchableOpacity>
        ))}
      </View>

      {chartData.length > 0 ? (
        <View style={styles.chartSection}>
          <View style={[styles.fixedAxis, { width: fixedAxisWidth }]}>
            <View style={[styles.fixedAxisLabels, { height: vh * 21 }]}>
              {yAxisLabels.map((label, index) => (
                <Text
                  key={`${label}-${index}`}
                  style={[styles.fixedAxisText, { color: theme.colors.greyedOut }]}>
                  {label}
                </Text>
              ))}
            </View>
          </View>

          <ScrollView
            ref={scrollRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chartScrollContent}>
            <View style={[styles.chartWrap, { width: chartWidth }]}>
              <LineChart
                data={chartData}
                width={chartWidth}
                height={vh * 21}
                color={current?.color ?? barColor}
                thickness={3}
                curved
                hideDataPoints={false}
                dataPointsColor={current?.color ?? barColor}
                dataPointsRadius={3}
                hideRules={false}
                rulesColor={`${theme.colors.greyedOut}22`}
                yAxisThickness={0}
                yAxisLabelWidth={0}
                hideYAxisText
                xAxisThickness={1}
                xAxisColor={`${theme.colors.greyedOut}18`}
                noOfSections={yAxisConfig.sections}
                maxValue={yAxisConfig.maxValue}
                initialSpacing={initialSpacing}
                endSpacing={initialSpacing}
                spacing={pointSlotWidth}
                xAxisLabelTextStyle={{ color: 'transparent', fontSize: 1 }}
                xAxisLabelsHeight={8}
                color1={current?.color ?? barColor}
                startFillColor={`${current?.color ?? barColor}33`}
                endFillColor={`${current?.color ?? barColor}05`}
                startOpacity={0.28}
                endOpacity={0.04}
                areaChart
              />

              <View
                style={[
                  styles.customLabelRow,
                  {
                    paddingLeft: initialSpacing - pointSlotWidth / 2,
                    paddingRight: initialSpacing - pointSlotWidth / 2,
                  },
                ]}>
                {chartData.map((point: any, index: number) => (
                  <View
                    key={`${point.label}-${index}`}
                    style={[styles.customLabelCell, { width: pointSlotWidth }]}>
                    <View
                      style={[
                        styles.customTick,
                        { backgroundColor: `${current?.color ?? barColor}55` },
                      ]}
                    />
                    <Text style={[styles.customLabelText, { color: theme.colors.greyedOut }]}>
                      {point.label}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          </ScrollView>
        </View>
      ) : (
        <View style={[styles.emptyChart, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.emptyChartText, { color: theme.colors.greyedOut }]}>
            No sensor data in this time range.
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  card: {
    borderRadius: vw * 5,
    padding: vw * 4,
    marginBottom: vh * 1.7,
    elevation: 4,
    width: '100%',
    overflow: 'visible',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 12,
  },
  titleWrap: {
    flex: 1,
  },
  title: {
    fontSize: vw * 4.8,
    fontFamily: theme.fonts.header,
  },
  subtitle: {
    fontSize: vw * 3,
    fontFamily: theme.fonts.regular,
    marginTop: 2,
  },
  currentValueBadge: {
    minWidth: vw * 22,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  currentValueText: {
    fontSize: vw * 3.3,
    fontFamily: theme.fonts.header,
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  metricCard: {
    width: '31.5%',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 10,
  },
  metricLabel: {
    fontSize: vw * 2.8,
    fontFamily: theme.fonts.regular,
    marginBottom: 2,
  },
  metricValue: {
    fontSize: vw * 3.35,
    fontFamily: theme.fonts.header,
  },
  iconRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: vh * 1.6,
    width: '100%',
  },
  iconButton: {
    alignItems: 'center',
    paddingHorizontal: vw * 2,
    paddingVertical: vh * 0.8,
    borderRadius: vw * 2.8,
    borderWidth: 1,
    width: '18%',
    justifyContent: 'center',
  },
  chartSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  fixedAxis: {
    paddingTop: 8,
  },
  fixedAxisLabels: {
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 2,
  },
  fixedAxisText: {
    fontSize: vw * 2.6,
    fontFamily: theme.fonts.regular,
  },
  chartWrap: {
    paddingBottom: 4,
  },
  chartScrollContent: {
    paddingRight: 6,
  },
  customLabelRow: {
    flexDirection: 'row',
    marginTop: 8,
  },
  customLabelCell: {
    alignItems: 'center',
  },
  customTick: {
    width: 1,
    height: 10,
    marginBottom: 4,
  },
  customLabelText: {
    fontSize: vw * 2.7,
    fontFamily: theme.fonts.regular,
    textAlign: 'center',
  },
  emptyChart: {
    height: vh * 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  emptyChartText: {
    textAlign: 'center',
    fontSize: vw * 3.2,
    fontFamily: theme.fonts.regular,
  },
}));
