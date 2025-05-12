import { Nunito_400Regular, useFonts } from '@expo-google-fonts/nunito';
import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  Dimensions,
  SafeAreaView,
  StyleSheet as mom
} from 'react-native';

import Carousel from 'react-native-snap-carousel';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

const width = Dimensions.get('window').width;

const plants = [
  {
    name: 'Philipp',
    points: 1000000,
    type: 'Indoor',
    image: require('../../assets/images/plant.png'),
  },
  // Add more plants as needed
];

interface PlantItem {
  name: string;
  points: number;
  type: string;
  image: number; // 'require()' returns a number
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 20,
  },
  card: {
    backgroundColor: '#4CAF50',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    elevation: 5,
  },
  image: {
    width: 80,
    height: 80,
    marginBottom: 10,
  },
  name: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    fontFamily: 'Nunito_400Regular',
  },
  points: {
    fontSize: 14,
    color: '#fff',
    marginTop: 5,
    textAlign: 'center',
    fontFamily: 'Nunito_400Regular',
  },
  type: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    fontSize: 12,
    color: '#fff',
    fontFamily: 'Nunito_400Regular',
  },
  button: {
    marginTop: 40,
    backgroundColor: '#4CAF50',
    paddingVertical: 10,
    paddingHorizontal: 40,
    borderRadius: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Nunito_400Regular',
  },
});

const PlantCard = ({ item }: { item: PlantItem }) => (
  <View style={styles.card}>
    <Image source={item.image} style={styles.image} />
    <Text style={styles.name}>{item.name}</Text>
    <Text style={styles.points}>
      PTS{'\n'}
      {item.points}
    </Text>
    <Text style={styles.type}>{item.type}</Text>
  </View>
);

function AddPlant() {
  const [fontsLoaded] = useFonts({
    Nunito_400Regular,
  });

  if (!fontsLoaded) {
    return (
      <View style={styles.container}>
        <Text>Loading...</Text>
      </View>
    );
  }

  const handleAddPlant = () => {
    console.log('Add Plant pressed');
    // Navigate or show a form here
  };

  return (
    <SafeAreaView style={styles.container}>

    
    
      <TouchableOpacity style={styles.button} onPress={handleAddPlant}>
        <Text style={styles.buttonText}>+ Add Plant</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

export default AddPlant;
