export const lightTheme = {
  colors: {
    primary: '#4FDA74',
    secondary: '#329D9C',
    accent: '#205072',
    background: '#FFFFFF',
    //lightBackground: '#CFF4D2',
    surface: '#FFFFFF',
    typography: '#FFFFFF',
    text: '#292D32',
    textDark: '#FFFFFF',
    greyedOut: '#BFC1C0',
    icon: '#FFFFFF',
    gradient: ['#329D9C', '#4FDA74'],
  },
  fonts: {
    regular: 'Nunito-Regular',
    header: 'Inter-SemiBold',
  },
  fontWeights: {
    regular: '400',
    bold: '700',
    extraBold: '800',
  },
  fontSizes: {
    small: 14,
    medium: 16,
    large: 20,
    header: 24,
    navigation: 18,
  },
  buttons: {
    borderRadius: 5,
  },
  icons: {
    color: '#FFFFFF',
    size: 24,
  },
  margins: {
    sm: 2,
    md: 4,
    lg: 8,
    xl: 12,
  },
} as const;

export const darkTheme = {
  colors: {
    primary: '#4FDA74',
    secondary: '#205072',
    accent: '#329D9C',
    background: '#111111',
    // lightBackground: '#293033',
    surface: '#2A2E33',
    typography: '#E4E6EB',
    text: '#E4E6EB',
    textDark: '#BFC1C0',
    greyedOut: '#5A5D5F',
    icon: '#E4E6EB',
    gradient: ['#205072', '#4FDA74'],
  },
  fonts: {
    regular: 'Nunito',
    header: 'Inter',
  },
  fontWeights: {
    regular: '400',
    bold: '700',
    extraBold: '800',
  },
  fontSizes: {
    small: 14,
    medium: 16,
    large: 20,
    header: 24,
    navigation: 18,
  },
  buttons: {
    borderRadius: 5,
  },
  icons: {
    color: '#E4E6EB',
    size: 24,
  },
  margins: {
    sm: 2,
    md: 4,
    lg: 8,
    xl: 12,
  },
} as const;
