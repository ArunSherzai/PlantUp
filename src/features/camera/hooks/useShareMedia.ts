import { useState, useCallback } from 'react';
import * as Sharing from 'expo-sharing';
import { showAlertDialog } from '~/services/appDialog';

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
        await showAlertDialog({
          title: 'Sharing not available',
          message: 'Sharing is not available on this device.',
          variant: 'warning',
        });
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
