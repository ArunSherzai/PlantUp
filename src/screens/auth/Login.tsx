import { View, Text, TouchableOpacity } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { signIn } from '~/features/auth/api/auth';
import { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import FilledButton from '~/features/auth/components/FilledButton';
import GradientInput from '~/features/auth/components/GradientInput';
import { useNavigation } from '@react-navigation/native';
import { useUserStore } from '~/stores/UserStore';

export default function Login() {
  const { theme } = useUnistyles();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const navigation = useNavigation<any>();

  const handleLogin = async () => {
    if (!validateEmail(email)) {
      setEmailError('Invalid email address');
      setPasswordError('');
      return;
    }

    if (password.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      setEmailError('');
      return;
    }

    setEmailError('');
    setPasswordError('');

    const user = await signIn(email, password);
    if (user) {
      useUserStore.getState().setUser(user);
      navigation.replace('TabNavigator');
    }
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

      <View style={styles.passwordWrapper}>
        <GradientInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor={theme.colors.text}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          testID="Password"
        />
        {passwordError ? <Text style={styles.errorText}>{passwordError}</Text> : null}
        <TouchableOpacity
          style={styles.forgotButton}
          onPress={() => navigation.navigate('ForgotPass')}>
          <Text style={styles.greyedText}>Forgot Password?</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.buttonWrapper}>
        <FilledButton text="Login" onPress={handleLogin} testID="Login" />
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
  greyedText: {
    color: theme.colors.greyedOut,
    fontSize: 12,
    alignSelf: 'flex-end',
  },
  forgotButton: {
    width: '75%',
    alignItems: 'flex-end',
  },
  passwordWrapper: {
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
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
