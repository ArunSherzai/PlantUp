export const lightTheme = {
  colors: {
    primary: '#25B45F',
    secondary: '#7EDDA0',
    accent: '#205072',
    background: '#FFFFFF',
    //lightBackground: '#CFF4D2',
    surface: '#FFFFFF',
    secondaryTint: '#EAF8EF',
    border: '#EEEEEE',
    typography: '#292D32',
    text: '#292D32',
    textDark: '#FFFFFF',
    greyedOut: '#BFC1C0',
    icon: '#292D32',
    gradient: ['#7EDDA0', '#25B45F'],
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
    color: '#292D32',
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
    primary: '#25B45F',
    secondary: '#7EDDA0',
    accent: '#205072',
    background: '#121212',
    // lightBackground: '#293033',
    surface: '#1E1E1E',
    secondaryTint: 'rgba(37, 180, 95, 0.14)',
    border: 'rgba(255,255,255,0.08)',
    typography: '#E4E6EB',
    text: '#E4E6EB',
    textDark: '#FFFFFF',
    greyedOut: '#5A5D5F',
    icon: '#E4E6EB',
    gradient: ['#7EDDA0', '#25B45F'],
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
