import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { useUnistyles } from 'react-native-unistyles';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import TabNavigator from './tab-navigator';
import AddPlantScreen from '~/screens/Plants/addPlant/addPlant';
import { View } from 'react-native';
import SpriteComponent from '~/components/SpriteComponent';
import AuthStack from './auth';

import DirectMessagesScreen from '~/screens/Tab/directMessages/DirectMessagesScreen';
import MessageDetailScreen from '~/screens/Tab/directMessages/MessageDetailScreen';

export type RootStackParamList = {
  TabNavigator: undefined;
  Modal: undefined;
  Auth: undefined;
  Index: undefined;
  'Add a Plant': undefined;
  DirectMessages: undefined;
  MessageDetail: { id: string; name: string; avatar: any };
};

const Stack = createStackNavigator<RootStackParamList>();
WebBrowser.maybeCompleteAuthSession();
const linking = {
  prefixes: [Linking.createURL('/')],
  config: {
    screens: {
      Auth: {
        path: 'TabNavigator',
        screens: {
          Login: 'login',
          ForgotPass: 'forgot-password',
          Register: 'register',
          Welcome: 'welcome',
          ResetPass: 'reset-password',
        },
      },
      TabNavigator: {
        path: 'app',
        // add tabs if needed
      },
      DirectMessages: 'messages',
      MessageDetail: 'message/:id',
    },
  },
};

export default function RootStack() {
  const { theme } = useUnistyles();

  return (
    <NavigationContainer linking={linking}>
      <View style={{ flex: 1 }}>
        <Stack.Navigator
          initialRouteName="Auth"
          screenOptions={{
            headerStyle: {
              backgroundColor: theme.colors.background,
            },
            headerTitleStyle: {
              color: theme.colors.text,
            },
            headerTintColor: theme.colors.accent,
          }}>
          <Stack.Screen name="Auth" component={AuthStack} options={{ headerShown: false }} />
          <Stack.Screen
            name="TabNavigator"
            component={TabNavigator}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="Add a Plant"
            component={AddPlantScreen}
            options={{
              title: 'Add a Plant',
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="DirectMessages"
            component={DirectMessagesScreen}
            options={{
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="MessageDetail"
            component={MessageDetailScreen}
            options={{
              headerShown: false,
            }}
          />
        </Stack.Navigator>
        <SpriteComponent />
      </View>
    </NavigationContainer>
  );
}
