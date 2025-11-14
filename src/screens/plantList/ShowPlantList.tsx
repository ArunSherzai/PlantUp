import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  SafeAreaView,
  Dimensions,
  ImageBackground,
  TextInput,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { lightTheme } from 'theme';
import { Nunito_400Regular, useFonts } from '@expo-google-fonts/nunito';
import FilledButton from '~/features/auth/components/FilledButton';
import Feather from '@expo/vector-icons/Feather';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import Animated, {
  useSharedValue,
  withTiming,
  interpolate,
  useAnimatedStyle,
  Easing,
} from 'react-native-reanimated';
import { StyleSheet } from 'react-native-unistyles';

const { width, height } = Dimensions.get('window');
export const vw = width / 100;
export const vh = height / 100;

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

/* === Animated PlantCard === */
const PlantCard = React.memo(({ item, onActionPress, showActionText }: PlantCardProps) => {
  const flip = useSharedValue(showActionText ? 1 : 0);
  const [editedName, setEditedName] = useState(item.name);
  const [editedType, setEditedType] = useState(item.type);

  useEffect(() => {
    flip.value = withTiming(showActionText ? 1 : 0, {
      duration: 700,
      easing: Easing.out(Easing.cubic),
    });
  }, [showActionText]);

  // front animation
  const frontStyle = useAnimatedStyle(() => ({
    transform: [
      { perspective: 1000 },
      { rotateX: `${interpolate(flip.value, [0, 1], [0, 180])}deg` },
    ],
    backfaceVisibility: 'hidden',
    position: 'absolute',
    inset: 0,
    zIndex: flip.value < 0.5 ? 2 : 0,
  }));

  // back animation
  const backStyle = useAnimatedStyle(() => ({
    transform: [
      { perspective: 1000 },
      { rotateX: `${interpolate(flip.value, [0, 1], [180, 360])}deg` },
      { scale: interpolate(flip.value, [0, 1], [1, 0.96]) }, // subtle scale for smoothness
    ],
    backfaceVisibility: 'hidden',
    position: 'absolute',
    inset: 0,
    zIndex: flip.value > 0.5 ? 2 : 0,
  }));

  return (
    <View style={localstyles.plantCard}>
      {/* === FRONT SIDE === */}
      <Animated.View style={[frontStyle]} pointerEvents={showActionText ? 'none' : 'auto'}>
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

          {/* ... Action button */}
          <TouchableOpacity
            style={localstyles.plantCardActionButton}
            onPress={onActionPress}
            activeOpacity={0.7}>
            <FontAwesome name="ellipsis-h" size={24} color="white" />
          </TouchableOpacity>
        </LinearGradient>
      </Animated.View>

      {/* === BACK SIDE === */}
      <Animated.View style={[backStyle]} pointerEvents={showActionText ? 'auto' : 'none'}>
        <LinearGradient
          colors={item.gradientColors || lightTheme.colors.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={localstyles.backGradient}>
          <View style={localstyles.backContent}>
            <Text style={localstyles.backTitle}>Edit Plant</Text>

            <View style={localstyles.field}>
              <Text style={localstyles.label}>Name</Text>
              <TextInput
                style={localstyles.input}
                value={editedName}
                onChangeText={setEditedName}
                placeholder="Enter name"
                placeholderTextColor="rgba(255,255,255,0.5)"
              />
            </View>

            <View style={localstyles.field}>
              <Text style={localstyles.label}>Type</Text>
              <TextInput
                style={localstyles.input}
                value={editedType}
                onChangeText={setEditedType}
                placeholder="Enter type"
                placeholderTextColor="rgba(255,255,255,0.5)"
              />
            </View>

            <View style={localstyles.buttonRow}>
              <TouchableOpacity style={localstyles.saveButton}>
                <Text style={{ color: 'white', fontWeight: 'bold' }}>Save</Text>
              </TouchableOpacity>
              <TouchableOpacity style={localstyles.cancelButton} onPress={onActionPress}>
                <Text style={{ color: 'white', fontWeight: 'bold' }}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* ... Action button on back too */}
          <TouchableOpacity
            style={[localstyles.plantCardActionButton, { top: vh * 1.2, right: vw * 3 }]}
            onPress={onActionPress}
            activeOpacity={0.7}>
            <FontAwesome name="ellipsis-h" size={24} color="white" />
          </TouchableOpacity>
        </LinearGradient>
      </Animated.View>
    </View>
  );
});

function ShowPlantList() {
  const navigation = useNavigation<any>();
  const [fontsLoaded] = useFonts({ Nunito_400Regular });
  const [actionMenuIndex, setActionMenuIndex] = useState<number | null>(null);

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
          <View style={localstyles.carouselContainer}>
            <PlantCard
              item={plants[0]}
              index={0}
              onActionPress={() => setActionMenuIndex((prev) => (prev === 0 ? null : 0))}
              showActionText={actionMenuIndex === 0}
            />
          </View>
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

/* === Styles === */
export const localstyles = StyleSheet.create((theme) => ({
  plantCard: {
    width: vw * 94,
    height: vh * 29,
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
  backGradient: {
    flex: 1,
    borderRadius: vw * 6,
    padding: vw * 5,
    justifyContent: 'center',
  },
  image: {
    width: vw * 26,
    height: vw * 26,
    marginRight: vw * 5,
    resizeMode: 'contain',
  },
  infoColumn: { flex: 1, justifyContent: 'center' },
  name: {
    fontSize: vw * 7,
    fontWeight: 'bold',
    color: theme.colors.background,
    fontFamily: 'Nunito_400Regular',
  },
  points: {
    fontSize: vw * 3.5,
    color: theme.colors.background,
    marginTop: vh * 0.5,
  },
  type: {
    position: 'absolute',
    bottom: vh * 1.2,
    right: vw * 4,
    fontSize: vw * 3.2,
    color: theme.colors.background,
  },
  plantCardActionButton: {
    position: 'absolute',
    top: vh * 1.2,
    right: vw * 3,
    padding: vw * 2,
    zIndex: 10,
  },

  /* Back content modern UI */
  backContent: {
    flex: 1,
    justifyContent: 'center',
    transform: [{ scale: 0.9 }], // smaller back card visual
  },
  backTitle: {
    fontSize: vw * 6,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: vh * 2,
  },
  field: { marginBottom: vh * 1.5 },
  label: {
    color: 'rgba(255,255,255,0.85)',
    marginBottom: 6,
    fontSize: vw * 3.5,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: vw * 2,
    paddingVertical: vh * 1,
    paddingHorizontal: vw * 3,
    color: 'white',
    fontSize: vw * 4,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: vh * 2,
  },
  saveButton: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: vw * 3,
    paddingVertical: vh * 1,
    paddingHorizontal: vw * 6,
  },
  cancelButton: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: vw * 3,
    paddingVertical: vh * 1,
    paddingHorizontal: vw * 6,
  },

  /* Layout */
  carouselContainer: {
    paddingTop: vh * 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentContainer: {
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: vw * 6,
    borderTopRightRadius: vw * 6,
    height: '45%',
  },
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    justifyContent: 'space-between',
  },
  backgroundImage: { flex: 1, width: '100%', justifyContent: 'flex-end' },
  headerContainer: { paddingLeft: vw * 5, marginTop: vh * 18 },
  headerTitle: { fontSize: vw * 11, fontWeight: 'bold', color: '#ffffff' },
  arrowIcon: { margin: vw * 1.5 },
}));
