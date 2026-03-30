import { View, Text, SafeAreaView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, useUnistyles } from '~/lib/unistyles';
import { useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

import { signUp } from '~/features/auth/api/auth';
import FilledButton from '~/features/auth/components/FilledButton';
import GradientInput from '~/features/auth/components/GradientInput';
import { AuthStackParamList } from '~/navigation/auth';

type RegisterScreenNavigationProp = StackNavigationProp<AuthStackParamList, 'Register'>;

export default function Register() {
  const { theme } = useUnistyles();
  const navigation = useNavigation<RegisterScreenNavigationProp>();

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [usernameError, setUsernameError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const validateEmail = (email: string) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  };

  const handleRegister = async () => {
    if (username.trim() === '') {
      setUsernameError('Username is required');
      setEmailError('');
      setPasswordError('');
      return;
    }

    if (!validateEmail(email)) {
      setUsernameError('');
      setEmailError('Invalid email address');
      setPasswordError('');
      return;
    }

    if (password.length < 6) {
      setUsernameError('');
      setEmailError('');
      setPasswordError('Password must be at least 6 characters');
      return;
    }

    // clear all errors
    setUsernameError('');
    setEmailError('');
    setPasswordError('');

    const result = await signUp(email, password, username);
    console.log(result);

    if (result) {
      navigation.navigate('Login');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🌱PlantUp</Text>
      </View>

      <GradientInput
        style={styles.input}
        placeholder="Username"
        placeholderTextColor={theme.colors.text}
        value={username}
        onChangeText={setUsername}
        testID="Username"
      />
      {usernameError ? <Text style={styles.errorText}>{usernameError}</Text> : null}

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

      <View
        style={{
          width: '100%',
          justifyContent: 'flex-end',
          alignItems: 'center',
          flex: 1,
          gap: 12,
          marginBottom: 40,
        }}>
        <FilledButton text="Register" onPress={handleRegister} />
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
}));
