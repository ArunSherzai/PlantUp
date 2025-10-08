import { Nunito_400Regular, useFonts } from '@expo-google-fonts/nunito';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
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
  Modal,
} from 'react-native';
import { ImageBackground } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { lightTheme } from 'theme';
import FilledButton from '~/features/auth/components/FilledButton';
import Feather from '@expo/vector-icons/Feather';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { ScrollView } from 'react-native-gesture-handler';
import Constants from 'expo-constants';

const width = Dimensions.get('window').width;
const ITEM_WIDTH = width;
const BASE_CARD_WIDTH = ITEM_WIDTH * 0.8;
const CAROUSEL_SLOT_WIDTH = ITEM_WIDTH * 0.5;
const SCALE_FOCUSED = 1.0;
const SCALE_NORMAL = 0.8;

const customGradients: [string, string][] = [
  ['#ff7e5f', '#feb47b'],
  ['#00c6ff', '#0072ff'],
  ['#8e2de2', '#4a00e0'],
  ['#a8e063', '#56ab2f'],
  ['#ff9a9e', '#fad0c4'],
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
];

interface PlantItem {
  name: string;
  points: number;
  type: string;
  image: number;
  gradientColors?: [string, string];
}

interface PlantCardProps {
  item: PlantItem;
  isFocused: boolean;
  onActionPress: () => void;
  showActionText: boolean;
}

const PlantCard = ({ item, isFocused, onActionPress, showActionText }: PlantCardProps) => {
  const scaleAnim = useRef(new Animated.Value(SCALE_NORMAL)).current;

  const handleDelete = () => {
    console.log('Delete plant');
  };

  const handleUpdate = () => {
    console.log('Update plant');
  };

  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: isFocused ? SCALE_FOCUSED : SCALE_NORMAL,
      friction: 7,
      tension: 40,
      useNativeDriver: true,
    }).start();
  }, [isFocused, scaleAnim]);

  return (
    <Animated.View
      style={[
        localstyles.plantCard,
        {
          transform: [{ scale: scaleAnim }],
          zIndex: isFocused ? 1 : 0,
        },
      ]}>
      <LinearGradient
        colors={item.gradientColors || lightTheme.colors.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          flex: 1,
          borderRadius: 20,
          padding: 20,
          flexDirection: 'row',
          alignItems: 'center',
          position: 'relative',
        }}>
        <Image source={item.image} style={localstyles.image} />
        <View style={localstyles.infoColumn}>
          <Text style={localstyles.name}>{item.name}</Text>
          <Text style={localstyles.points}>PTS {item.points}</Text>
        </View>
        <Text style={localstyles.type}>{item.type}</Text>

        {showActionText ? (
          <View style={localstyles.menu}>
            <TouchableOpacity onPress={handleUpdate} style={localstyles.update}>
              <Text
                style={{
                  color: 'green',
                }}>
                Update
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleDelete} style={localstyles.delete}>
              <Text
                style={{
                  color: 'red',
                }}>
                Delete
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View></View>
        )}
        <TouchableOpacity
          style={localstyles.plantCardActionButton}
          onPress={onActionPress}
          activeOpacity={0.7}>
          <FontAwesome name="ellipsis-h" size={24} color="white" />
        </TouchableOpacity>
      </LinearGradient>
    </Animated.View>
  );
};

interface PageIndicatorProps {
  count: number;
  activeIndex: number;
}

const PageIndicator = ({ count, activeIndex }: PageIndicatorProps) => (
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

function AddPlant() {
  const navigation = useNavigation<any>();
  const { theme } = useUnistyles();
  const [fontsLoaded] = useFonts({ Nunito_400Regular });
  const [focusedIndex, setFocusedIndex] = useState<number>(0);
  const [actionMenuIndex, setActionMenuIndex] = useState<number | null>(null);

  const onViewRef = useRef((viewableItems: { viewableItems: Array<{ index: number | null }> }) => {
    const currentIndex = viewableItems?.viewableItems[0]?.index ?? null;
    if (currentIndex !== null) {
      setFocusedIndex(currentIndex);
    }
  });

  const viewConfigRef = useRef({ viewAreaCoveragePercentThreshold: 50 });

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const scrollX = event.nativeEvent.contentOffset.x;
      const viewportCenter = scrollX + ITEM_WIDTH / 2;

      let closestIndex = 0;
      let minDistance = Infinity;

      plants.forEach((_, index) => {
        const itemSlotCenter = index * CAROUSEL_SLOT_WIDTH + CAROUSEL_SLOT_WIDTH / 2;
        const distance = Math.abs(viewportCenter - itemSlotCenter);
        if (distance < minDistance) {
          minDistance = distance;
          closestIndex = index;
        }
      });

      if (focusedIndex !== closestIndex) {
        setFocusedIndex(closestIndex);
      }
    },
    [focusedIndex]
  );

  const renderNewCarouselItem = ({ item, index }: { item: PlantItem; index: number }) => {
    const isFocused = index === focusedIndex;
    return (
      <View style={localstyles.itemContainer}>
        <PlantCard
          item={item}
          isFocused={isFocused}
          onActionPress={() => setActionMenuIndex(index)}
          showActionText={actionMenuIndex === index}
        />
      </View>
    );
  };

  const handleAddPlant = () => {
    navigation.navigate('TabNavigator', {
      screen: 'Add a Plant',
    });
  };

  if (!fontsLoaded) {
    return (
      <View style={[localstyles.container, { justifyContent: 'center' }]}>
        <Text>Loading...</Text>
      </View>
    );
  }

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
              horizontal
              contentContainerStyle={{
                paddingTop: Constants.statusBarHeight / 2,
                paddingHorizontal: (ITEM_WIDTH - CAROUSEL_SLOT_WIDTH) / 2,
              }}
              onScroll={handleScroll}
              scrollEventThrottle={16}
              onViewableItemsChanged={onViewRef.current}
              viewabilityConfig={viewConfigRef.current}
              renderItem={renderNewCarouselItem}
              keyExtractor={(item, index) => item.name + index}
              showsHorizontalScrollIndicator={false}
              snapToInterval={CAROUSEL_SLOT_WIDTH}
              decelerationRate="fast"
              getItemLayout={(data, index) => ({
                length: CAROUSEL_SLOT_WIDTH,
                offset: CAROUSEL_SLOT_WIDTH * index,
                index,
              })}
            />
          </View>
          <PageIndicator count={plants.length} activeIndex={focusedIndex} />
        </ScrollView>
      </ImageBackground>

      <FilledButton
        style={{ marginBottom: 15 }}
        text="+ Add Plant"
        onPress={handleAddPlant}
        testID="AddPlant"
      />
    </SafeAreaView>
  );
}

export default AddPlant;

const localstyles = StyleSheet.create({
  menu: {
    position: 'absolute',
    top: '20%',
    right: '2%',
    padding: 5,
    zIndex: 2,
    backgroundColor: 'white',
    borderRadius: 10,
  },
  update: {
    backgroundColor: 'green',
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
    marginBottom: 5,
    borderRadius: 7,
  },
  delete: {
    backgroundColor: 'red',
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
    borderRadius: 7,
  },
  carouselContainer: {
    paddingTop: 30,
    height: 200 * SCALE_FOCUSED + 10 * 2 + 40,
    zIndex: 1,
  },
  contentContainer: {
    backgroundColor: 'white',
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    minHeight: 350,
  },
  container: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'space-between',
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
    borderRadius: 20,
    backgroundColor: 'transparent',
    overflow: 'visible',
  },
  image: {
    width: 100,
    height: 100,
    marginRight: 15,
  },
  infoColumn: {
    flex: 1,
    justifyContent: 'center',
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
  plantCardActionButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    padding: 5,
    zIndex: 2,
  },
  itemContainer: {
    width: CAROUSEL_SLOT_WIDTH,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  pageIndicatorContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionMenu: {
    width: 200,
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
  },
  actionText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginVertical: 10,
    color: 'white',
  },
});
