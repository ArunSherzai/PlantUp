import { View, Text, Linking } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';
import { Alert, Button } from 'react-native';

import { supabase } from '~/utils/supabase';
export default function TabOneScreen() {
  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      console.log(error);
      Alert.alert('Fehler', 'Einloggen fehlgeschlagen: ' + error.message);
      return null;
    }

    return data.user;
  };

  const signUp = async (email: string, password: string, username: string) => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    console.log('Signup Response:', data, error);

    if (error) {
      console.log(error);
      Alert.alert('Fehler', 'Registrierung fehlgeschlagen: ' + error.message);
      return null;
    }

    const user = data.user;

    return user;
  };

  const handleLogin = async () => {
    // if (user) {
    //   console.log(user.id);
    //   // Insert into your own `users` table
    //   const result = await supabase
    //     .schema('user_schema')
    //     .from('Users')
    //     .update({ email: 'abdu200619@gmail.com', password: '12345678' })
    //     .eq('id', user.id);
    //   console.log(result);
    // }
    // if (user) {
    //   Alert.alert('Login Erfolgreich', 'Wilkommen zurück: ' + user.email);
    // }
  };
  return (
    <View style={styles.container}>
      <Text style={styles.inter}> Text with Inter</Text>
      <Text style={styles.nunito}>Text with nunito</Text>
      <Button title="Login" onPress={handleLogin} />
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  container: { backgroundColor: theme.colors.primary, flex: 1 },

  nunito: { fontFamily: theme.fonts.regular, fontSize: 18, color: 'red' },
  inter: { fontFamily: theme.fonts.header, fontSize: 20 },
}));
