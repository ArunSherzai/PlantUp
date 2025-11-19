import React, { useState } from 'react';
import { View, Text, SafeAreaView, ImageBackground, FlatList } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import FilledButton from '~/features/auth/components/FilledButton';
import Feather from '@expo/vector-icons/Feather';

import { useFonts, Nunito_400Regular } from '@expo-google-fonts/nunito';

import { PlantCard } from '../../features/plantlist/components/Plantcard';
import { usePlants } from '../../features/plantlist/hooks/usePlants';
import { styles, vw, vh } from '../../features/plantlist/styles/plantStyles';

export default function PlantListScreen() {
  const navigation = useNavigation<any>();
  const [actionMenuIndex, setActionMenuIndex] = useState<number | null>(null);

  const { plants, refreshPlants } = usePlants();

  const [fontsLoaded] = useFonts({ Nunito_400Regular });

  if (!fontsLoaded) {
    return (
      <View style={styles.center}>
        <Text>Loading...</Text>
      </View>
    );
  }

  const handleAddPlant = () => {
    navigation.navigate('TabNavigator', { screen: 'Add a Plant' });
  };

  return (
    <SafeAreaView style={styles.container}>
      <ImageBackground
        source={require('../../../assets/images/PlantViewBackground.png')}
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
              data={plants}
              keyExtractor={(item) => item.id}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              ItemSeparatorComponent={() => <View style={{ width: vw * 8 }} />}
              contentContainerStyle={{
                paddingHorizontal: vw * 4,
              }}
              ListEmptyComponent={() => (
                <View
                  style={{
                    flex: 1,
                    justifyContent: 'center',
                    alignItems: 'center',
                    width: vw * 88,
                    height: vh * 29,
                  }}>
                  <Text
                    style={{
                      fontSize: 18,
                      color: 'black',
                      textAlign: 'center',
                      fontFamily: 'Inter-SemiBold',
                    }}>
                    You have no plants!
                  </Text>
                </View>
              )}
              renderItem={({ item, index }) => (
                <PlantCard
                  item={item}
                  index={index}
                  onActionPress={() =>
                    setActionMenuIndex((prev) => (prev === index ? null : index))
                  }
                  showActionText={actionMenuIndex === index}
                  refreshPlants={refreshPlants}
                />
              )}
            />
          </View>
        </View>
      </ImageBackground>

      <FilledButton style={{ marginBottom: 30 }} text="+ Add Plant" onPress={handleAddPlant} />
    </SafeAreaView>
  );
}
