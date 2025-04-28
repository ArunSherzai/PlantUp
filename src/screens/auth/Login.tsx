import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StyleSheet } from 'react-native-unistyles';

import { signIn, signUp } from '~/features/auth/api/auth';

export default function Login() {
  const handleLogin = async () => {
    const result = await signUp('abdu200619@gmail.com', '12345678', 'Abudi');
    console.log(result);
  };
  return (
    <View style={styles.container}>
      <Text style={styles.inter}> Text with Inter</Text>
      <Text style={styles.nunito}>Text with nunito</Text>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  container: { backgroundColor: 'white', justifyContent: 'center', alignItems: 'center', flex: 1 },

  nunito: { fontFamily: theme.fonts.regular, fontSize: 18, color: 'red' },
  inter: { fontFamily: theme.fonts.header, fontSize: 20 },
}));
