import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { StyleSheet } from '~/lib/unistyles';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import { LinearGradient } from 'expo-linear-gradient';

export type EditorTool = 'filters' | 'adjust' | 'crop' | 'text';

type Props = {
  activeTool: EditorTool;
  onToolChange: (tool: EditorTool) => void;
};

const TOOLS: { id: EditorTool; icon: string; label: string }[] = [
  { id: 'filters', icon: 'wand-magic-sparkles', label: 'Filters' },
  { id: 'adjust', icon: 'sliders', label: 'Adjust' },
  { id: 'crop', icon: 'crop', label: 'Crop' },
  { id: 'text', icon: 'font', label: 'Text' },
];

export default function EditorToolbar({ activeTool, onToolChange }: Props) {
  return (
    <View style={styles.container}>
      {TOOLS.map(tool => {
        const isActive = activeTool === tool.id;
        return (
          <TouchableOpacity
            key={tool.id}
            style={styles.toolButton}
            onPress={() => onToolChange(tool.id)}
            activeOpacity={0.7}
          >
            {isActive ? (
              <LinearGradient
                colors={['#329D9C', '#00D988']}
                style={styles.activeBg}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <FontAwesome6 name={tool.icon} size={18} color="white" />
              </LinearGradient>
            ) : (
              <View style={styles.inactiveBg}>
                <FontAwesome6 name={tool.icon} size={18} color="rgba(255,255,255,0.5)" />
              </View>
            )}
            <Text style={[styles.label, isActive && styles.labelActive]}>
              {tool.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  toolButton: {
    alignItems: 'center',
    gap: 4,
  },
  activeBg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inactiveBg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  label: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 11,
    fontWeight: '600',
  },
  labelActive: {
    color: 'white',
    fontWeight: '700',
  },
});
