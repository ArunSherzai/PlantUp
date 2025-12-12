import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// HIER ANPASSEN:
const iconMap: { [key: string]: keyof typeof FontAwesome6.glyphMap } = {
  PlantStats: 'chart-simple',
  CreatePost: 'circle-plus',
  Missions: 'list-check',
  'Show Plants': 'seedling',
  Profile: 'user-large',
  DirectMessages: 'envelope',
  Feed: 'house',
};

export default function NavigationBar({ state, descriptors, navigation }: any) {
  const { theme } = useUnistyles();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.wrapper, { paddingBottom: insets.bottom }]}>
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

// ... Styles bleiben gleich
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
