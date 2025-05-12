import { Nunito_400Regular, useFonts } from '@expo-google-fonts/nunito';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  Dimensions,
  SafeAreaView,
} from 'react-native';
import { ImageBackground } from 'react-native';
import Carousel from 'react-native-reanimated-carousel';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { lightTheme } from 'theme';
import FilledButton from '~/features/auth/components/FilledButton';
import Feather from '@expo/vector-icons/Feather';
import { ScrollView } from 'react-native-gesture-handler';

const width = Dimensions.get('window').width;

const plants = [
  {
    name: 'Philipp',
    points: 1000000,
    type: 'Indoor',
    image: require('../../assets/images/plant5.png'),
  },
  {
    name: 'Fernando',
    points: 850000,
    type: 'Outdoor',
    image: require('../../assets/images/plant2.png'),
  },
  {
    name: 'Jack',
    points: 920000,
    type: 'Outdoor',
    image: require('../../assets/images/plant3.png'),
  },
  {
    name: 'Lily Phillips',
    points: 780000,
    type: 'Indoor',
    image: require('../../assets/images/plant4.png'),
  },
];


interface PlantItem {
  name: string;
  points: number;
  type: string;
  image: number; // 'require()' returns a number
}


const PlantCard = ({ item }: { item: PlantItem }) => (
  <LinearGradient
            colors={lightTheme.colors.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={localstyles.plantCard}>
           
                <Image source={item.image} style={localstyles.image} />
                  <View style={localstyles.infoColumn}>
                    <Text style={localstyles.name}>{item.name}</Text>
                    <Text style={localstyles.points}>PTS {item.points}</Text>
                  </View>
                  <Text style={localstyles.type}>{item.type}</Text>
            
          </LinearGradient>
  
);

function AddPlant() {
  const [fontsLoaded] = useFonts({
    Nunito_400Regular,
  });

  if (!fontsLoaded) {
    return (
      <View style={localstyles.container}>
        <Text>Loading...</Text>
      </View>
    );
  }

  const handleAddPlant = () => {
    console.log('Add Plant pressed');
    // Navigate or show a form here
  };

  return (
    <SafeAreaView style={localstyles.container}>
      <ImageBackground 
            source={require('../../assets/images/PlantViewBackground.png')}
            style={localstyles.backgroundImage}>
            <View style={localstyles.arrowIcon}>
              <Feather name="arrow-left" size={24} color="white" />
            </View>
            <View style={localstyles.headerContainer}>
              <Text style={localstyles.headerTitle}>View</Text>
              <Text style={localstyles.headerTitle}>your</Text>
              <Text style={localstyles.headerTitle}>Plants!</Text>
            </View>
            <ScrollView style={localstyles.contentContainer}>
              <View style={localstyles.carouselContainer}>
                <Carousel
                  width={width}
                  data={plants}
                  renderItem={({ item }) => (
                    <View style={localstyles.itemContainer}>
                      <PlantCard item={item} />
                    </View>
                  )}
                  loop
                  autoPlay={false}
                  scrollAnimationDuration={1000}
                />
              </View>
            </ScrollView>
            
            </ImageBackground>
     
      <FilledButton  text="Add Plant" onPress={handleAddPlant} testID="AddPlant" />
    </SafeAreaView>
  );
}

export default AddPlant;




const localstyles = StyleSheet.create({
  carouselContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 20,
  },
  contentContainer: {
    backgroundColor: 'white',
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    padding: 20,
  },
  headerTitle: {
    fontSize: 48,
    fontWeight: 'bold',
    color: 'white',
  },
  headerContainer: {
    paddingLeft: 20,
    marginTop: 150,
  },
  arrowIcon: {
    margin: 5,
  },
  plantCard: {
    width: width - 40,
    height: 200,
    marginHorizontal: 10,
    backgroundColor: '#4CAF50',
    borderRadius: 20,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  title: {
    color: '#fff',
    fontSize: 18,
    fontFamily: 'Nunito_400Regular',
    marginBottom: 5,
  },
  infoColumn: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 20,
  },
  itemContainer: {
    padding: 10,
  },
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
    width: 120,
    height: 120,
    marginBottom: 10,
  },
  name: {
    fontSize: 30,
    fontWeight: 'bold',
    color: '#fff',
    fontFamily: 'Nunito_400Regular',
    marginBottom: 4,
    textAlign: 'center',
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
    right: 20,
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
  backgroundImage: {
    justifyContent: 'flex-end',
  },
});
