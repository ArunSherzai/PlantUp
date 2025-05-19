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

// export default function NavigationBar({ state, descriptors, navigation }: any) {
//   const { theme } = useUnistyles();
//   type RootTabParamList = {
//     'Show Plants': undefined;
//     'Update Plant': undefined;
//     'Add a Plant': undefined;
//     Stats: undefined;
//   };

//   const route = useRoute();

//   return (
//     <View style={styles.wrapper}>
//       <View style={styles.container}>
//         <TouchableOpacity onPress={() => navigation.navigate} style={styles.touchable}>
//           <FontAwesome6 name="newspaper" size={24} color={styles.icon} />
//         </TouchableOpacity>

//         <TouchableOpacity onPress={() => navigation.navigate} style={styles.touchable}>
//           <FontAwesome6 name="message" size={24} color={styles.icon} />
//         </TouchableOpacity>

//         <TouchableOpacity onPress={() => navigation.navigate} style={styles.touchable}>
//           <FontAwesome6 name="house" size={24} color={styles.icon} />
//         </TouchableOpacity>

//         <TouchableOpacity
//           onPress={() => navigation.navigate('Show Plants')}
//           style={styles.touchable}>
//           <FontAwesome6
//             name="seedling"
//             size={24}
//             color={route.name === 'Show Plants' ? styles.activeTouchable.color : theme.colors.text}
//           />
//         </TouchableOpacity>

//         <TouchableOpacity onPress={() => navigation.navigate} style={styles.touchable}>
//           <FontAwesome6
//             name="user-large"
//             size={24}
//             color={route.name === 'Add a Plant' ? styles.activeTouchable.color : theme.colors.text}
//           />
//         </TouchableOpacity>
//       </View>
//     </View>
//   );
// }

// const styles = StyleSheet.create((theme) => ({
//   wrapper: {
//     backgroundColor: theme.colors.background,
//     width: '100%',
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   container: {
//     height: 70,
//     width: '95%',
//     alignItems: 'center',
//     justifyContent: 'space-around',
//     flexDirection: 'row',
//     padding: 5,
//     borderRadius: 20,
//     marginBottom: 10,
//     backgroundColor: theme.colors.background,

//     //shadowColor: theme.colors.text,
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 4 },
//     shadowOpacity: 0.1,
//     shadowRadius: 6,

//     elevation: 6,
//   },
//   touchable: {},
//   icon: {
//     color: theme.colors.text,
//   },
//   activeTouchable: {
//     color: 'green',
//   },
// }));

const iconMap: { [key: string]: keyof typeof FontAwesome6.glyphMap } = {
  One: 'newspaper',
  'Add a Plant': 'message',
  'Update Plant': 'house',
  'Show Plants': 'seedling',
  Stats: 'user-large',
};

export default function NavigationBar({ state, descriptors, navigation }: any) {
  const { theme } = useUnistyles();

  return (
    <View style={styles.wrapper}>
      <View style={styles.container}>
        {state.routes.map((route: (typeof state.routes)[number], index: number) => {
          const isFocused = state.index === index;
          const iconName = iconMap[route.name] || 'circle-question';

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <TouchableOpacity key={route.key} onPress={onPress} style={styles.touchable}>
              <FontAwesome6
                name={iconName}
                size={24}
                color={isFocused ? theme.colors.secondary : theme.colors.text}
              />
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  wrapper: {
    backgroundColor: theme.colors.background,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    height: 70,
    width: '95%',
    alignItems: 'center',
    justifyContent: 'space-around',
    flexDirection: 'row',
    padding: 5,
    borderRadius: 20,
    marginBottom: 10,
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
}));
