import React from 'react';
import { Text, TouchableOpacity, TouchableOpacityProps, TextStyle, ButtonProps } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@react-navigation/native';
import { StyleSheet, useUnistyles } from '~/lib/unistyles';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import { useNavigation } from '@react-navigation/native';

interface BackButtonProps extends TouchableOpacityProps {
  iconColor?: string;
}

export default function BackButton({
  style,
  iconColor,
  ...props
}: BackButtonProps) {

  const { theme } = useUnistyles();
  const navigation = useNavigation();

  return (
    <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.8} style={[styles.container, style]} {...props}>
      <FontAwesome6 name="angle-left" size={24} style={[styles.button, iconColor ? { color: iconColor } : {}]} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create((theme) => ({
  container: {
    height: 40,
    width: "20%",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 15,
  },
  button: {
    color: theme.colors.text
  },
}));

