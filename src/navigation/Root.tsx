import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { useUnistyles } from 'react-native-unistyles';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import TabNavigator from './tab-navigator';
import AddPlantScreen from '~/screens/Plants/addPlant/addPlant';
import SettingsScreen from '~/screens/Tab/SettingsScreen/SettingsScreen';
import AuthStack from './auth';

export type RootStackParamList = {
  TabNavigator: undefined;
  Modal: undefined;
  Auth: undefined;
  Index: undefined;
  'Add a Plant': undefined;
  Settings: undefined;
  CreatePost: undefined;
  FeedPostDetail: { post: any }; // Using any to match Post interface roughly for now, or import it
  UserPlants: { userId?: string };
  Lootbox: { itemName: string };
  MessageDetail: { id: string; name: string; avatar: any };
  Connections: { initialTab: 'followers' | 'following'; userId?: string };
  PublicProfile: { userId: string };
  DirectMessages: undefined;
  BorderInventory: undefined;
  TitleInventory: undefined;
  PlantStats: { plantId: string; onlyShowSelected?: boolean };
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
      PlantStats: 'plant-stats/:plantId',
    },
  },
};

import CreatePostScreen from '~/screens/Tab/createPostScreen/createPostScreen';
import FeedPostDetailScreen from '~/screens/Tab/Feed/FeedPostDetailScreen';
import UserPlantsScreen from '~/screens/Tab/profileScreen/UserPlantsScreen';
import LootboxScreen from '~/screens/Tab/profileScreen/LootboxScreen';
import MessageDetailScreen from '~/screens/Tab/directMessages/MessageDetailScreen';
import ConnectionsScreen from '../screens/Tab/profileScreen/ConnectionsScreen';
import PublicProfileScreen from '~/screens/Tab/profileScreen/PublicProfileScreen';
import DirectMessagesScreen from '~/screens/Tab/directMessages/DirectMessagesScreen';
import SpriteComponent from '~/components/SpriteComponent';
import { View } from 'react-native';
import BorderInventoryScreen from '~/screens/Tab/profileScreen/BorderInventoryScreen';
import TitleInventoryScreen from '~/screens/Tab/profileScreen/TitleInventoryScreen';
import ShowPlantStats from '~/screens/Tab/plantStats/ShowPlantStats';

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
            name="Settings"
            component={SettingsScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="CreatePost"
            component={CreatePostScreen}
            options={{
              headerShown: false,
              presentation: 'modal',
            }}
          />
          <Stack.Screen
            name="FeedPostDetail"
            component={FeedPostDetailScreen}
            options={{
              headerShown: false,
              // presentation: 'transparentModal', // Optional: if we want to see underlying feed, but standard stack is usually fine for "open new screen"
            }}
          />
          <Stack.Screen
            name="UserPlants"
            component={UserPlantsScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="Lootbox"
            component={LootboxScreen}
            options={{
              headerShown: false,
              presentation: 'transparentModal',
            }}
          />
          <Stack.Screen
            name="MessageDetail"
            component={MessageDetailScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="Connections"
            component={ConnectionsScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="PublicProfile"
            component={PublicProfileScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="DirectMessages"
            component={DirectMessagesScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="BorderInventory"
            component={BorderInventoryScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="TitleInventory"
            component={TitleInventoryScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="PlantStats"
            component={ShowPlantStats}
            options={{ headerShown: false }}
          />
        </Stack.Navigator>
        <SpriteComponent />
      </View>
    </NavigationContainer>
  );
}
