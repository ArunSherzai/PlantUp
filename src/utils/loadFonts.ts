import {
  Inter_100Thin,
  Inter_200ExtraLight,
  Inter_300Light,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
  Inter_900Black,
} from '@expo-google-fonts/inter';
import {
  Nunito_200ExtraLight,
  Nunito_300Light,
  Nunito_400Regular,
  Nunito_500Medium,
  Nunito_600SemiBold,
  Nunito_700Bold,
  Nunito_800ExtraBold,
  Nunito_900Black,
} from '@expo-google-fonts/nunito';
import * as Font from 'expo-font';
import { useEffect, useState } from 'react';

export function useLoadFonts() {
  const [fontsLoaded, setFontsLoaded] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        await Font.loadAsync({
          // Inter font weights
          'Inter-Thin': Inter_100Thin,
          'Inter-ExtraLight': Inter_200ExtraLight,
          'Inter-Light': Inter_300Light,
          'Inter-Regular': Inter_400Regular,
          'Inter-Medium': Inter_500Medium,
          'Inter-SemiBold': Inter_600SemiBold,
          'Inter-Bold': Inter_700Bold,
          'Inter-ExtraBold': Inter_800ExtraBold,
          'Inter-Black': Inter_900Black,

          // Nunito font weights
          'Nunito-ExtraLight': Nunito_200ExtraLight,
          'Nunito-Light': Nunito_300Light,
          'Nunito-Regular': Nunito_400Regular,
          'Nunito-Medium': Nunito_500Medium,
          'Nunito-SemiBold': Nunito_600SemiBold,
          'Nunito-Bold': Nunito_700Bold,
          'Nunito-ExtraBold': Nunito_800ExtraBold,
          'Nunito-Black': Nunito_900Black,
        });

        setFontsLoaded(true);
      } catch (err) {
        console.warn('Font loading failed', err);
      }
    }

    load();
  }, []);

  return fontsLoaded;
}
