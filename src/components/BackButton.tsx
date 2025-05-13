import React from 'react';
import { Text, TouchableOpacity, TouchableOpacityProps, TextStyle, ButtonProps } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@react-navigation/native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import { useNavigation } from '@react-navigation/native';

interface BackButtonProps extends TouchableOpacityProps{
  
}

export default function BackButton({
  style,
  ...props
} : BackButtonProps) {

    const { theme } = useUnistyles();
    const navigation = useNavigation();

  return (
    <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.8} style={[styles.container, style]} {...props}>
      <FontAwesome6 name="angle-left" size={24} style={styles.button} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create((theme) => ({
  container: {
      height: 40,
      width: "10%",
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 30,
    },
    button: {
      color: theme.colors.text
    },
}));

