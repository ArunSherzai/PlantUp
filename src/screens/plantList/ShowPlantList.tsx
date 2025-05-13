import { Nunito_400Regular, useFonts } from '@expo-google-fonts/nunito';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  Dimensions,
  SafeAreaView,
  Animated,
  FlatList,
  Easing,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from 'react-native';
import { ImageBackground } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { lightTheme } from 'theme';
import FilledButton from '~/features/auth/components/FilledButton';
import Feather from '@expo/vector-icons/Feather';
import { ScrollView } from 'react-native-gesture-handler';
import Constants from 'expo-constants';

const width = Dimensions.get('window').width;
const ITEM_WIDTH = width;

// --- Constants for Overlapping Carousel --- 
// 1. Visual width of each card before scaling
const BASE_CARD_WIDTH = ITEM_WIDTH * 0.8; // e.g., 80% of screen width
// 2. Width of the slot each card occupies in FlatList (for scroll & snap)
// Must be less than BASE_CARD_WIDTH for overlap.
const CAROUSEL_SLOT_WIDTH = ITEM_WIDTH * 0.5; // e.g., 50% of screen width
// Overlap amount = BASE_CARD_WIDTH - CAROUSEL_SLOT_WIDTH

const SCALE_FOCUSED = 1.0;
const SCALE_NORMAL = 0.8;

// Define the new gradients
const customGradients: [string, string][] = [
  ['#ff7e5f', '#feb47b'], // Sunset Glow
  ['#00c6ff', '#0072ff'], // Ocean Breeze
  ['#8e2de2', '#4a00e0'], // Purple Haze
  ['#a8e063', '#56ab2f'], // Mint Leaf
  ['#ff9a9e', '#fad0c4'], // Peachy Pink
];

const plants = [
  {
    name: 'Fernando',
    points: 850000,
    type: 'Outdoor',
    image: require('../../../assets/images/plant4.png'),
    gradientColors: customGradients[0], 
  },
  {
    name: 'Franz',
    points: 920000,
    type: 'Outdoor',
    image: require('../../../assets/images/plant3.png'),
    gradientColors: customGradients[1],
  },
  {
    name: 'Lily Phillips',
    points: 780000,
    type: 'Indoor',
    image: require('../../../assets/images/plant4.png'),
    gradientColors: customGradients[2],
  },
  {
    name: 'Lily Phillips',
    points: 780000,
    type: 'Indoor',
    image: require('../../../assets/images/plant4.png'),
    gradientColors: customGradients[3],
  },
  {
    name: 'Lily Phillips',
    points: 780000,
    type: 'Indoor',
    image: require('../../../assets/images/plant4.png'),
    gradientColors: customGradients[4],
  },
  {
    name: 'Lily Phillips',
    points: 780000,
    type: 'Indoor',
    image: require('../../../assets/images/plant4.png'),
    // This will use the default gradient or you can assign customGradients[0] to cycle
    gradientColors: customGradients[0], 
  },
    {
    name: 'Lily Phillips',
    points: 780000,
    type: 'Indoor',
    image: require('../../../assets/images/plant4.png'),
    gradientColors: customGradients[1],
  },
   {
    name: 'Lily Phillips',
    points: 780000,
    type: 'Indoor',
    image: require('../../../assets/images/plant4.png'),
    gradientColors: customGradients[2],
  },
];

interface PlantItem {
  name: string;
  points: number;
  type: string;
  image: number; 
  gradientColors?: [string, string]; // Updated to be an array/tuple of two strings
}

interface PlantCardProps {
  item: PlantItem;
  isFocused: boolean;
}

const PlantCard = ({ item, isFocused }: PlantCardProps) => {
  const scaleAnim = useRef(new Animated.Value(SCALE_NORMAL)).current;

  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: isFocused ? SCALE_FOCUSED : SCALE_NORMAL,
      friction: 7,
      tension: 40,
      useNativeDriver: true,
    }).start();
  }, [isFocused, scaleAnim]);

  const handleActionPress = () => {
    console.log(`Action button pressed for: ${item.name}`);
    // TODO: Implement actual action (e.g., open a menu)
  };

  return (
    <Animated.View style={[
      localstyles.plantCard, 
      { 
        transform: [{ scale: scaleAnim }],
        zIndex: isFocused ? 1 : 0, 
      }
    ]}>
      <LinearGradient
        colors={item.gradientColors || lightTheme.colors.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{flex: 1, borderRadius: 20, padding: 20, flexDirection: 'row', alignItems: 'center', position: 'relative'}}
      >
        <Image source={item.image} style={localstyles.image} />
        <View style={localstyles.infoColumn}>
          <Text style={localstyles.name}>{item.name}</Text>
          <Text style={localstyles.points}>PTS {item.points}</Text>
        </View>
        <Text style={localstyles.type}>{item.type}</Text>

        {/* Action Button */}
        <TouchableOpacity style={localstyles.plantCardActionButton} onPress={handleActionPress} activeOpacity={0.7}>
          <Feather name="more-horizontal" size={24} color="white" style={localstyles.plantCardActionIcon} />
        </TouchableOpacity>
      </LinearGradient>
    </Animated.View>
  );
};

// ++ Add PageIndicator Component Definition ++
interface PageIndicatorProps {
  count: number;
  activeIndex: number;
}

const PageIndicator = ({ count, activeIndex }: PageIndicatorProps) => {
  return (
    <View style={localstyles.pageIndicatorContainer}>
      {Array.from({ length: count }).map((_, index) => (
        <View
          key={index}
          style={[
            localstyles.pageIndicatorDot,
            index === activeIndex ? localstyles.pageIndicatorDotActive : {},
          ]}
        />
      ))}
    </View>
  );
};
// ++ End PageIndicator Component Definition ++

function AddPlant() {
  const { theme } = useUnistyles();
  const [fontsLoaded] = useFonts({
    Nunito_400Regular,
  });

  const [focusedIndex, setFocusedIndex] = useState<number>(0);
  const [currentView, setCurrentView] = useState({visible:false,index:null as number | null});
  
  const onViewRef = React.useRef((viewableItems: { viewableItems: Array<{ index: number | null }> }) => {
    if(viewableItems?.viewableItems.length === 1){
      const currentItemIndex = viewableItems?.viewableItems[0]?.index;
      setCurrentView({visible:true,index:currentItemIndex});
    } else {
      setCurrentView({visible:false,index:null});
    }
  });

  const viewConfigRef = React.useRef({ viewAreaCoveragePercentThreshold: 50 });

  const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const scrollX = event.nativeEvent.contentOffset.x;
    // viewportCenter is based on ITEM_WIDTH (screen width)
    const viewportCenter = scrollX + ITEM_WIDTH / 2;

    let closestIndex = 0;
    let minDistance = Infinity;

    plants.forEach((_, index) => {
      // itemSlotCenter is based on CAROUSEL_SLOT_WIDTH
      const itemSlotCenter = (index * CAROUSEL_SLOT_WIDTH) + (CAROUSEL_SLOT_WIDTH / 2);
      const distance = Math.abs(viewportCenter - itemSlotCenter);

      if (distance < minDistance) {
        minDistance = distance;
        closestIndex = index;
      }
    });

    if (focusedIndex !== closestIndex) {
      setFocusedIndex(closestIndex);
    }
  }, [focusedIndex]);

  const renderNewCarouselItem = ({item, index}: {item: PlantItem, index: number}) => {
    const isFocused = index === focusedIndex;
    return (
      <View style={localstyles.itemContainer}> 
        <PlantCard item={item} isFocused={isFocused} />
      </View>
    );
  }

  if (!fontsLoaded) {
    return (
      <View style={[localstyles.container, {justifyContent: 'center'}]}> 
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
            source={require('../../../assets/images/PlantViewBackground.png')}
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
                <Animated.FlatList 
                  data={plants}
                  style={{flex:1}}
                  contentContainerStyle={{
                    paddingTop:Constants.statusBarHeight / 2, 
                    paddingHorizontal: (ITEM_WIDTH - CAROUSEL_SLOT_WIDTH) / 2 
                  }}
                  horizontal={true}
                  onScroll={handleScroll}
                  scrollEventThrottle={16}
                  onViewableItemsChanged={onViewRef.current}
                  viewabilityConfig={viewConfigRef.current}
                  renderItem={renderNewCarouselItem}
                  keyExtractor={(item, index) => item.name + index.toString()}
                  showsHorizontalScrollIndicator={false}
                  snapToInterval={CAROUSEL_SLOT_WIDTH} 
                  decelerationRate="fast" 
                  getItemLayout={(data, index) => (
                    { length: CAROUSEL_SLOT_WIDTH, offset: CAROUSEL_SLOT_WIDTH * index, index }
                  )}
                />
              </View>
              <PageIndicator count={plants.length} activeIndex={focusedIndex} />
            </ScrollView>
            
            </ImageBackground>
     
      <FilledButton  text="+ Add Plant" onPress={handleAddPlant} testID="AddPlant" />
    </SafeAreaView>
  );
}

export default AddPlant;

const localstyles = StyleSheet.create({
  carouselContainer: {
    paddingTop: 30,
    height: (200 * SCALE_FOCUSED) + (10 * 2) + 40, 
    paddingVertical: 0,
    zIndex: 1, 
  },
  contentContainer: {
    backgroundColor: 'white',
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    minHeight: 350, 
    padding: 0,
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
    width: BASE_CARD_WIDTH, 
    height: 200,
    backgroundColor: 'transparent',
    borderRadius: 20,
    elevation: 5,
    overflow: 'visible',
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
  },
  itemContainer: {
    width: CAROUSEL_SLOT_WIDTH, 
    alignItems: 'center', 
    justifyContent: 'center',
    paddingVertical: 10,
  },
  container: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'space-between',
  },
  card: {
    backgroundColor: '#4CAF50',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    elevation: 5,
  },
  image: {
    width: 100,
    height: 100,
    marginRight: 15,
  },
  name: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    fontFamily: 'Nunito_400Regular',
    marginBottom: 4,
  },
  points: {
    fontSize: 14,
    color: '#fff',
    marginTop: 5,
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
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Nunito_400Regular',
  },
  plantCardActionButton: {
    position: 'absolute',
    top: 10, 
    right: 10, 
    padding: 5, 
    zIndex: 2, 
  },
  plantCardActionIcon: {
    // Additional styling for the icon itself, if needed
  },
  pageIndicatorContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 15, 
    marginTop: 5,      
  },
  pageIndicatorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E0E0E0', 
    marginHorizontal: 5, 
  },
  pageIndicatorDotActive: {
    backgroundColor: '#616161', 
    width: 9, 
    height: 9,
    borderRadius: 4.5,
  },
  backgroundImage: {
    flex: 1,
    width: '100%',
    justifyContent: 'flex-end',
  },
});
