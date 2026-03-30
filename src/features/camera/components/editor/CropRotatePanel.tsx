import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { StyleSheet } from '~/lib/unistyles';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';

type Props = {
  rotation: number;
  flipH: boolean;
  flipV: boolean;
  onRotate: () => void;
  onFlipH: () => void;
  onFlipV: () => void;
  onReset: () => void;
};

export default function CropRotatePanel({
  rotation,
  flipH,
  flipV,
  onRotate,
  onFlipH,
  onFlipV,
  onReset,
}: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <ActionButton
          icon="rotate-right"
          label={`Rotate ${rotation}°`}
          onPress={onRotate}
          active={rotation !== 0}
        />
        <ActionButton
          icon="arrows-left-right"
          label="Flip H"
          onPress={onFlipH}
          active={flipH}
        />
        <ActionButton
          icon="arrows-up-down"
          label="Flip V"
          onPress={onFlipV}
          active={flipV}
        />
        <ActionButton
          icon="arrow-rotate-left"
          label="Reset"
          onPress={onReset}
          active={false}
        />
      </View>
    </View>
  );
}

function ActionButton({
  icon,
  label,
  onPress,
  active,
}: {
  icon: string;
  label: string;
  onPress: () => void;
  active: boolean;
}) {
  return (
    <TouchableOpacity style={styles.actionButton} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.iconCircle, active && styles.iconCircleActive]}>
        <FontAwesome6 name={icon} size={20} color={active ? '#00D988' : 'rgba(255,255,255,0.6)'} />
      </View>
      <Text style={[styles.label, active && styles.labelActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  actionButton: {
    alignItems: 'center',
    gap: 8,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  iconCircleActive: {
    borderColor: '#329D9C',
    backgroundColor: 'rgba(50, 157, 156, 0.15)',
  },
  label: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    fontWeight: '500',
  },
  labelActive: {
    color: '#00D988',
    fontWeight: '700',
  },
});
