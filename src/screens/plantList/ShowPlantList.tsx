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
import { lightTheme } from 'theme';
import { Nunito_400Regular, useFonts } from '@expo-google-fonts/nunito';
import FilledButton from '~/features/auth/components/FilledButton';
import Feather from '@expo/vector-icons/Feather';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import Carousel, { ICarouselInstance, Pagination } from 'react-native-reanimated-carousel';
import Animated, { useSharedValue, useDerivedValue } from 'react-native-reanimated';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

const { width, height } = Dimensions.get('window');
const vw = width / 100;
const vh = height / 100;

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
  onActionPress: () => void;
  showActionText: boolean;
}

const PlantCard = React.memo(({ item, onActionPress, showActionText }: PlantCardProps) => {
  const handleDelete = () => console.log('Delete plant');
  const handleUpdate = () => console.log('Update plant');

  return (
    <View style={[localstyles.plantCard]} renderToHardwareTextureAndroid shouldRasterizeIOS>
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
    </View>
  );
});

function ShowPlantList() {
  const navigation = useNavigation<any>();
  const [fontsLoaded] = useFonts({ Nunito_400Regular });
  const [actionMenuIndex, setActionMenuIndex] = useState<number | null>(null);
  const progress = useSharedValue<number>(0);
  const roundedProgress = useDerivedValue(() => Math.round(progress.value));
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

        <View style={localstyles.contentContainer}>
          <View
            style={localstyles.carouselContainer}
            renderToHardwareTextureAndroid
            shouldRasterizeIOS>
            <View
              style={{
                width: '100%',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              <Carousel
                width={vw * 90} // 👈 match card width
                height={vh * 30}
                data={plants}
                loop={false}
                snapEnabled
                scrollAnimationDuration={250}
                pagingEnabled
                mode="parallax"
                modeConfig={{
                  parallaxScrollingOffset: 0, // 👈 center perfectly (was causing left shift)
                }}
                onProgressChange={(_, absProgress) => {
                  progress.value = absProgress;
                }}
                renderItem={({ item, index }) => (
                  <PlantCard
                    item={item}
                    index={index}
                    onActionPress={() =>
                      setActionMenuIndex((prev) => (prev === index ? null : index))
                    }
                    showActionText={actionMenuIndex === index}
                  />
                )}
              />
              <Pagination.Basic
                progress={roundedProgress}
                data={plants}
                dotStyle={localstyles.dotStyle}
                activeDotStyle={localstyles.activedotStyle}
                containerStyle={{
                  marginTop: vh * 1.5,
                  gap: vw * 1.5,
                  alignSelf: 'center',
                }}
              />
            </View>
          </View>
          {/* Built-in pagination with no transition (rounded) */}
        </View>
      </ImageBackground>

      <FilledButton
        style={{ marginBottom: 30 }}
        text="+ Add Plant"
        onPress={handleAddPlant}
        testID="AddPlant"
      />
    </SafeAreaView>
  );
}

export default ShowPlantList;

export const localstyles = StyleSheet.create((theme) => ({
  /* === Menu Overlay === */
  menu: {
    position: 'absolute',
    top: '20%',
    right: '4%',
    padding: vw * 1.5,
    zIndex: 2,
    backgroundColor: theme.colors.background,
    borderRadius: vw * 3,
  },
  update: {
    backgroundColor: 'green',
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
    marginBottom: vh * 0.5,
    borderRadius: vw * 2,
    paddingVertical: vh * 0.6,
    paddingHorizontal: vw * 2,
  },
  delete: {
    backgroundColor: 'red',
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
    borderRadius: vw * 2,
    paddingVertical: vh * 0.6,
    paddingHorizontal: vw * 2,
  },

  /* === Plant Card === */
  plantCard: {
    marginTop: 0,
    width: vw * 94,
    height: vh * 29, // scales with screen height
    borderRadius: vw * 6,
    backgroundColor: 'transparent',
    overflow: 'visible',
  },
  gradient: {
    flex: 1,
    borderRadius: vw * 6,
    padding: vw * 5,
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  image: {
    width: vw * 26,
    height: vw * 26,
    marginRight: vw * 5,
    resizeMode: 'contain',
  },
  infoColumn: {
    flex: 1,
    justifyContent: 'center',
  },
  name: {
    fontSize: vw * 7,
    fontWeight: 'bold',
    color: theme.colors.background,
    fontFamily: 'Nunito_400Regular',
    marginBottom: vh * 0.5,
  },
  points: {
    fontSize: vw * 3.5,
    color: theme.colors.background,
    marginTop: vh * 0.5,
    fontFamily: 'Nunito_400Regular',
  },
  type: {
    position: 'absolute',
    bottom: vh * 1.2,
    right: vw * 4,
    fontSize: vw * 3.2,
    color: theme.colors.background,
    fontFamily: 'Nunito_400Regular',
  },
  plantCardActionButton: {
    position: 'absolute',
    top: vh * 1.2,
    right: vw * 3,
    padding: vw * 2,
    zIndex: 3,
  },

  /* === Carousel & Content === */
  carouselContainer: {
    paddingTop: vh * 2,
    alignItems: 'center',
    justifyContent: 'center',
    display: 'flex',
  },
  contentContainer: {
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: vw * 6,
    borderTopRightRadius: vw * 6,
    height: '45%',
  },

  /* === Screen Container === */
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    justifyContent: 'space-between',
  },
  backgroundImage: {
    flex: 1,
    width: '100%',
    justifyContent: 'flex-end',
  },

  /* === Header === */
  headerContainer: {
    paddingLeft: vw * 5,
    marginTop: vh * 18,
  },
  headerTitle: {
    fontSize: vw * 11,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  arrowIcon: {
    margin: vw * 1.5,
  },

  /* === Pagination Dots === */
  dotStyle: {
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderRadius: vw * 3,
    width: vw * 2.5,
    height: vw * 2.5,
    marginTop: -20,
  },
  activedotStyle: {
    backgroundColor: theme.colors.text,
    width: vw * 2.5,
    height: vw * 2.5,
    borderRadius: vw * 3,
  },
}));
