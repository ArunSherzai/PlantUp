import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { useUnistyles } from '~/lib/unistyles';
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
  NotificationSounds: undefined;
  Account: undefined;
  TutorialSettings: undefined;
  CreatePost: { capturedMedia?: any } | undefined;
  Camera: {
    mode?: 'photo' | 'video';
    source?: string;
    capturedMedia?: any;
    editedImageUri?: string;
  };
  PhotoEditor: { imageUri: string; source?: string };
  FeedPostDetail: { post: any }; // Using any to match Post interface roughly for now, or import it
  UserPlants: { userId?: string };
  Lootbox: { itemName: string; rewardId?: string; rewardType?: string };
  MessageDetail: { id: string; name: string; avatar: any; userId?: string };
  Connections: { initialTab: 'followers' | 'following'; userId?: string };
  PublicProfile: { userId: string };
  DirectMessages: undefined;
  BorderInventory: undefined;
  TitleInventory: undefined;
  PlantStats: { plantId: string; onlyShowSelected?: boolean };
  Plant3DTest: undefined;
  Shop: { initialTab?: 'shop' | 'inventory' };
  LinkSensor: { plantId?: string; onSensorSelected?: (sensor: { controllerRecordId: string; sensorBoxId: string; latestSeenAt: string }) => void } | undefined;

  DailyMentor: { plantId: string; health: any };
  PlantTimeline: { plantId: number };
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
import ShopScreen from '~/screens/Tab/shop/ShopScreen';
import SpriteComponent from '~/components/SpriteComponent';
import { View, ActivityIndicator } from 'react-native';
import { useUserStore } from '~/stores/UserStore';
import { db } from '~/utils/supabase';
import BorderInventoryScreen from '~/screens/Tab/profileScreen/BorderInventoryScreen';
import TitleInventoryScreen from '~/screens/Tab/profileScreen/TitleInventoryScreen';
import ShowPlantStats from '~/screens/Tab/plantStats/ShowPlantStats';
import AppearanceScreen from '~/screens/Tab/SettingsScreen/AppearanceScreen';
import NotificationsScreen from '~/screens/Tab/SettingsScreen/NotificationsScreen';
import NotificationSoundsScreen from '~/screens/Tab/SettingsScreen/NotificationSoundsScreen';
import AccountScreen from '~/screens/Tab/SettingsScreen/AccountScreen';
import TutorialSettingsScreen from '~/screens/Tab/SettingsScreen/TutorialSettingsScreen';
import Plant3DTestScreen from '~/screens/Tab/Plant3DTestScreen/Plant3DTestScreen';
import PlantTimelineScreen from '~/screens/Plants/timeline/PlantTimelineScreen'; // ALLES: added PlantTimelineScreen
import TutorialDialog from '~/components/TutorialDialog'; // ALLES: added TutorialDialog
import DailyMentorScreen from '~/screens/Tab/plantStats/DailyMentorScreen';
import { NotificationService } from '../services/NotificationService';
import { PushTokenService } from '../services/PushTokenService';
import { navigationRef, NavigationService } from '../services/NavigationService';
import React, { useEffect } from 'react';
import CameraScreen from '~/features/camera/CameraScreen';
import PhotoEditorScreen from '~/features/camera/components/editor/PhotoEditorScreen';
import LinkSensorScreen from '~/screens/Tab/linkSensor/LinkSensorScreen';

import { StatusBar } from 'expo-status-bar';

const AUTH_LOADING_TIMEOUT_MS = 1200;
const NOTIFICATION_INIT_DELAY_MS = 1800;

export default function RootStack() {
  const { theme } = useUnistyles();
  const { user, setUser } = useUserStore();
  const [isAuthLoading, setIsAuthLoading] = React.useState(true);
  const didInitNotifications = React.useRef(false);

  useEffect(() => {
    let cancelled = false;
    const loadingTimer = setTimeout(() => {
      if (!cancelled) {
        setIsAuthLoading(false);
      }
    }, AUTH_LOADING_TIMEOUT_MS);

    db.public.auth
      .getSession()
      .then(({ data: { session } }) => {
        if (cancelled) {
          return;
        }

        if (session?.user) {
          setUser(session.user);
          PushTokenService.register(session.user);
        } else {
          setUser(null);
        }
      })
      .catch((error) => {
        console.warn('[Root] Initial auth session check failed:', error);
      })
      .finally(() => {
        clearTimeout(loadingTimer);
        if (!cancelled) {
          setIsAuthLoading(false);
        }
      });

    const {
      data: { subscription },
    } = db.public.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user);
        PushTokenService.register(session.user);
      } else {
        setUser(null);
        PushTokenService.unregister();
      }
    });

    return () => {
      cancelled = true;
      clearTimeout(loadingTimer);
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!user || didInitNotifications.current) {
      return;
    }

    const initTimer = setTimeout(() => {
      didInitNotifications.current = true;
      NotificationService.initialize().catch((error) => {
        didInitNotifications.current = false;
        console.warn('[Root] Notification init failed:', error);
      });
    }, NOTIFICATION_INIT_DELAY_MS);

    return () => clearTimeout(initTimer);
  }, [user]);

  if (isAuthLoading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: theme.colors.background,
        }}>
        <ActivityIndicator size="large" color={theme.colors.accent} />
      </View>
    );
  }

  return (
    <NavigationContainer
      ref={navigationRef}
      linking={linking}
      onReady={() => {
        // If the app was opened via a notification tap before the navigator was ready,
        // replay the queued navigation request now.
        NavigationService.flushPendingNavigation();
      }}>
      <StatusBar hidden />
      <View style={{ flex: 1 }}>
        <Stack.Navigator
          initialRouteName={user ? 'TabNavigator' : 'Auth'}
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
          {user ? (
            <>
              <Stack.Group>
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
                  name="NotificationSounds"
                  component={NotificationSoundsScreen}
                  options={{ headerShown: false }}
                />
                <Stack.Screen
                  name="Account"
                  component={AccountScreen}
                  options={{ headerShown: false }}
                />
                <Stack.Screen
                  name="TutorialSettings"
                  component={TutorialSettingsScreen}
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
                <Stack.Screen name="Shop" component={ShopScreen} options={{ headerShown: false }} />

                <Stack.Screen
                  name="PlantStats"
                  component={ShowPlantStats}
                  options={{ headerShown: false }}
                />
                <Stack.Screen
                  name="PlantTimeline"
                  component={PlantTimelineScreen}
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
                <Stack.Screen
                  name="Plant3DTest"
                  component={Plant3DTestScreen}
                  options={{ headerShown: false }}
                />
                <Stack.Screen
                  name="DailyMentor"
                  component={DailyMentorScreen}
                  options={{ headerShown: false }}
                />
                <Stack.Screen
                  name="Camera"
                  component={CameraScreen}
                  options={{ headerShown: false, gestureEnabled: false }}
                />
                <Stack.Screen
                  name="PhotoEditor"
                  component={PhotoEditorScreen}
                  options={{ headerShown: false, gestureEnabled: false }}
                />
                <Stack.Screen
                  name="LinkSensor"
                  component={LinkSensorScreen}
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
                <Stack.Screen name="Lootbox" component={LootboxScreen} />
                {/* If you have other dialog-like screens, add them here */}
              </Stack.Group>
            </>
          ) : (
            <Stack.Screen name="Auth" component={AuthStack} options={{ headerShown: false }} />
          )}
        </Stack.Navigator>
        <SpriteComponent />
        <TutorialDialog />
      </View>
    </NavigationContainer>
  );
}
