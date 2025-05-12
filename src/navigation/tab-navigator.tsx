import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StackScreenProps } from '@react-navigation/stack';
import { useUnistyles } from 'react-native-unistyles';

import { RootStackParamList } from './Root';
import { HeaderButton } from '../components/HeaderButton';
import { TabBarIcon } from '../components/TabBarIcon';
import One from '../screens/one';
import Two from '../screens/two';
import UpdatePlantScreen from '../screens/updatePlant/updatePlant';
import AddPlantScreen from '../screens/addPlant/addPlant';
import ShowPlantListScreen from '~/screens/ShowPlantList';
import UpdateDeviceScreen from '~/screens/updatePlant/updatePlant';

const Tab = createBottomTabNavigator();

type Props = StackScreenProps<RootStackParamList, 'TabNavigator'>;

export default function TabLayout({ navigation }: Props) {
  const { theme } = useUnistyles();

  return (
    <Tab.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: theme.colors.background,
        },
        headerTitleStyle: {
          color: theme.colors.text,
        },
        tabBarActiveTintColor: theme.colors.accent,
        tabBarStyle: {
          backgroundColor: theme.colors.background,
        },
      }}>
      <Tab.Screen
        name="One"
        component={One}
        options={{
          title: 'Tab One',
          tabBarIcon: ({ color }) => <TabBarIcon name="code" color={color} />,
          headerRight: () => <HeaderButton onPress={() => navigation.navigate('Modal')} />,
        }}
      />
      <Tab.Screen
        name="Two"
        component={Two}
        options={{
          title: 'Tab Two',
          tabBarIcon: ({ color }) => <TabBarIcon name="code" color={color} />,
        }}
      />
      <Tab.Screen
        name="Add Plant"
        component={ShowPlantListScreen}
        options={{
          title: 'Show Plant List',
          tabBarIcon: ({ color }) => <TabBarIcon name="code" color={color} />,
        }}
      />
      <Tab.Screen
        name="Update Plant"
        component={UpdatePlantScreen}
        options={{
          title: 'Update a Plant',
          headerShown: false,
          tabBarIcon: ({ color }) => <TabBarIcon name="code" color={color} />,
        }}
      />
      <Tab.Screen
        name="Add a Plant"
        component={AddPlantScreen}
        options={{
          title: 'Add a Plant',
          headerShown: false,
          tabBarIcon: ({ color }) => <TabBarIcon name="code" color={color} />,
        }}
      />
    </Tab.Navigator>
  );
}
