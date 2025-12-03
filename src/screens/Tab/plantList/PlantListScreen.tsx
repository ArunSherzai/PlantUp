import React, { useState, useEffect } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  SafeAreaView,
  Image,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import FilledButton from '~/features/auth/components/FilledButton';
import Feather from '@expo/vector-icons/Feather';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import DraggableBottomSheet from '~/components/DraggableBottomSheet';

import { useFonts, Nunito_400Regular } from '@expo-google-fonts/nunito';

import { PlantCard } from '~/features/plantlist/components/Plantcard';
import { usePlants } from '~/features/plantlist/hooks/usePlants';

import { vw, vh } from '../../../features/plantlist/styles/plantStyles';

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

  const handleViewStats = (plantId: string) => {
    navigation.navigate('ShowPlantStats', { plantId: plantId, onlyShowSelected: true });
  };

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

  // ✅ Restored old navigation
  const handleAddPlant = () => {
    navigation.navigate('Add a Plant');
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={styles.container}>
        {/* Header Background */}
        <View style={styles.headerBg}>
          <Image
            source={require('../../../../assets/images/PlantViewBackground.png')}
            style={styles.headerImage}
            resizeMode="cover"
          />
          <TouchableOpacity style={styles.arrowIcon} onPress={() => navigation.goBack()}>
            <Feather name="arrow-left" size={24} color="white" />
          </TouchableOpacity>
          <View style={styles.headerContainer}>
            <Text style={styles.headerTitle}>View</Text>
            <Text style={styles.headerTitle}>your</Text>
            <Text style={styles.headerTitle}>Plants!</Text>
          </View>
        </View>

        {/* Draggable Bottom Sheet */}
        <DraggableBottomSheet initialHeight={0.65} maxHeight={0.9}>
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

            <FilledButton style={{ marginTop: 20 }} text="+ Add Plant" onPress={handleAddPlant} />
          </View>
        </DraggableBottomSheet>
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
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
  arrowIcon: {
    position: 'absolute',
    top: 50,
    left: 20,
    zIndex: 10,
  },
  headerContainer: {
    position: 'absolute',
    top: 100,
    left: 20,
  },
  headerTitle: {
    fontSize: 48,
    fontWeight: 'bold',
    color: 'white',
  },
  sheetContent: {
    flex: 1,
    paddingTop: 20,
    paddingBottom: 40,
    alignItems: 'center',
  },
  carouselContainer: {
    height: 400,
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
    color: '#888',
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 10,
  },
  dotSmall: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ccc',
    marginHorizontal: 4,
  },
  dotSmallActive: {
    backgroundColor: '#4CAF50',
    width: 10,
    height: 10,
    borderRadius: 5,
  },
});
