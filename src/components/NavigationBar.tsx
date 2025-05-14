import React from 'react';
import {
  Text,
  TouchableOpacity,
  TouchableOpacityProps,
  TextStyle,
  ButtonProps,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { NavigationProp, useTheme } from '@react-navigation/native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import { useNavigation } from '@react-navigation/native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRoute } from '@react-navigation/native';

export default function NavigationBar() {
  const { theme } = useUnistyles();
  type RootTabParamList = {
    'Show Plants': undefined;
    'Update Plant': undefined;
    'Add a Plant': undefined;
    Stats: undefined;
  };
  const navigation = useNavigation<NavigationProp<RootTabParamList>>();

  const route = useRoute();

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={() => navigation.navigate} style={styles.touchable}>
        <FontAwesome6 name="newspaper" size={24} color={styles.icon} />
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate} style={styles.touchable}>
        <FontAwesome6 name="message" size={24} color={styles.icon} />
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate} style={styles.touchable}>
        <FontAwesome6 name="house" size={24} color={styles.icon} />
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate('Show Plants')} style={styles.touchable}>
        <FontAwesome6
          name="seedling"
          size={24}
          color={route.name === 'Show Plants' ? styles.activeTouchable.color : theme.colors.text}
        />
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate} style={styles.touchable}>
        <FontAwesome6
          name="user-large"
          size={24}
          color={route.name === 'Add a Plant' ? styles.activeTouchable.color : theme.colors.text}
        />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  container: {
    height: 50,
    width: '100%',
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'space-around',
    flex: 1,
    flexDirection: 'row',
    padding: 5,
    borderRadius: 20,

    backgroundColor: theme.colors.background,

    //shadowColor: theme.colors.text,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,

    elevation: 6,
  },
  touchable: {},
  icon: {
    color: theme.colors.text,
  },
  activeTouchable: {
    color: 'green',
  },
}));
