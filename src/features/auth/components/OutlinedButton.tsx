import { TouchableOpacity, View, TouchableOpacityProps } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useUnistyles, StyleSheet } from '~/lib/unistyles';
import GradientText from './GradientText'; // your gradient text component

interface OutlinedButtonProps extends TouchableOpacityProps {
  text: string;
}

export default function OutlinedButton({ text, ...touchableProps }: OutlinedButtonProps) {
  const { theme } = useUnistyles();

  return (
    <TouchableOpacity
      {...touchableProps}
      activeOpacity={0.9}
      style={[styles.container, touchableProps.style]}>
      <LinearGradient
        colors={[theme.colors.accent, theme.colors.secondary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradientBorder}>
        <View style={styles.innerContent}>
          <GradientText
            text={text}
            style={styles.text}
            colors={[theme.colors.secondary, theme.colors.accent]}
          />
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create((theme) => ({
  container: {
    width: '100%',
    alignItems: 'center',
  },
  gradientBorder: {
    padding: 2.5,
    borderRadius: 5,
    width: '70%',
  },
  innerContent: {
    backgroundColor: theme.colors.background,
    padding: 12,
    borderRadius: 5,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    fontSize: 12,
    fontWeight: 'bold',
    fontFamily: theme.fonts.regular,
  },
}));
