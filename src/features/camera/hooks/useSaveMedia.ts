import { useState, useCallback } from 'react';
import * as MediaLibrary from 'expo-media-library';
import { showAlertDialog } from '~/services/appDialog';

/**
 * Hook to save images to the device's photo gallery.
 */
export function useSaveMedia() {
  const [isSaving, setIsSaving] = useState(false);

  const saveToGallery = useCallback(async (uri: string): Promise<boolean> => {
    setIsSaving(true);
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        await showAlertDialog({
          title: 'Permission Required',
          message: 'Please allow access to save photos to your gallery.',
          variant: 'warning',
        });
        return false;
      }

      await MediaLibrary.saveToLibraryAsync(uri);
      await showAlertDialog({
        title: 'Saved!',
        message: 'Photo saved to your gallery.',
        variant: 'success',
      });
      return true;
    } catch (error) {
      console.error('[SaveMedia] Error saving:', error);
      await showAlertDialog({
        title: 'Error',
        message: 'Could not save the photo.',
        variant: 'error',
      });
      return false;
    } finally {
      setIsSaving(false);
    }
  }, []);

  return { saveToGallery, isSaving };
}
