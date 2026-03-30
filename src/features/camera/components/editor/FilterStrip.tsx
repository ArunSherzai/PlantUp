import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image } from 'react-native';
import { StyleSheet } from '~/lib/unistyles';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import { LinearGradient } from 'expo-linear-gradient';
import { FILTER_PRESETS } from '../../filters/presets';
import type { ImageAdjustments } from '../../types';

type Props = {
  activeFilterId: string;
  onFilterSelect: (filterId: string, adjustments: ImageAdjustments) => void;
  imageUri: string;
};

/**
 * Horizontal scrollable filter strip with preset thumbnails.
 */
export default function FilterStrip({ activeFilterId, onFilterSelect, imageUri }: Props) {
  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {FILTER_PRESETS.map(filter => {
          const isActive = activeFilterId === filter.id;
          return (
            <TouchableOpacity
              key={filter.id}
              style={styles.filterItem}
              onPress={() => onFilterSelect(filter.id, filter.adjustments)}
              activeOpacity={0.7}
            >
              <View style={[styles.thumbnailContainer, isActive && styles.thumbnailActive]}>
                {isActive ? (
                  <LinearGradient
                    colors={['#329D9C', '#00D988']}
                    style={styles.thumbnailBorder}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <View style={styles.thumbnailInner}>
                      <Image
                        source={{ uri: imageUri }}
                        style={styles.thumbnail}
                        resizeMode="cover"
                      />
                      <FilterOverlays adjustments={filter.adjustments} />
                    </View>
                  </LinearGradient>
                ) : (
                  <View style={[styles.thumbnail, styles.thumbnailRound, { overflow: 'hidden' }]}>
                    <Image
                      source={{ uri: imageUri }}
                      style={styles.thumbnail}
                      resizeMode="cover"
                    />
                    <FilterOverlays adjustments={filter.adjustments} />
                  </View>
                )}
              </View>
              <Text style={[styles.filterName, isActive && styles.filterNameActive]}>
                {filter.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

/**
 * Returns absolute overlays based on the adjustments, matching PhotoEditorScreen.
 */
function FilterOverlays({ adjustments }: { adjustments: ImageAdjustments }) {
  const { brightness, contrast, saturation, warmth } = adjustments;
  const overlays: React.ReactNode[] = [];

  if (brightness !== 0) {
    overlays.push(
      <View
        key="brightness"
        style={[
          styles.overlay,
          {
            backgroundColor: brightness > 0 ? 'white' : 'black',
            opacity: Math.abs(brightness) / 200,
          },
        ]}
        pointerEvents="none"
      />
    );
  }

  if (warmth !== 0) {
    overlays.push(
      <View
        key="warmth"
        style={[
          styles.overlay,
          {
            backgroundColor: warmth > 0 ? 'rgba(255, 165, 0, 0.5)' : 'rgba(0, 100, 255, 0.5)',
            opacity: Math.abs(warmth) / 250,
          },
        ]}
        pointerEvents="none"
      />
    );
  }

  if (contrast !== 0) {
    overlays.push(
      <View
        key="contrast"
        style={[
          styles.overlay,
          {
            backgroundColor: contrast > 0 ? 'rgba(0,0,0,0.08)' : 'rgba(128,128,128,0.12)',
            opacity: Math.abs(contrast) / 150,
          },
        ]}
        pointerEvents="none"
      />
    );
  }

  return <>{overlays}</>;
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 10,
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 14,
  },
  filterItem: {
    alignItems: 'center',
    gap: 6,
  },
  thumbnailContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    overflow: 'hidden',
  },
  thumbnailActive: {
    // handled by gradient border
  },
  thumbnailBorder: {
    width: 64,
    height: 64,
    borderRadius: 32,
    padding: 3,
  },
  thumbnailInner: {
    flex: 1,
    borderRadius: 30,
    overflow: 'hidden',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  thumbnailRound: {
    borderRadius: 32,
  },
  filterName: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 11,
    fontWeight: '500',
  },
  filterNameActive: {
    color: 'white',
    fontWeight: '700',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  },
});
