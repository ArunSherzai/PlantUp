import { View, Text, Linking } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';
import { Alert, Button } from 'react-native';

import { supabase } from '~/utils/supabase';
export default function TabOneScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.inter}>Text with Inter</Text>
      <Text style={styles.nunito}>Text with nunito</Text>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  container: { backgroundColor: theme.colors.background, flex: 1 },

  nunito: { fontFamily: theme.fonts.regular, fontSize: 18, color: 'red' },
  inter: { fontFamily: theme.fonts.header, fontSize: 20 },
}));
