import { Appearance, Dimensions, StyleSheet as NativeStyleSheet } from 'react-native';
import { useSyncExternalStore } from 'react';

type ThemeMap = Record<string, any>;
type BreakpointMap = Record<string, number>;

type Config = {
  breakpoints: BreakpointMap;
  themes: ThemeMap;
  adaptiveThemes: boolean;
};

const listeners = new Set<() => void>();

const config: Config = {
  breakpoints: {},
  themes: {},
  adaptiveThemes: true,
};

let selectedThemeName: string | undefined;

const notify = () => {
  listeners.forEach((listener) => listener());
};

const getThemeNames = () => Object.keys(config.themes);

const getSystemThemeName = () => (Appearance.getColorScheme() === 'dark' ? 'dark' : 'light');

const resolveThemeName = () => {
  const names = getThemeNames();
  if (names.length === 0) {
    return 'light';
  }

  if (config.adaptiveThemes) {
    const systemTheme = getSystemThemeName();
    if (config.themes[systemTheme]) {
      return systemTheme;
    }
  }

  if (selectedThemeName && config.themes[selectedThemeName]) {
    return selectedThemeName;
  }

  return names[0];
};

const getTheme = () => config.themes[resolveThemeName()] ?? {};

const getBreakpoint = () => {
  const width = Dimensions.get('window').width;
  const entries = Object.entries(config.breakpoints).sort((a, b) => a[1] - b[1]);

  let active = entries[0]?.[0];
  for (const [name, minWidth] of entries) {
    if (width >= minWidth) {
      active = name;
    }
  }

  return active;
};

const getMiniRuntime = () => {
  const { width, height } = Dimensions.get('window');

  return {
    breakpoint: getBreakpoint(),
    colorScheme: getSystemThemeName(),
    fontScale: 1,
    hairlineWidth: NativeStyleSheet.hairlineWidth,
    insets: {
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
    },
    isLandscape: width > height,
    pixelRatio: 1,
    rtl: false,
    screen: {
      width,
      height,
    },
  };
};

const parseStylesheet = (stylesheet: any) =>
  typeof stylesheet === 'function' ? stylesheet(getTheme(), getMiniRuntime()) : stylesheet;

export const configureUnistyles = ({
  breakpoints,
  themes,
  adaptiveThemes,
}: {
  breakpoints: BreakpointMap;
  themes: ThemeMap;
  adaptiveThemes?: boolean;
}) => {
  config.breakpoints = breakpoints;
  config.themes = themes;
  config.adaptiveThemes = adaptiveThemes ?? true;

  if (!selectedThemeName || !config.themes[selectedThemeName]) {
    selectedThemeName = resolveThemeName();
  }

  notify();
};

Appearance.addChangeListener(() => {
  if (config.adaptiveThemes) {
    notify();
  }
});

export const useUnistyles = () => {
  useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    resolveThemeName,
    resolveThemeName
  );

  return {
    theme: getTheme(),
  };
};

export const useStyles = (stylesheet?: any) => {
  const { theme } = useUnistyles();

  return {
    breakpoint: getBreakpoint(),
    styles: stylesheet ? parseStylesheet(stylesheet) : undefined,
    theme,
  };
};

export const UnistylesRuntime = {
  get miniRuntime() {
    return getMiniRuntime();
  },
  get themeName() {
    return resolveThemeName();
  },
  getTheme(themeName?: string) {
    if (themeName && config.themes[themeName]) {
      return config.themes[themeName];
    }

    return getTheme();
  },
  setAdaptiveThemes(enabled: boolean) {
    config.adaptiveThemes = enabled;
    if (enabled) {
      selectedThemeName = getSystemThemeName();
    }
    notify();
    return true;
  },
  setTheme(name: string) {
    if (!config.themes[name]) {
      return;
    }
    selectedThemeName = name;
    config.adaptiveThemes = false;
    notify();
    return true;
  },
};

export const UnistylesRegistry = {
  addBreakpoints(breakpoints: BreakpointMap) {
    config.breakpoints = breakpoints;
    notify();
    return this;
  },
  addConfig(nextConfig: { adaptiveThemes?: boolean }) {
    if (typeof nextConfig.adaptiveThemes === 'boolean') {
      config.adaptiveThemes = nextConfig.adaptiveThemes;
    }
    notify();
    return this;
  },
  addThemes(themes: ThemeMap) {
    config.themes = themes;
    if (!selectedThemeName || !config.themes[selectedThemeName]) {
      selectedThemeName = resolveThemeName();
    }
    notify();
    return this;
  },
};

export const StyleSheet = {
  absoluteFill: NativeStyleSheet.absoluteFill,
  absoluteFillObject: NativeStyleSheet.absoluteFillObject,
  compose: NativeStyleSheet.compose,
  create(stylesheet: any) {
    const handler: ProxyHandler<Record<string, unknown>> = {
      get(_target, prop) {
        const styles = parseStylesheet(stylesheet) ?? {};
        return styles[prop as keyof typeof styles];
      },
      ownKeys() {
        return Reflect.ownKeys(parseStylesheet(stylesheet) ?? {});
      },
      getOwnPropertyDescriptor() {
        return {
          configurable: true,
          enumerable: true,
        };
      },
    };

    return new Proxy({}, handler);
  },
  flatten: NativeStyleSheet.flatten,
  hairlineWidth: NativeStyleSheet.hairlineWidth,
};

export const createStyleSheet = StyleSheet.create;

export const UnistylesProvider = ({ children }: { children: any }) => children;

export const useInitialTheme = () => undefined;
