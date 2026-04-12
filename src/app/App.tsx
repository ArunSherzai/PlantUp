import '../../unistyles';

import React, { useEffect } from 'react';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import RootStack from '~/navigation/Root';
import AppDialogHost from '~/components/AppDialogHost';
import { useLoadFonts } from '~/utils/loadFonts';
import { SoundManager } from '~/utils/SoundManager';

import { SystemBars } from 'react-native-edge-to-edge';
import { GlobalErrorBoundary } from '~/core/error/components/GlobalErrorBoundary';

const SOUND_INIT_DELAY_MS = 1500;

export default function App() {
  const fontsLoaded = useLoadFonts();

  useEffect(() => {
    const initTimer = setTimeout(() => {
      SoundManager.initialize();
    }, SOUND_INIT_DELAY_MS);

    return () => {
      clearTimeout(initTimer);
      SoundManager.cleanup();
    };
  }, []);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <GlobalErrorBoundary>
          <View style={{ flex: 1 }}>
            <SystemBars hidden />
            <RootStack />
            <AppDialogHost />
          </View>
        </GlobalErrorBoundary>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}
