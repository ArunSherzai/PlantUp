import React from 'react';
import {
  BarChart,
  LineChart,
  PieChart,
  PopulationPyramid,
  RadarChart,
} from 'react-native-gifted-charts';
import { useUnistyles } from 'react-native-unistyles';

type ChartType = 'bar' | 'line' | 'area' | 'horizontal' | 'pie' | 'donut' | 'radar' | 'pyramid';

interface UnifiedChartProps {
  type: String;
  data: any[]; // we allow flexibility, since each chart accepts different shapes
  height?: number;
  width?: number;
}

export default function UnifiedChart({ type, data, height = 180, width = 260 }: UnifiedChartProps) {
  const { theme } = useUnistyles();

  // --- Normalized values for charts that need {value,label} ---
  const normalized = data.map((d: any, i: number) => ({
    value: typeof d.value === 'number' ? d.value : Number(d) || 0,
    label: d.label ?? '',
    frontColor: d.frontColor ?? theme.colors.primary,
  }));

  const maxValue = normalized.length ? Math.max(...normalized.map((d) => d.value)) : 1;

  const minValue = normalized.length ? Math.min(...normalized.map((d) => d.value)) : 0;

  // spacing auto-fit
  const spacing = Math.max(8, width / (normalized.length + 2));

  const baseProps = {
    data: normalized,
    height,
    width,
    spacing,
    initialSpacing: 12,
    maxValue: maxValue + maxValue * 0.2,
    minValue: Math.min(0, minValue),
    barBorderRadius: 6,
    hideRules: true,
    xAxisThickness: 0,
    yAxisThickness: 0,
    yAxisTextStyle: { color: theme.colors.greyedOut },
    xAxisLabelTextStyle: { color: theme.colors.greyedOut, fontSize: 10 },
    disableScroll: true,
  };

  // --- CHART TYPE SWITCH ---
  switch (type) {
    case 'bar':
      return <BarChart {...baseProps} barWidth={18} frontColor={theme.colors.primary} />;

    case 'horizontal':
      return <BarChart {...baseProps} horizontal barWidth={14} frontColor={theme.colors.primary} />;

    case 'line':
      return <LineChart {...baseProps} color={theme.colors.primary} thickness={3} curved />;

    case 'area':
      return (
        <LineChart
          {...baseProps}
          color={theme.colors.primary}
          thickness={3}
          curved
          areaChart
          startFillColor={theme.colors.primary}
          endFillColor={theme.colors.background}
          startOpacity={0.4}
          endOpacity={0}
        />
      );

    case 'pie':
      return <PieChart data={data} radius={height / 2} showText />;

    case 'donut':
      return <PieChart data={data} radius={height / 2} donut innerRadius={height / 4} showText />;

    case 'radar':
      return (
        <RadarChart data={normalized.map((d) => d.value)} maxValue={maxValue} noOfSections={5} />
      );

    case 'pyramid':
      return (
        <PopulationPyramid
          data={data.map((d: any) => ({
            left: d.left,
            right: d.right,
            leftColor: theme.colors.primary,
            rightColor: theme.colors.accent,
          }))}
          height={height}
        />
      );

    default:
      return null;
  }
}
