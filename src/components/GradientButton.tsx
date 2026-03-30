import React from 'react';
import { Text, TouchableOpacity, TouchableOpacityProps, TextStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@react-navigation/native';
import { StyleSheet, useUnistyles } from '~/lib/unistyles';
import { playSound, SoundType } from '~/utils/SoundManager';

interface GradientButtonProps extends TouchableOpacityProps {
  text: string;
  color1?: string;
  color2?: string;
  textStyle?: TextStyle;
  soundType?: SoundType | 'none';
}

export default function GradientButton({
  text,
  color1,
  color2,
  style,
  textStyle,
  soundType = 'click',
  onPress,
  ...props
}: GradientButtonProps) {
  const { theme } = useUnistyles();

  const gradientColors: [string, string] = color1 && color2
    ? [color1, color2]
    : [theme.colors.secondary, theme.colors.primary];

  const handlePress = (event: any) => {
    if (soundType !== 'none') {
      playSound(soundType);
    }
    onPress?.(event);
  };

  return (
    <TouchableOpacity activeOpacity={0.8} style={styles.container} onPress={handlePress} {...props}>
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[styles.button, style]}
      >
        <Text style={[styles.text, textStyle]}>{text}</Text>
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create((theme) => ({
  container: {
    width: '100%',
    alignItems: 'center',
  },
  button: {
    width: "70%",
    height: 50,
    borderRadius: theme.buttons.borderRadius,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
  },
  text: {
    fontSize: 12,
    fontWeight: 'bold',
    color: theme.colors.textDark,
    fontFamily: theme.fonts.regular,
  },
}));


