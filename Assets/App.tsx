import React from 'react';
import { useColorScheme } from 'react-native';
import { ThemeProvider } from 'styled-components/native';
import theme from './theme';
import darkTheme from './darkTheme';
import { Text, View } from 'react-native';

export default function App() {
  const scheme = useColorScheme();
  const currentTheme = scheme === 'dark' ? darkTheme : theme;

  return (
    <ThemeProvider theme={currentTheme}>
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: currentTheme.colors.background }}>
        <Text style={{ color: currentTheme.colors.text, fontFamily: currentTheme.fonts.header, fontSize: currentTheme.fontSizes.header }}>
          Hello Themed World!
        </Text>
      </View>
    </ThemeProvider>
  );
}
