import React, { useRef, useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
} from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { CameraView, CameraType } from 'expo-camera';
import { useNavigation, useRoute, CommonActions } from '@react-navigation/native';

/**
 * Helper: Navigate back to the source screen with data,
 * removing Camera from the navigation stack so "back" works correctly.
 */
function navigateBackWithMedia(navigation: any, source: string, capturedMedia: CapturedMedia) {
  navigation.dispatch((state: any) => {
    // Remove Camera from the route stack
    const routes = state.routes
      .filter((r: any) => r.name !== 'Camera')
      .map((r: any) => {
        if (r.name === source) {
          return { ...r, params: { ...r.params, capturedMedia } };
        }
        return r;
      });

    return CommonActions.reset({
      ...state,
      routes,
      index: routes.length - 1,
    });
  });
}

import * as ImagePicker from 'expo-image-picker';
import * as VideoThumbnails from 'expo-video-thumbnails';

import { useCameraPermissions } from './hooks/useCameraPermissions';
import { useCameraCapture } from './hooks/useCameraCapture';
import CameraOverlay from './components/CameraOverlay';
import MediaPreview from './components/MediaPreview';
import type { CameraMode, CapturedMedia } from './types';

/**
 * Full-screen reusable Camera Screen.
 *
 * Usage (from any screen):
 *   navigation.navigate('Camera', { mode: 'photo', source: 'createPost' });
 *
 * Returns captured media via navigation params:
 *   The calling screen reads `route.params.capturedMedia` on focus.
 */
export default function CameraScreen() {
  const { theme } = useUnistyles();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();

  // Read initial config from navigation params
  const initialMode: CameraMode = route.params?.mode || 'photo';
  const source: string = route.params?.source || 'unknown';

  const [mode, setMode] = useState<CameraMode>(initialMode);
  const [facing, setFacing] = useState<CameraType>('back');
  const cameraRef = useRef<CameraView | null>(null);

  // Hooks
  const {
    cameraGranted,
    micGranted,
    requestPermissions,
    openSettings,
    isLoading: permissionsLoading,
  } = useCameraPermissions();

  const {
    takePhoto,
    startRecording,
    stopRecording,
    isRecording,
    recordingDuration,
    capturedMedia,
    clearCapture,
  } = useCameraCapture(cameraRef);

  // Request permissions on mount
  useEffect(() => {
    requestPermissions(mode === 'video');
  }, []);

  // Request mic when switching to video mode
  useEffect(() => {
    if (mode === 'video') {
      requestPermissions(true);
    }
  }, [mode]);

  // --- HANDLERS ---

  const handleShutterPress = useCallback(async () => {
    if (mode === 'photo') {
      await takePhoto();
    } else {
      // Video mode: toggle recording
      if (isRecording) {
        stopRecording();
      } else {
        await startRecording();
      }
    }
  }, [mode, isRecording, takePhoto, startRecording, stopRecording]);

  const handleFlipCamera = useCallback(() => {
    setFacing(prev => (prev === 'back' ? 'front' : 'back'));
  }, []);

  const handleClose = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleGalleryPress = useCallback(async () => {
    // Open the device's media library as fallback
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: mode === 'video'
        ? ImagePicker.MediaTypeOptions.Videos
        : ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: true,
      videoMaxDuration: 60,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];

      let thumbnailUri: string | undefined;
      if (asset.type === 'video') {
        try {
          const thumb = await VideoThumbnails.getThumbnailAsync(asset.uri, { time: 0 });
          thumbnailUri = thumb.uri;
        } catch (e) {
          console.warn('[Camera] Gallery video thumbnail failed:', e);
        }
      }

      // Return the selected media and remove Camera from stack
      navigateBackWithMedia(navigation, source, {
        uri: asset.uri,
        type: asset.type === 'video' ? 'video' : 'image',
        mimeType: asset.mimeType || (asset.type === 'video' ? 'video/mp4' : 'image/jpeg'),
        fileName: asset.fileName || `gallery_${Date.now()}.${asset.type === 'video' ? 'mp4' : 'jpg'}`,
        width: asset.width,
        height: asset.height,
        thumbnailUri,
      });
    }
  }, [mode, navigation, source]);

  const handleRetake = useCallback(() => {
    clearCapture();
  }, [clearCapture]);

  const handleConfirm = useCallback(() => {
    if (!capturedMedia) return;

    // Navigate back to the calling screen and remove Camera from stack
    navigateBackWithMedia(navigation, source, capturedMedia);
  }, [capturedMedia, navigation, source]);

  // --- RENDER ---

  // Show captured preview
  if (capturedMedia) {
    return (
      <MediaPreview
        media={capturedMedia}
        onRetake={handleRetake}
        onConfirm={handleConfirm}
      />
    );
  }

  // Permissions loading or denied
  if (permissionsLoading) {
    return (
      <View style={styles.centeredContainer}>
        <ActivityIndicator size="large" color="#329D9C" />
        <Text style={styles.statusText}>Setting up camera...</Text>
      </View>
    );
  }

  if (!cameraGranted) {
    return (
      <View style={styles.centeredContainer}>
        <Text style={styles.statusText}>Camera access is required</Text>
        <Text style={[styles.statusText, { fontSize: 14, marginTop: 8, opacity: 0.6 }]}>
          Please enable camera access in your device settings.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing={facing}
        mode={mode === 'video' ? 'video' : 'picture'}
      />
      <CameraOverlay
        mode={mode}
        onModeChange={setMode}
        onShutterPress={handleShutterPress}
        onFlipCamera={handleFlipCamera}
        onClose={handleClose}
        onGalleryPress={handleGalleryPress}
        isRecording={isRecording}
        recordingDuration={recordingDuration}
      />
    </View>
  );
}

const styles = StyleSheet.create((theme: any) => ({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  camera: {
    flex: 1,
  },
  centeredContainer: {
    flex: 1,
    backgroundColor: 'black',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  statusText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 16,
  },
}));
