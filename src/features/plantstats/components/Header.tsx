import { View, TouchableOpacity } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

export default function Header({ navigation, children }: any) {
  const { theme } = useUnistyles();

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.arrowIcon} onPress={() => navigation.goBack()}>
        <Feather name="arrow-left" size={24} color="white" />
      </TouchableOpacity>

      {children}
    </View>
  );
}

const styles = StyleSheet.create(() => ({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 40,
    zIndex: 30,
  },
  arrowIcon: {
    margin: 5,
  },
}));
