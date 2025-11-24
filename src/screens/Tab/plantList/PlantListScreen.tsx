import React, { useState, useEffect } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  SafeAreaView,
  ImageBackground,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import FilledButton from '~/features/auth/components/FilledButton';
import Feather from '@expo/vector-icons/Feather';

import { useFonts, Nunito_400Regular } from '@expo-google-fonts/nunito';

import { PlantCard } from '~/features/plantlist/components/Plantcard';
import { usePlants } from '~/features/plantlist/hooks/usePlants';

import { styles, vw, vh } from '../../../features/plantlist/styles/plantStyles';

export default function PlantListScreen() {
  const navigation = useNavigation<any>();
  const [actionMenuIndex, setActionMenuIndex] = useState<number | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const { plants, refreshPlants } = usePlants();

  const [fontsLoaded] = useFonts({ Nunito_400Regular });

  const [isLoading, setIsLoading] = useState(true);
  useFocusEffect(
    React.useCallback(() => {
      setIsLoading(true);

      const timer = setTimeout(() => {
        setIsLoading(false);
      }, 500);

      refreshPlants();

      return () => clearTimeout(timer);
    }, [])
  );

  // 📝 NEW HANDLER: Navigate to ShowPlantStats with the selected plant ID and a flag
  const handleViewStats = (plantId: string) => {
    navigation.navigate('ShowPlantStats', { plantId: plantId, onlyShowSelected: true });
  };

  // font loading
  if (!fontsLoaded) {
    return (
      <View style={styles.center}>
        <Text>Loading...</Text>
      </View>
    );
  }

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="black" />
        </View>
      </SafeAreaView>
    );
  }

  const handleAddPlant = () => {
    navigation.navigate('TabNavigator', { screen: 'Add a Plant' });
  };

  return (
    <SafeAreaView style={styles.container}>
      <ImageBackground
        source={require('../../../../assets/images/PlantViewBackground.png')}
        style={styles.backgroundImage}>
        <View style={styles.arrowIcon}>
          <Feather name="arrow-left" size={24} color="white" />
        </View>

        <View style={styles.headerContainer}>
          <Text style={styles.headerTitle}>View</Text>
          <Text style={styles.headerTitle}>your</Text>
          <Text style={styles.headerTitle}>Plants!</Text>
        </View>

        <View style={styles.contentContainer}>
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
                  // 📝 UPDATED: Call handleViewStats when the card is pressed
                  onPress={() => handleViewStats(item.id)}
                  onActionPress={() =>
                    setActionMenuIndex((prev) => (prev === index ? null : index))
                  }
                  showActionText={actionMenuIndex === index}
                  refreshPlants={refreshPlants}
                />
              )}
            />

            {plants.length > 0 && (
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
        </View>
      </ImageBackground>

      <FilledButton style={{ marginBottom: 30 }} text="+ Add Plant" onPress={handleAddPlant} />
    </SafeAreaView>
  );
}
