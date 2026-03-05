import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import * as MediaLibrary from 'expo-media-library';

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
        Alert.alert('Permission Required', 'Please allow access to save photos to your gallery.');
        return false;
      }

      await MediaLibrary.saveToLibraryAsync(uri);
      Alert.alert('Saved!', 'Photo saved to your gallery.');
      return true;
    } catch (error) {
      console.error('[SaveMedia] Error saving:', error);
      Alert.alert('Error', 'Could not save the photo.');
      return false;
    } finally {
      setIsSaving(false);
    }
  }, []);

  return { saveToGallery, isSaving };
}
