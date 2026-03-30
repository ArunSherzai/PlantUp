import { View, Text, TouchableOpacity } from 'react-native';
import { useUnistyles, StyleSheet } from '~/lib/unistyles';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useEffect } from 'react';
import { checkSession, LoginViaGoogle, signOut } from '~/features/auth/api/auth';
import { AntDesign } from '@expo/vector-icons';
import { useUserStore } from '~/stores/UserStore';
import OutlinedButton from '~/features/auth/components/OutlinedButton';
import FilledButton from '~/features/auth/components/FilledButton';

export default function Welcome() {
  const { theme } = useUnistyles();
  const navigation = useNavigation<any>();

  useEffect(() => {
    const checkIfUserStillLoged = async () => {
      await signOut();
      const user = await checkSession();
      if (user) {
        navigation.replace('TabNavigator');
        useUserStore.getState().setUser(user);
      }
    };
    checkIfUserStillLoged();
  }, []);

  async function handleViaGoogle() {
    const user = await LoginViaGoogle();
    if (user) {
      useUserStore.getState().setUser(user);
      navigation.replace('TabNavigator');
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.title}>🌱</Text>
        <Text style={styles.title}>PlantUp</Text>
      </View>

      {/* GOOGLE LOGIN */}
      <View style={styles.googleContainer}>
        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.dividerLine} />
        </View>

        <TouchableOpacity
          activeOpacity={0.5}
          onPress={handleViaGoogle}
          style={styles.googleButton}
          testID="Google-Login">
          <AntDesign name="google" size={60} color={theme.colors.secondary} />
          {/*Feedback von Sebastian: lieber Text mit Logo "Log in with Google" statt nur Logo.
           Man weiß nicht dass es ein button ist*/}
        </TouchableOpacity>
      </View>

      {/* FOOTER BUTTONS */}
      <View style={styles.footer}>
        <FilledButton
          text="Start leveling"
          onPress={() => navigation.navigate('Register')}
          testID="SignUp"
        />
        <OutlinedButton
          text="Already have an Account?"
          onPress={() => navigation.navigate('Login')}
          testID="Already have an Account"
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create((theme) => ({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  header: {
    height: '30%',
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    width: '100%',
    paddingTop: 40,
  },
  title: {
    fontSize: 32,
    fontFamily: theme.fonts.header,
    color: theme.colors.text,
    textAlign: 'center',
  },
  footer: {
    width: '100%',
    alignItems: 'center',
    gap: 12,
    marginBottom: 40,
  },
  googleContainer: {
    width: '75%',
    marginBottom: 20,
    alignItems: 'center',
    flex: 1,
    flexDirection: 'column-reverse',
  },
  dividerRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    width: '90%',
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: theme.colors.greyedOut,
  },
  dividerText: {
    marginHorizontal: 8,
    fontSize: 12,
    color: theme.colors.greyedOut,
  },
  googleButton: {
    marginBottom: 16,
  },
}));
