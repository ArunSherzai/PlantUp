import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { LinearGradient } from 'expo-linear-gradient';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import Video from 'react-native-video';
import type { CapturedMedia } from '../types';

const { width, height } = Dimensions.get('window');

type Props = {
  media: CapturedMedia;
  onRetake: () => void;
  onConfirm: () => void;
};

/**
 * Full-screen preview of captured photo/video.
 * Shows "Retake" and "Use [Photo|Video]" buttons.
 */
export default function MediaPreview({ media, onRetake, onConfirm }: Props) {
  const { theme } = useUnistyles();

  return (
    <View style={styles.container}>
      {/* Media Preview */}
      {media.type === 'image' ? (
        <Image
          source={{ uri: media.uri }}
          style={styles.media}
          resizeMode="contain"
        />
      ) : (
        <Video
          source={{ uri: media.uri }}
          style={styles.media}
          resizeMode="contain"
          repeat
          controls={false}
        />
      )}

      {/* Bottom Actions */}
      <View style={styles.actionsContainer}>
        <TouchableOpacity style={styles.retakeButton} onPress={onRetake}>
          <FontAwesome6 name="arrow-rotate-left" size={18} color="white" />
          <Text style={styles.retakeText}>Retake</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={onConfirm}>
          <LinearGradient
            colors={['#329D9C', '#00D988']}
            style={styles.confirmButton}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <FontAwesome6 name="check" size={18} color="white" />
            <Text style={styles.confirmText}>
              Use {media.type === 'image' ? 'Photo' : 'Video'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create((theme: any) => ({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  media: {
    flex: 1,
    width: '100%',
  },
  actionsContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 50,
    paddingTop: 20,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  retakeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  retakeText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  confirmButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 14,
  },
  confirmText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
}));
