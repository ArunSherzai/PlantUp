import React, { useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  SafeAreaView,
  Image,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';

import { useNavigation } from '@react-navigation/native';
import { StackScreenProps } from '@react-navigation/stack';

import FilledButton from '~/features/auth/components/FilledButton';
import Feather from '@expo/vector-icons/Feather';
import { useFonts, Nunito_400Regular } from '@expo-google-fonts/nunito';

import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { PlantCard } from '~/features/plantlist/components/Plantcard';
import { usePlants } from '~/features/plantlist/hooks/usePlants';
import { vw, vh } from '../../../features/plantlist/styles/plantStyles';

export default function PlantListScreen() {
  const navigation = useNavigation<any>();

  // CORRECT UNISTYLES USAGE
  const { theme } = useUnistyles();
  const styles = stylesheet(theme);

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
    navigation.navigate('ShowPlantStats', {
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
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.colors.typography} />
        </View>
      </SafeAreaView>
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

        <View style={styles.headerContainer}>
          <Text style={styles.headerTitle}>View</Text>
          <Text style={styles.headerTitle}>your</Text>
          <Text style={styles.headerTitle}>Plants!</Text>
        </View>
      </View>

      {/* Bottom Sheet Container */}
      <View style={styles.staticSheetContainer}>
        <View style={styles.sheetContent}>
          <View style={styles.carouselContainer}>
            <FlatList
              onMomentumScrollEnd={(event) => {
                const index = Math.round(
                  event.nativeEvent.contentOffset.x / event.nativeEvent.layoutMeasurement.width
                );
                setActiveIndex(index);
              }}
              data={plants}
              keyExtractor={(item) => item.id}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              ItemSeparatorComponent={() => <View style={{ width: vw * 8 }} />}
              contentContainerStyle={{ paddingHorizontal: vw * 4 }}
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
          </View>

          <FilledButton style={{ marginTop: 120 }} text="+ Add Plant" onPress={handleAddPlant} />
        </View>
      </View>
    </View>
  );
}

/* --------------------------------------------------
   UNISTYLES STYLESHEET FACTORY
---------------------------------------------------- */
const stylesheet = (theme: any) =>
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
      height: '100%',
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
      top: 40,
      left: 20,
    },
    headerTitle: {
      fontSize: 48,
      fontWeight: 'bold',
      color: 'white',
    },
    staticSheetContainer: {
      position: 'absolute',
      bottom: 0,
      width: '100%',
      height: '65%',
      backgroundColor: theme.colors.surface,
      borderTopLeftRadius: 30,
      borderTopRightRadius: 30,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -3 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 5,
    },
    sheetContent: {
      flex: 1,
      paddingTop: 20,
      alignItems: 'center',
    },
    carouselContainer: {
      height: vh * 33,
      width: '100%',
    },
    emptyListContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      width: vw * 90,
    },
    emptyListText: {
      fontSize: 18,
      color: theme.colors.greyedOut,
    },
    paginationContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
    },
    dotSmall: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: theme.colors.greyedOut,
      marginHorizontal: 4,
    },
    dotSmallActive: {
      backgroundColor: theme.colors.primary,
      width: 10,
      height: 10,
      borderRadius: 5,
    },
  });
