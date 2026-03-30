import React from 'react';
import { Text, TextStyle, TouchableOpacity, TouchableOpacityProps } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@react-navigation/native';
import { StyleSheet, useUnistyles } from '~/lib/unistyles';

interface ThemeTextProps {
  text: string,
  textStyle?: TextStyle
}

export default function ThemeText({
  text,
  textStyle,
  ...props
}: ThemeTextProps) {
  return (
    <Text style={[styles.text, textStyle]}>{text}</Text>
  );
}

const styles = StyleSheet.create((theme) => ({
    text: {
      fontSize: 12,
      color: theme.colors.text,
      fontFamily: theme.fonts.regular,
    },
}));