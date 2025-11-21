import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StackScreenProps } from '@react-navigation/stack';
import { useUnistyles } from 'react-native-unistyles';
import ShowMissionsScreen from '../screens/showMissionsScreen/showMissionsScreen';
import { RootStackParamList } from './Root';
import { HeaderButton } from '../components/HeaderButton';
import { TabBarIcon } from '../components/TabBarIcon';
import AddPlantScreen from '../screens/addPlant/addPlant';
import HomeScreen from '~/screens/homeScreen/homeScreen';
import PlantListScreen from '../screens/plantList/PlantListScreen';
import PlantStatsScreen from '~/screens/plantStats/ShowPlantStats';
import NavigationBar from '~/components/NavigationBar';
import ProfileScreen from '~/screens/profileScreen/profileScreen';

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
        component={PlantStatsScreen}
        options={{
          title: 'Plant States',
          tabBarIcon: ({ color }) => <TabBarIcon name="code" color={color} />,
          headerRight: () => <HeaderButton onPress={() => navigation.navigate('Modal')} />,
        }}
      />
      {/* 
      <Tab.Screen
        name="Two"
        component={Two}
        options={{
          title: 'Tab Two',
          tabBarIcon: ({ color }) => <TabBarIcon name="code" color={color} />,
        }} 
      />*/}
      <Tab.Screen
        name="Add a Plant"
        component={AddPlantScreen}
        options={{
          title: 'Add a Plant',
          headerShown: false,
          tabBarIcon: ({ color }) => <TabBarIcon name="code" color={color} />,
        }}
      />
      {/*
        <Tab.Screen
        name="Homescreen"
        component={HomeScreen}
        options={{
          title: 'Home',
          headerShown: false,
          tabBarIcon: ({ color }) => <TabBarIcon name="code" color={color} />,
        }}
      />
      */}
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
