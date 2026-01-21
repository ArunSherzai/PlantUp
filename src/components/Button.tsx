import { forwardRef } from 'react';
import { Text, TouchableOpacity, TouchableOpacityProps, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';
import { playSound, SoundType } from '~/utils/SoundManager';

type ButtonProps = {
  title?: string;
  soundType?: SoundType | 'none';
} & TouchableOpacityProps;

export const Button = forwardRef<View, ButtonProps>(({ title, soundType = 'click', onPress, ...touchableProps }, ref) => {
  const handlePress = (event: any) => {
    if (soundType !== 'none') {
      playSound(soundType);
    }
    onPress?.(event);
  };

  return (
    <TouchableOpacity ref={ref} {...touchableProps} style={[styles.button, touchableProps.style]} onPress={handlePress}>
      <Text style={styles.buttonText}>{title}</Text>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create((theme) => ({
  button: {
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    borderRadius: 24,
    elevation: 5,
    flexDirection: 'row',
    justifyContent: 'center',
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      height: 2,
      width: 0,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  buttonText: {
    color: theme.colors.background,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
}));

