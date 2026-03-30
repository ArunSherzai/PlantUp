import React from 'react';
import { View, TouchableOpacity, Text } from 'react-native';
import { StyleSheet, useUnistyles } from '~/lib/unistyles';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDMStore } from '../stores/DMStore';

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
  const conversations = useDMStore((state) => state.conversations);

  // Calculate total unread count
  const totalUnread = conversations.reduce((sum, c) => sum + (c.unread_count || 0), 0);

  return (
    <View style={[styles.wrapper, { paddingBottom: insets.bottom }]}>
      <View style={styles.container}>
        {state.routes.map((route: (typeof state.routes)[number], index: number) => {
          const isFocused = state.index === index;
          const iconName = iconMap[route.name] || 'circle-question';
          const showBadge = route.name === 'DirectMessages' && totalUnread > 0;

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
            <TouchableOpacity key={route.key} onPress={onPress} style={styles.touchable} testID={route.name}>
              <View>
                <FontAwesome6
                  name={iconName}
                  size={24}
                  color={isFocused ? theme.colors.secondary : theme.colors.text}
                />
                {showBadge && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>
                      {totalUnread > 99 ? '99+' : totalUnread}
                    </Text>
                  </View>
                )}
              </View>
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
  badge: {
    position: 'absolute',
    top: -6,
    right: -10,
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
}));
