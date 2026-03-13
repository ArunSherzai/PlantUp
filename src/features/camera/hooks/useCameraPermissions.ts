import { useEffect, useState, useCallback } from 'react';
import { Alert, Linking } from 'react-native';
import { useCameraPermissions as useExpoCameraPermissions, useMicrophonePermissions } from 'expo-camera';

/**
 * Hook to manage camera and microphone permissions.
 * Handles requesting, checking, and deep-linking to settings.
 */
export function useCameraPermissions() {
  const [cameraPermission, requestCameraPermission] = useExpoCameraPermissions();
  const [micPermission, requestMicPermission] = useMicrophonePermissions();

  const cameraGranted = cameraPermission?.granted ?? false;
  const micGranted = micPermission?.granted ?? false;

  const openSettings = useCallback(() => {
    Alert.alert(
      'Permission Required',
      'Camera access is needed. Please enable it in your device settings.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Open Settings', onPress: () => Linking.openSettings() },
      ]
    );
  }, []);

  const requestPermissions = useCallback(async (needsMic: boolean = false) => {
    // 1. Camera permission
    if (!cameraPermission?.granted) {
      const result = await requestCameraPermission();
      if (!result.granted) {
        if (!result.canAskAgain) {
          openSettings();
        }
        return false;
      }
    }

    // 2. Microphone permission (only for video mode)
    if (needsMic && !micPermission?.granted) {
      const result = await requestMicPermission();
      // Don't block on mic denial — just record without audio
      if (!result.granted) {
        console.warn('[Camera] Microphone permission denied. Video will record without audio.');
      }
    }

    return true;
  }, [cameraPermission, micPermission, requestCameraPermission, requestMicPermission, openSettings]);

  return {
    cameraGranted,
    micGranted,
    requestPermissions,
    openSettings,
    isLoading: !cameraPermission,
  };
}
