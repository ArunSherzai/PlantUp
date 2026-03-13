import React, { useState } from 'react';
import { View, Text } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';
import Slider from '@react-native-community/slider';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import type { ImageAdjustments } from '../../types';

type Props = {
  adjustments: ImageAdjustments;
  onAdjustmentChange: (key: keyof ImageAdjustments, value: number) => void;
};

const SLIDERS: { key: keyof ImageAdjustments; label: string; icon: string }[] = [
  { key: 'brightness', label: 'Brightness', icon: 'sun' },
  { key: 'contrast', label: 'Contrast', icon: 'circle-half-stroke' },
  { key: 'saturation', label: 'Saturation', icon: 'palette' },
  { key: 'warmth', label: 'Warmth', icon: 'temperature-half' },
];

export default function AdjustmentPanel({ adjustments, onAdjustmentChange }: Props) {
  // Local state for live preview while dragging — only commit on release
  const [localValues, setLocalValues] = useState<Partial<Record<keyof ImageAdjustments, number>>>({});

  const getDisplayValue = (key: keyof ImageAdjustments) => {
    return localValues[key] !== undefined ? localValues[key]! : adjustments[key];
  };

  return (
    <View style={styles.container}>
      {SLIDERS.map(slider => (
        <View key={slider.key} style={styles.sliderRow}>
          <View style={styles.labelRow}>
            <FontAwesome6 name={slider.icon} size={14} color="rgba(255,255,255,0.7)" />
            <Text style={styles.label}>{slider.label}</Text>
            <Text style={styles.value}>{Math.round(getDisplayValue(slider.key))}</Text>
          </View>
          <Slider
            style={styles.slider}
            minimumValue={-100}
            maximumValue={100}
            value={adjustments[slider.key]}
            onValueChange={(val) => {
              // Update local display value only (no history push)
              setLocalValues(prev => ({ ...prev, [slider.key]: val }));
            }}
            onSlidingComplete={(val) => {
              // Commit to history on release
              setLocalValues(prev => {
                const next = { ...prev };
                delete next[slider.key];
                return next;
              });
              onAdjustmentChange(slider.key, Math.round(val));
            }}
            minimumTrackTintColor="#329D9C"
            maximumTrackTintColor="rgba(255,255,255,0.2)"
            thumbTintColor="#00D988"
            step={1}
          />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    gap: 4,
  },
  sliderRow: {
    gap: 2,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  label: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  value: {
    color: '#00D988',
    fontSize: 13,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    minWidth: 30,
    textAlign: 'right',
  },
  slider: {
    width: '100%',
    height: 32,
  },
});
