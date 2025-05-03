import { View, Text, TouchableOpacity, TextInput } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { signIn, signUp } from '~/features/auth/api/auth';
import { useState } from 'react';

export default function Login() {
  const { theme } = useUnistyles();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState('');

  const handleLogin = async () => {
    if (!validateEmail(email)) {
      setEmailError('Invalid email address');
      return;
    }
    setEmailError('');
    const result = await signUp(email, password, 'Abudi');
    console.log(result);
  };

  const validateEmail = (email: string) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[theme.colors.secondary, theme.colors.primary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradientBorder}>
        <View style={styles.innerContent}>
          <TextInput
            style={styles.nunito}
            placeholder="Email"
            placeholderTextColor={theme.colors.text}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>
      </LinearGradient>
      {emailError ? <Text style={{ color: 'red', fontSize: 12 }}>{emailError}</Text> : null}
      <LinearGradient
        colors={[theme.colors.secondary, theme.colors.primary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradientBorder}>
        <View style={styles.innerContent}>
          <TextInput
            style={styles.nunito}
            placeholder="Password"
            placeholderTextColor={theme.colors.text}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
        </View>
      </LinearGradient>

      <TouchableOpacity activeOpacity={0.8} onPress={handleLogin}>
        <LinearGradient
          style={styles.button}
          locations={[0, 1]}
          colors={[theme.colors.secondary, theme.colors.primary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}>
          <Text style={styles.buttonText}>{'Login'}</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  gradientBorder: {
    padding: 4,
    borderRadius: 12,
    width: '80%',
    marginBottom: 10,
  },
  innerContent: {
    backgroundColor: theme.colors.background,
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
  },
  nunito: {
    fontFamily: theme.fonts.regular,
    fontSize: 18,
    color: theme.colors.text,
    width: '100%',
  },
  button: {
    margin: 30,
    width: 200,
    height: 60,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: theme.fonts.regular,
    fontWeight: 'bold',
  },
}));
