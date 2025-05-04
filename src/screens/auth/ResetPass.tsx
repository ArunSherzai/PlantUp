import { View, Text } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { useEffect, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Linking from 'expo-linking';
import * as QueryParams from 'expo-auth-session/build/QueryParams';
import { supabase } from '~/utils/supabase';
import FilledButton from '~/features/auth/components/FilledButton';
import GradientInput from '~/features/auth/components/GradientInput';

export default function ResetPass() {
  const { theme } = useUnistyles();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const checkUrl = async () => {
      const initialUrl = await Linking.getInitialURL();

      if (initialUrl && initialUrl.includes('access_token')) {
        const { params } = QueryParams.getQueryParams(initialUrl);
        const { access_token, refresh_token } = params;

        if (access_token && refresh_token) {
          const { error } = await supabase.auth.setSession({
            access_token,
            refresh_token,
          });

          if (error) {
            console.error('Session restore failed:', error.message);
          } else {
            console.log('Session restored — user can now reset password');
          }
        }
      }
    };

    checkUrl();
  }, []);

  const handleUpdatePassword = async () => {
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setError('');

    const { error: updateError } = await supabase.auth.updateUser({
      password,
    });

    if (updateError) {
      console.error('Password update error:', updateError.message);
      setError(updateError.message);
    } else {
      console.log('Password updated successfully');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🌱PlantUp</Text>
      </View>

      <GradientInput
        style={styles.input}
        placeholder="New Password"
        placeholderTextColor={theme.colors.text}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        testID="NewPassword"
      />

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <View style={styles.buttonWrapper}>
        <FilledButton text="Update Password" onPress={handleUpdatePassword} />
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
