import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  Dimensions,
} from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { LinearGradient } from 'expo-linear-gradient';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  withSequence,
} from 'react-native-reanimated';
import type { CameraMode } from '../types';

const { width, height } = Dimensions.get('window');

type Props = {
  mode: CameraMode;
  onModeChange: (mode: CameraMode) => void;
  onShutterPress: () => void;
  onFlipCamera: () => void;
  onClose: () => void;
  onGalleryPress: () => void;
  isRecording: boolean;
  recordingDuration: number;
  lastPhotoUri?: string;
};

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export default function CameraOverlay({
  mode,
  onModeChange,
  onShutterPress,
  onFlipCamera,
  onClose,
  onGalleryPress,
  isRecording,
  recordingDuration,
  lastPhotoUri,
}: Props) {
  const { theme } = useUnistyles();

  // Pulsing animation for recording indicator
  const pulseScale = useSharedValue(1);

  React.useEffect(() => {
    if (isRecording) {
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.3, { duration: 600 }),
          withTiming(1, { duration: 600 })
        ),
        -1,
        true
      );
    } else {
      pulseScale.value = withTiming(1, { duration: 200 });
    }
  }, [isRecording]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  return (
    <View style={styles.overlay} pointerEvents="box-none">
      {/* TOP BAR */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.iconButton} onPress={onClose}>
          <FontAwesome6 name="xmark" size={22} color="white" />
        </TouchableOpacity>

        {/* Recording indicator */}
        {isRecording && (
          <View style={styles.recordingBadge}>
            <Animated.View style={[styles.recordingDot, pulseStyle]} />
            <Text style={styles.recordingText}>{formatDuration(recordingDuration)}</Text>
          </View>
        )}

        <TouchableOpacity style={styles.iconButton} onPress={onFlipCamera}>
          <FontAwesome6 name="camera-rotate" size={20} color="white" />
        </TouchableOpacity>
      </View>

      {/* BOTTOM CONTROLS — anchored to bottom */}
      <View style={styles.bottomSection}>
        {/* MODE TOGGLE */}
        <View style={styles.modeToggle}>
          <TouchableOpacity
            style={styles.modeButton}
            onPress={() => onModeChange('photo')}
            disabled={isRecording}
          >
            <Text style={[
              styles.modeText,
              mode === 'photo' && styles.modeTextActive,
            ]}>
              Photo
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.modeButton}
            onPress={() => onModeChange('video')}
            disabled={isRecording}
          >
            <Text style={[
              styles.modeText,
              mode === 'video' && styles.modeTextActive,
            ]}>
              Video
            </Text>
          </TouchableOpacity>
        </View>

        {/* Active mode indicator dot */}
        <View style={styles.modeIndicatorRow}>
          <View style={[
            styles.modeIndicatorDot,
            mode === 'photo' ? styles.modeIndicatorActive : styles.modeIndicatorInactive,
            { marginRight: 30 },
          ]} />
          <View style={[
            styles.modeIndicatorDot,
            mode === 'video' ? styles.modeIndicatorActive : styles.modeIndicatorInactive,
            { marginLeft: 30 },
          ]} />
        </View>

        {/* Shutter Row */}
        <View style={styles.bottomBar}>
          {/* Gallery Preview */}
          <TouchableOpacity style={styles.galleryButton} onPress={onGalleryPress}>
            {lastPhotoUri ? (
              <Image source={{ uri: lastPhotoUri }} style={styles.galleryImage} />
            ) : (
              <View style={styles.galleryPlaceholder}>
                <FontAwesome6 name="images" size={18} color="white" />
              </View>
            )}
          </TouchableOpacity>

          {/* Shutter Button */}
          <TouchableOpacity
            style={styles.shutterOuter}
            onPress={onShutterPress}
            activeOpacity={0.7}
          >
            {isRecording ? (
              <View style={styles.stopButton} />
            ) : mode === 'photo' ? (
              <LinearGradient
                colors={['#329D9C', '#00D988']}
                style={styles.shutterInner}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              />
            ) : (
              <View style={styles.recordButton} />
            )}
          </TouchableOpacity>

          {/* Spacer for symmetry */}
          <View style={styles.galleryButton}>
            <View style={styles.galleryPlaceholder} />
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create((theme: any) => ({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-start',
  },
  bottomSection: {
    marginTop: 'auto',
  },

  // Top Bar
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 8,
  },
  recordingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FF3B30',
  },
  recordingText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },

  // Bottom Bar
  bottomBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 30,
    paddingBottom: 40,
  },
  galleryButton: {
    width: 50,
    height: 50,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  galleryImage: {
    width: '100%',
    height: '100%',
  },
  galleryPlaceholder: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Shutter
  shutterOuter: {
    width: 78,
    height: 78,
    borderRadius: 39,
    borderWidth: 4,
    borderColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  shutterInner: {
    width: 62,
    height: 62,
    borderRadius: 31,
  },
  recordButton: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: '#FF3B30',
  },
  stopButton: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: '#FF3B30',
  },

  // Mode Toggle
  modeToggle: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 30,
    marginBottom: 6,
  },
  modeButton: {
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  modeText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 15,
    fontWeight: '600',
  },
  modeTextActive: {
    color: 'white',
    fontWeight: '800',
  },

  // Mode Indicator
  modeIndicatorRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 16,
  },
  modeIndicatorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  modeIndicatorActive: {
    backgroundColor: '#00D988',
  },
  modeIndicatorInactive: {
    backgroundColor: 'transparent',
  },
}));
