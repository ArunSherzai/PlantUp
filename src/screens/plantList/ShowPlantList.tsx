import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  SafeAreaView,
  Dimensions,
  ImageBackground,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useUnistyles } from 'react-native-unistyles';
import { lightTheme } from 'theme';
import { Nunito_400Regular, useFonts } from '@expo-google-fonts/nunito';
import FilledButton from '~/features/auth/components/FilledButton';
import Feather from '@expo/vector-icons/Feather';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import Carousel, { ICarouselInstance, Pagination } from 'react-native-reanimated-carousel';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useDerivedValue,
  interpolate,
  Extrapolate,
  withTiming,
} from 'react-native-reanimated';
import Constants from 'expo-constants';
import { StyleSheet } from 'react-native';

const { width } = Dimensions.get('window');
const BASE_CARD_WIDTH = width * 0.8;
const SCALE_FOCUSED = 1.1;
const SCALE_NORMAL = 0.9;

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
    name: 'Lily',
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
  index: number;
  focusIndex: Animated.SharedValue<number>; // animated index that snaps
  onActionPress: () => void;
  showActionText: boolean;
}

const PlantCard = ({ item, index, focusIndex, onActionPress, showActionText }: PlantCardProps) => {
  // Scale animates AFTER snap: distance is computed from animated snapped index
  const animatedStyle = useAnimatedStyle(() => {
    const distance = Math.abs(focusIndex.value - index); // 0 when centered
    const scale = interpolate(distance, [0, 1], [SCALE_FOCUSED, SCALE_NORMAL], Extrapolate.CLAMP);

    return {
      transform: [{ scale }],
      zIndex: distance < 0.5 ? 1 : 0,
    };
  });

  const handleDelete = () => console.log('Delete plant');
  const handleUpdate = () => console.log('Update plant');

  return (
    <Animated.View style={[localstyles.plantCard, animatedStyle]}>
      <LinearGradient
        colors={item.gradientColors || lightTheme.colors.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={localstyles.gradient}>
        <Image source={item.image} style={localstyles.image} />
        <View style={localstyles.infoColumn}>
          <Text style={localstyles.name}>{item.name}</Text>
          <Text style={localstyles.points}>PTS {item.points}</Text>
        </View>
        <Text style={localstyles.type}>{item.type}</Text>

        {showActionText && (
          <View style={localstyles.menu}>
            <TouchableOpacity onPress={handleUpdate} style={localstyles.update}>
              <Text style={{ color: 'white' }}>Update</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleDelete} style={localstyles.delete}>
              <Text style={{ color: 'white' }}>Delete</Text>
            </TouchableOpacity>
          </View>
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

function AddPlant() {
  const navigation = useNavigation<any>();
  const { theme } = useUnistyles();
  const [fontsLoaded] = useFonts({ Nunito_400Regular });
  const [actionMenuIndex, setActionMenuIndex] = useState<number | null>(null);

  // Used ONLY for pagination dots; we round it so dots don't show transition
  const progress = useSharedValue<number>(0);
  const roundedProgress = useDerivedValue(() => Math.round(progress.value));

  // Used for the zoom animation: we animate this to the snapped index
  const currentIndexSV = useSharedValue<number>(0);

  const ref = useRef<ICarouselInstance>(null);

  const onPressPagination = (index: number) => {
    ref.current?.scrollTo({
      count: index - roundedProgress.value, // use rounded so it jumps to the nearest
      animated: true,
    });
  };

  const handleAddPlant = () => {
    navigation.navigate('TabNavigator', { screen: 'Add a Plant' });
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
            <Carousel
              ref={ref}
              width={width}
              height={250}
              data={plants}
              loop={false}
              pagingEnabled
              snapEnabled
              scrollAnimationDuration={180}
              onProgressChange={progress}
              onSnapToItem={(idx) => {
                // animate to the snapped index so the zoom finishes AFTER the snap
                currentIndexSV.value = withTiming(idx, { duration: 150 });
              }}
              renderItem={({ item, index }) => (
                <View style={localstyles.itemContainer}>
                  <PlantCard
                    item={item}
                    index={index}
                    focusIndex={currentIndexSV}
                    onActionPress={() => setActionMenuIndex(index)}
                    showActionText={actionMenuIndex === index}
                  />
                </View>
              )}
            />

            {/* Built-in pagination with no transition (rounded) */}
            <Pagination.Basic
              progress={roundedProgress}
              data={plants}
              dotStyle={{ backgroundColor: 'rgba(0,0,0,0.25)', borderRadius: 50 }}
              activeDotStyle={{ backgroundColor: '#000000' }}
              containerStyle={{ gap: 6, marginTop: 10 }}
              onPress={onPressPagination}
            />
          </View>
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
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 10,
  },
  update: {
    backgroundColor: 'green',
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
    marginBottom: 5,
    borderRadius: 7,
    padding: 4,
  },
  delete: {
    backgroundColor: 'red',
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
    borderRadius: 7,
    padding: 4,
  },
  gradient: {
    flex: 1,
    borderRadius: 20,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  carouselContainer: {
    paddingTop: 30,
    zIndex: 1,
    alignItems: 'center',
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
    marginTop: 30,
    width: BASE_CARD_WIDTH,
    height: 200,
    borderRadius: 20,
    backgroundColor: 'transparent',
    overflow: 'visible',
    // no static transform here; Animated style provides scale
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
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  backgroundImage: {
    flex: 1,
    width: '100%',
    justifyContent: 'flex-end',
  },
});
