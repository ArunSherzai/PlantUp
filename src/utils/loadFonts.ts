import { Inter_600SemiBold } from '@expo-google-fonts/inter/600SemiBold';
import { Nunito_400Regular } from '@expo-google-fonts/nunito/400Regular';
import * as Font from 'expo-font';
import { useEffect, useState } from 'react';

const FONT_LOAD_TIMEOUT_MS = 1200;

export function useLoadFonts() {
  const [fontsLoaded, setFontsLoaded] = useState(false);

  useEffect(() => {
    let mounted = true;
    const fallbackTimer = setTimeout(() => {
      if (mounted) {
        setFontsLoaded(true);
      }
    }, FONT_LOAD_TIMEOUT_MS);

    async function load() {
      try {
        await Font.loadAsync({
          'Inter-SemiBold': Inter_600SemiBold,
          Inter: Inter_600SemiBold,
          'Nunito-Regular': Nunito_400Regular,
          Nunito: Nunito_400Regular,
        });

        if (mounted) {
          setFontsLoaded(true);
        }
      } catch (err) {
        console.warn('Font loading failed', err);
        if (mounted) {
          setFontsLoaded(true);
        }
      } finally {
        clearTimeout(fallbackTimer);
      }
    }

    load();

    return () => {
      mounted = false;
      clearTimeout(fallbackTimer);
    };
  }, []);

  return fontsLoaded;
}
