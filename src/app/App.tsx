import '../../unistyles';

import 'react-native-gesture-handler';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState, useCallback } from 'react';
import { View } from 'react-native';

import RootStack from '~/navigation/Root';
import { useLoadFonts } from '~/utils/loadFonts';
import * as Linking from 'expo-linking';

import { SystemBars } from 'react-native-edge-to-edge';
export default function App() {
  const fontsLoaded = useLoadFonts();
  const [appIsReady, setAppIsReady] = useState(false);

  useEffect(() => {
    if (fontsLoaded) {
      setAppIsReady(true);
    }
  }, [fontsLoaded]);

  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded) {
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <View onLayout={onLayoutRootView} style={{ flex: 1 }}>
      <SystemBars hidden />
      <RootStack />
    </View>
  );
}
