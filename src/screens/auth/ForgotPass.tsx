import { View, Text } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { ForgotPassword } from '~/features/auth/api/auth';
import { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';

import FilledButton from '~/features/auth/components/FilledButton';
import GradientInput from '~/features/auth/components/GradientInput';

export default function ForgotPass() {
  const { theme } = useUnistyles();
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');

  const handleLogin = async () => {
    if (!validateEmail(email)) {
      setEmailError('Invalid email address');
      return;
    }
    setEmailError('');
    const result = await ForgotPassword(email);
    console.log(result);
  };

  const validateEmail = (email: string) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🌱PlantUp</Text>
      </View>

      <GradientInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor={theme.colors.text}
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        testID="Email"
      />
      {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}

      <View style={styles.buttonWrapper}>
        <FilledButton text="Send Mail" onPress={handleLogin} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create((theme) => ({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: '10%',
  },
  header: {
    height: '30%',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  title: {
    fontSize: 32,
    fontFamily: theme.fonts.header,
    color: theme.colors.text,
    textAlign: 'left',
  },
  input: {
    fontFamily: theme.fonts.regular,
    fontSize: 12,
    color: theme.colors.text,
    width: '100%',
    textAlign: 'left',
  },
  errorText: {
    color: 'red',
    fontSize: 10,
    marginBottom: 8,
    alignSelf: 'flex-start',
    paddingLeft: '12.5%',
  },
  buttonWrapper: {
    width: '100%',
    justifyContent: 'flex-end',
    alignItems: 'center',
    flex: 1,
    gap: 12,
    marginBottom: 40,
  },
}));
