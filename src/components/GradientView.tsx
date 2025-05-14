import React from 'react';
import { Text, TouchableOpacity, ViewProps, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@react-navigation/native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

interface GradientViewProps extends ViewProps {
  color1?: string;
  color2?: string;
  outerStyle?: ViewProps["style"]; 
  innerStyle?: ViewProps["style"];
}

export default function GradientView({
  color1,
  color2,
  outerStyle,
  innerStyle,
  children,
  ...props
}: GradientViewProps) {
  const { theme } = useUnistyles();

  const gradientColors: [string, string] = color1 && color2
    ? [color1, color2]
    : [theme.colors.secondary, theme.colors.primary];

  return (
    <LinearGradient
      colors={gradientColors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={[styles.gradientBorder, outerStyle]}
    >
      <View
        style={[
          styles.innerContainer,
          { borderRadius: theme.buttons.borderRadius },
          innerStyle,
        ]}
        {...props}
      >
        {children}
      </View>
    </LinearGradient>
  );
}


const styles = StyleSheet.create((theme) => ({
  gradientBorder: {
    padding: 3, 
    borderRadius: 8,
    width: "70%",
    height: 50,
    
  },
  innerContainer: {
    backgroundColor: theme.colors.background,
    width: '100%',
    height: '100%',
  },
}));
