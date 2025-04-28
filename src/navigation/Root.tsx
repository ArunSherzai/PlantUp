import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { useUnistyles } from 'react-native-unistyles';
import * as Linking from 'expo-linking';

import TabNavigator from './tab-navigator';
import Modal from '../screens/modal';
import Login from '~/screens/auth/Login';

export type RootStackParamList = {
  TabNavigator: undefined;
  Modal: undefined;
  Auth: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();

const linking = {
  prefixes: [Linking.createURL('/')], // automatically uses your scheme
  config: {
    screens: {
      Home: 'home',
      Profile: 'profile/:id', // example: myapp://profile/123
      // define more screens if needed
    },
  },
};

export default function RootStack() {
  const { theme } = useUnistyles();

  return (
    <NavigationContainer linking={linking}>
      <Stack.Navigator
        initialRouteName="Auth"
        screenOptions={{
          headerStyle: {
            backgroundColor: theme.colors.primary,
          },
          headerTitleStyle: {
            color: theme.colors.typography,
          },
          headerTintColor: theme.colors.typography,
        }}>
        <Stack.Screen
          name="TabNavigator"
          component={TabNavigator}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Modal"
          component={Modal}
          options={{ presentation: 'modal', headerLeft: () => null }}
        />

        <Stack.Screen name="Auth" component={Login} options={{ headerShown: false }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
