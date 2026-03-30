import React, { useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  Image,
  FlatList,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { playSound } from '~/utils/SoundManager';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PlantCoinBox } from '~/components/PlantCoinBox';
import { useNavigation } from '@react-navigation/native';

import FilledButton from '~/features/auth/components/FilledButton';
import { useFonts, Nunito_400Regular } from '@expo-google-fonts/nunito';

import { StyleSheet, useUnistyles } from '~/lib/unistyles';

import { PlantCard } from '~/features/plantlist/components/Plantcard';
import { usePlants } from '~/features/plantlist/hooks/usePlants';
import { vw, vh } from '../../../features/plantlist/styles/plantStyles';

const { width, height } = Dimensions.get('window');
const heroHeight = Math.min(Math.max(height * 0.34, 230), 320);
const sheetRadius = Math.min(Math.max(width * 0.08, 26), 34);
const sheetOverlap = Math.min(Math.max(height * 0.03, 18), 30);
const sidePadding = Math.min(Math.max(width * 0.06, 20), 28);
const titleWidth = Math.min(width * 0.56, 250);

export default function PlantListScreen() {
  const navigation = useNavigation<any>();

  // CORRECT UNISTYLES USAGE
  const { theme } = useUnistyles();
  const insets = useSafeAreaInsets();
  const styles = stylesheet(theme, insets);

  const [actionMenuIndex, setActionMenuIndex] = useState<number | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const { plants, refreshPlants } = usePlants();
  const [fontsLoaded] = useFonts({ Nunito_400Regular });
  const [isLoading] = useState(false);

  useFocusEffect(
    useCallback(() => {
      refreshPlants();
    }, [])
  );

  const handleViewStats = (plantId: string) => {
    navigation.navigate('PlantStats', {
      plantId,
      onlyShowSelected: true,
    });
  };

  // ✅ FIXED NAVIGATION (Back to old behavior)
  const handleAddPlant = () => {
    navigation.navigate('Add a Plant');
  };

  if (!fontsLoaded) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={theme.colors.typography} />
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.colors.typography} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Background */}
      <View style={styles.headerBg}>
        <Image
          source={require('../../../../assets/images/PlantViewBackground.png')}
          style={styles.headerImage}
          resizeMode="cover"
        />
        <PlantCoinBox />
        <View style={[styles.headerContainer, { top: insets.top + heroHeight * 0.29 }]}>
          <Text
            style={styles.headerTitle}
            adjustsFontSizeToFit
            minimumFontScale={0.78}
            numberOfLines={2}>
            View Your{'\n'}Plants!
          </Text>
        </View>
      </View>

      {/* Bottom Sheet Container */}
      <View style={styles.staticSheetContainer}>
        <View style={styles.sheetContent}>
          <View style={styles.sheetHandle} />

          <View style={styles.sheetHeader}>
            <View>
              <Text style={styles.sheetTitle}>Your collection</Text>
              <Text style={styles.sheetSubtitle}>
                {plants.length === 0
                  ? 'Start with your first plant.'
                  : plants.length === 1
                    ? '1 plant in your care.'
                    : `${plants.length} plants in your care.`}
              </Text>
            </View>

            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{plants.length}</Text>
            </View>
          </View>

          <View style={styles.carouselContainer}>
            <FlatList
              onScroll={(event) => {
                const index = Math.round(
                  event.nativeEvent.contentOffset.x / event.nativeEvent.layoutMeasurement.width
                );
                // Only update if changed to avoid duplicate sounds if user scrolls a tiny bit and snap back
                if (index !== activeIndex) {
                  setActiveIndex(index);
                  playSound('swipe');
                }
              }}
              data={plants}
              keyExtractor={(item) => item.id}
              horizontal
              pagingEnabled
              decelerationRate="fast"
              showsHorizontalScrollIndicator={false}
              ItemSeparatorComponent={() => <View style={styles.cardGap} />}
              contentContainerStyle={styles.carouselContent}
              ListEmptyComponent={() => (
                <View style={styles.emptyListContainer}>
                  <Text style={styles.emptyListText}>You have no plants!</Text>
                </View>
              )}
              renderItem={({ item, index }) => (
                <PlantCard
                  item={item}
                  index={index}
                  onPress={() => handleViewStats(item.id)}
                  onActionPress={() =>
                    setActionMenuIndex((prev) => (prev === index ? null : index))
                  }
                  showActionText={actionMenuIndex === index}
                  refreshPlants={refreshPlants}
                />
              )}
            />

            {/* Dots */}
            {plants && plants.length > 0 && (
              <View style={styles.paginationContainer}>
                {plants.map((_, i) => (
                  <View
                    key={i}
                    style={[styles.dotSmall, activeIndex === i && styles.dotSmallActive]}
                  />
                ))}
              </View>
            )}

            {plants.length > 0 && (
              <Text style={styles.sheetHint}>Tap a card to open plant stats.</Text>
            )}
          </View>

          <View style={styles.ctaContainer}>
            <FilledButton style={styles.ctaButton} text="+ Add Plant" onPress={handleAddPlant} />
          </View>
        </View>
      </View>
    </View>
  );
}

/* --------------------------------------------------
   UNISTYLES STYLESHEET FACTORY
---------------------------------------------------- */
const stylesheet = (theme: any, insets: { bottom: number }) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    center: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    headerBg: {
      height: heroHeight,
      width: '100%',
      position: 'absolute',
      top: 0,
    },
    headerImage: {
      flex: 1,
      width: '100%',
      height: '100%',
    },
    headerContainer: {
      position: 'absolute',
      left: sidePadding,
      width: titleWidth,
    },
    headerTitle: {
      fontSize: Math.min(Math.max(width * 0.097, 34), 50),
      fontWeight: '900',
      lineHeight: Math.min(Math.max(width * 0.1, 38), 54),
      letterSpacing: -1.6,
      color: 'white',
      textShadowColor: 'rgba(0,0,0,0.18)',
      textShadowOffset: { width: 0, height: 3 },
      textShadowRadius: 10,
    },
    staticSheetContainer: {
      position: 'absolute',
      bottom: 0,
      width: '100%',
      top: heroHeight - sheetOverlap,
      backgroundColor: theme.colors.surface,
      borderTopLeftRadius: sheetRadius,
      borderTopRightRadius: sheetRadius,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -6 },
      shadowOpacity: 0.08,
      shadowRadius: 18,
      elevation: 12,
    },
    sheetContent: {
      flex: 1,
      paddingTop: Math.min(Math.max(height * 0.012, 8), 14),
      paddingHorizontal: sidePadding,
    },
    sheetHandle: {
      width: 46,
      height: 6,
      borderRadius: 999,
      backgroundColor: 'rgba(0,0,0,0.10)',
      alignSelf: 'center',
      marginBottom: 14,
    },
    sheetHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      marginBottom: 12,
    },
    sheetTitle: {
      fontSize: Math.min(Math.max(width * 0.052, 18), 24),
      fontWeight: '800',
      color: theme.colors.text,
      letterSpacing: -0.4,
    },
    sheetSubtitle: {
      marginTop: 4,
      fontSize: Math.min(Math.max(width * 0.032, 12), 14),
      color: theme.colors.greyedOut,
    },
    countBadge: {
      minWidth: 34,
      height: 34,
      paddingHorizontal: 10,
      borderRadius: 999,
      backgroundColor: `${theme.colors.primary}18`,
      alignItems: 'center',
      justifyContent: 'center',
    },
    countBadgeText: {
      fontSize: 14,
      fontWeight: '800',
      color: theme.colors.primary,
    },
    carouselContainer: {
      flex: 1,
      justifyContent: 'flex-start',
    },
    carouselContent: {
      paddingHorizontal: Math.max(width * 0.005, 2),
    },
    cardGap: {
      width: Math.min(Math.max(width * 0.04, 12), 18),
    },
    emptyListContainer: {
      width: width - sidePadding * 2,
      minHeight: Math.min(Math.max(height * 0.32, 260), 360),
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 24,
    },
    emptyListText: {
      fontSize: 18,
      color: theme.colors.greyedOut,
      textAlign: 'center',
    },
    paginationContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: 14,
    },
    dotSmall: {
      width: 7,
      height: 7,
      borderRadius: 999,
      backgroundColor: theme.colors.greyedOut,
      marginHorizontal: 5,
      opacity: 0.6,
    },
    dotSmallActive: {
      backgroundColor: theme.colors.primary,
      width: 18,
      height: 8,
      borderRadius: 999,
      opacity: 1,
    },
    sheetHint: {
      marginTop: 12,
      textAlign: 'center',
      fontSize: Math.min(Math.max(width * 0.03, 11), 13),
      color: theme.colors.greyedOut,
    },
    ctaContainer: {
      paddingTop: Math.min(Math.max(height * 0.02, 12), 18),
      paddingBottom: Math.min(Math.max(insets.bottom + 6, 14), 24),
    },
    ctaButton: {
      width: '100%',
      alignSelf: 'center',
    },
  });
