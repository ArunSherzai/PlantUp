import React from 'react';
import { TextInput, TextInputProps, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useUnistyles, StyleSheet } from 'react-native-unistyles';

interface GradientInputProps extends TextInputProps {
  borderRadius?: number;
  colors?: [string, string];
}

const GradientInput: React.FC<GradientInputProps> = ({ borderRadius = 12, colors, ...props }) => {
  const { theme } = useUnistyles();
  const styles = createStyles(theme, borderRadius);

  const gradientColors = colors ?? [theme.colors.secondary, theme.colors.primary];

  return (
    <LinearGradient
      colors={gradientColors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.gradientBorder}>
      <View style={styles.innerContent}>
        <TextInput {...props} style={styles.input} placeholderTextColor={theme.colors.text} />
      </View>
    </LinearGradient>
  );
};

export default GradientInput;

const createStyles = (theme: any, borderRadius: number) =>
  StyleSheet.create({
    gradientBorder: {
      padding: 4,
      borderRadius,
      width: '75%',
      marginBottom: 10,
    },
    innerContent: {
      backgroundColor: theme.colors.background,
      padding: 16,
      borderRadius: borderRadius - 2,
      width: '100%',
    },
    input: {
      fontFamily: theme.fonts.regular,
      fontSize: 12,
      color: theme.colors.text,
      width: '100%',
    },
  });
