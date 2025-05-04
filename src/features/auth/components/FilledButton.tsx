import { TouchableOpacity, Text, TouchableOpacityProps } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

interface FilledButtonProps extends TouchableOpacityProps {
  text: string;
}

export default function FilledButton({ text, ...props }: FilledButtonProps) {
  const { theme } = useUnistyles();

  return (
    <TouchableOpacity {...props} activeOpacity={0.9} style={[styles.container, props.style]}>
      <LinearGradient
        colors={[theme.colors.secondary, theme.colors.primary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.button}>
        <Text style={styles.text}>{text}</Text>
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
    width: '70%',
    height: 50,
    borderRadius: 5,
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
