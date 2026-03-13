import { useState, useCallback } from 'react';
import * as Sharing from 'expo-sharing';
import { Alert } from 'react-native';

/**
 * Hook to share images via the native share sheet.
 */
export function useShareMedia() {
  const [isSharing, setIsSharing] = useState(false);

  const shareImage = useCallback(async (uri: string): Promise<void> => {
    setIsSharing(true);
    try {
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        Alert.alert('Sharing not available', 'Sharing is not available on this device.');
        return;
      }
      await Sharing.shareAsync(uri, {
        mimeType: 'image/jpeg',
        dialogTitle: 'Share your photo',
      });
    } catch (error) {
      console.error('[ShareMedia] Error sharing:', error);
    } finally {
      setIsSharing(false);
    }
  }, []);

  return { shareImage, isSharing };
}
