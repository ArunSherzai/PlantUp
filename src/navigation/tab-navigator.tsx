import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StackScreenProps } from '@react-navigation/stack';
import { useUnistyles } from 'react-native-unistyles';

import { RootStackParamList } from './Root';
import { HeaderButton } from '../components/HeaderButton';
import { TabBarIcon } from '../components/TabBarIcon';

import NavigationBar from '../components/NavigationBar';
import PlantListScreen from '~/screens/Tab/plantList/PlantListScreen';
// ALT: import AddPlantScreen from '~/screens/Plants/addPlant/addPlant';
// NEU: Importiere den neuen Screen (Pfad ggf. anpassen, wenn er woanders liegt!)
import CreatePostScreen from '~/screens/Tab/createPostScreen/createPostScreen';

import ShowMissionsScreen from '~/screens/Tab/showMissionsScreen/showMissionsScreen';
import ProfileScreen from '~/screens/Tab/profileScreen/profileScreen';
import ShowPlantStats from '~/screens/Tab/plantStats/ShowPlantStats';

const Tab = createBottomTabNavigator();

type Props = StackScreenProps<RootStackParamList, 'TabNavigator'>;

export default function TabLayout({ navigation }: Props) {
  const { theme } = useUnistyles();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        headerTitleStyle: {
          color: theme.colors.text,
        },
        tabBarActiveTintColor: theme.colors.accent,
        tabBarStyle: {
          backgroundColor: theme.colors.background,
          justifyContent: 'center',
          alignItems: 'center',
        },
      }}
      tabBar={(props) => <NavigationBar {...props} />}>
      <Tab.Screen
        name="PlantStats"
        component={ShowPlantStats}
        options={{
          title: 'Plant States',
          tabBarIcon: ({ color }) => <TabBarIcon name="code" color={color} />,
          headerRight: () => <HeaderButton onPress={() => navigation.navigate('Modal')} />,
        }}
      />

      {/* --- HIER GEÄNDERT: Create Post statt Add a Plant --- */}
      <Tab.Screen
        name="CreatePost"
        component={CreatePostScreen}
        options={{
          title: 'Create Post',
          headerShown: false,
          // Wir nutzen 'plus-circle' (FontAwesome Name), das passt gut
          tabBarIcon: ({ color }) => <TabBarIcon name="plus-circle" color={color} />,
        }}
      />
      {/* --------------------------------------------------- */}

      <Tab.Screen
        name="Missions"
        component={ShowMissionsScreen}
        options={{
          title: 'Missions',
          headerShown: false,
          tabBarIcon: ({ color }) => <TabBarIcon name="check-square" color={color} />,
        }}
      />

      <Tab.Screen
        name="Show Plants"
        component={PlantListScreen}
        options={{
          title: 'Show Plant List',
          headerShown: false,
          tabBarIcon: ({ color }) => <TabBarIcon name="code" color={color} />,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: 'Profile Screen',
          headerShown: false,
          tabBarIcon: ({ color }) => <TabBarIcon name="code" color={color} />,
        }}
      />
    </Tab.Navigator>
  );
}
