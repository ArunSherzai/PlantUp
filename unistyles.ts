import { configureUnistyles } from './src/lib/unistyles';

import { breakpoints } from './breakpoints';
import { lightTheme, darkTheme } from './theme';

type AppBreakpoints = typeof breakpoints;

type AppThemes = {
  light: typeof lightTheme;
  dark: typeof darkTheme;
};

declare module 'react-native-unistyles' {
  export interface UnistylesBreakpoints extends AppBreakpoints { }
  export interface UnistylesThemes extends AppThemes { }
}

configureUnistyles({
  breakpoints,
  themes: {
    light: lightTheme,
    dark: darkTheme,
  },
  adaptiveThemes: true,
});
