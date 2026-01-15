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
  Appearance: undefined;
  Notifications: undefined;
  Account: undefined;
  CreatePost: undefined;
  FeedPostDetail: { post: any }; // Using any to match Post interface roughly for now, or import it
  UserPlants: { userId?: string };
  Lootbox: { itemName: string; rewardId?: string; rewardType?: string; };
  MessageDetail: { id: string; name: string; avatar: any };
  Connections: { initialTab: 'followers' | 'following'; userId?: string };
  PublicProfile: { userId: string };
  DirectMessages: undefined;
  BorderInventory: undefined;
  TitleInventory: undefined;
  PlantStats: { plantId: string; onlyShowSelected?: boolean };
  Shop: { initialTab?: 'shop' | 'inventory' };
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
import AppearanceScreen from '~/screens/Tab/SettingsScreen/AppearanceScreen';
import NotificationsScreen from '~/screens/Tab/SettingsScreen/NotificationsScreen';
import AccountScreen from '~/screens/Tab/SettingsScreen/AccountScreen';
import ShopScreen from '~/screens/Tab/shop/ShopScreen';

import { StatusBar } from 'expo-status-bar';

export default function RootStack() {
  const { theme } = useUnistyles();

  return (
    <NavigationContainer linking={linking}>
      <StatusBar hidden />
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
          
          {/* STANDARD NAVIGATION FLOW */}
          <Stack.Group>
            <Stack.Screen name="Auth" component={AuthStack} options={{ headerShown: false }} />
            <Stack.Screen
              name="TabNavigator"
              component={TabNavigator}
              options={{ headerShown: false }}
            />

            <Stack.Screen
              name="Settings"
              component={SettingsScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="Appearance"
              component={AppearanceScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="Notifications"
              component={NotificationsScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="Account"
              component={AccountScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="FeedPostDetail"
              component={FeedPostDetailScreen}
              options={{
                headerShown: false,
              }}
            />
            <Stack.Screen
              name="UserPlants"
              component={UserPlantsScreen}
              options={{ headerShown: false }}
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
              name="PlantStats"
              component={ShowPlantStats}
              options={{ headerShown: false }}
            />

            <Stack.Screen
              name="Shop"
              component={ShopScreen}
              options={{ headerShown: false }}
            />

          </Stack.Group>

          {/* MODAL FLOWS (Slide up + Swipe to dismiss) */}
          <Stack.Group
            screenOptions={{
              presentation: 'modal',
              gestureEnabled: true, // Enables swipe to dismiss
            }}>
            <Stack.Screen
              name="CreatePost"
              component={CreatePostScreen}
              options={{
                headerShown: false,
              }}
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
              name="BorderInventory"
              component={BorderInventoryScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="TitleInventory"
              component={TitleInventoryScreen}
              options={{ headerShown: false }}
            />
          </Stack.Group>

          {/* TRANSPARENT OVERLAYS (Fade in/out) */}
          <Stack.Group
            screenOptions={{
              presentation: 'transparentModal',
              headerShown: false,
              // Manually force a fade transition for Android compatibility
              cardStyleInterpolator: ({ current: { progress } }) => ({
                cardStyle: {
                  opacity: progress,
                },
                overlayStyle: {
                  opacity: progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 0.5],
                    extrapolate: 'clamp',
                  }),
                },
              }),
            }}>
            <Stack.Screen
              name="Lootbox"
              component={LootboxScreen}
            />
            {/* If you have other dialog-like screens, add them here */}
          </Stack.Group>

        </Stack.Navigator>
        <SpriteComponent />
      </View>
    </NavigationContainer>
  );
}
