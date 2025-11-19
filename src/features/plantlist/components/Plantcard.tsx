import React, { useState, useEffect } from 'react';
import { View, Text, Image, TouchableOpacity, TextInput } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  withTiming,
  interpolate,
  useAnimatedStyle,
  Easing,
} from 'react-native-reanimated';
import { FontAwesome6 } from '@expo/vector-icons';
import { db } from '../../../utils/supabase';
import { styles, vw, vh } from '../styles/plantStyles';
import { PlantItem } from '../types/plant.types';
import { useNavigation } from '@react-navigation/native';

interface Props {
  item: PlantItem;
  index: number;
  onActionPress: () => void;
  showActionText: boolean;
  refreshPlants: () => void;
}

export const PlantCard = React.memo(
  ({ item, onActionPress, showActionText, refreshPlants }: Props) => {
    const navigation = useNavigation<any>();
    const flip = useSharedValue(showActionText ? 1 : 0);

    const [editedName, setEditedName] = useState(item.name);
    const [editedType, setEditedType] = useState(item.type ?? '');
    const [editedDescription, setEditedDescription] = useState(item.description);

    useEffect(() => {
      flip.value = withTiming(showActionText ? 1 : 0, {
        duration: 700,
        easing: Easing.out(Easing.cubic),
      });
    }, [showActionText]);

    const handleSave = async () => {
      const { error } = await db.social
        .from('Plants')
        .update({
          nickname: editedName,
          description: editedDescription,
        })
        .eq('id', item.id);

      if (error) {
        console.log('Update error:', error);
        return;
      }

      await refreshPlants();
      onActionPress();
    };

    const handleCardPress = () => {
      if (!showActionText) {
        navigation.navigate('PlantStats', {
          plantId: item.id,
          plantName: item.name,
        });
      }
    };

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

    const backStyle = useAnimatedStyle(() => ({
      transform: [
        { perspective: 1000 },
        { rotateX: `${interpolate(flip.value, [0, 1], [180, 360])}deg` },
        { scale: interpolate(flip.value, [0, 1], [1, 0.96]) },
      ],
      backfaceVisibility: 'hidden',
      position: 'absolute',
      inset: 0,
      zIndex: flip.value > 0.5 ? 2 : 0,
    }));

    return (
      <View style={styles.plantCard}>
        <TouchableOpacity
          style={styles.absoluteFill}
          onPress={handleCardPress}
          activeOpacity={1}
          disabled={showActionText}>
          <Animated.View style={[frontStyle]} pointerEvents={!showActionText ? 'auto' : 'none'}>
            <LinearGradient
              colors={item.gradientColors!}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.gradient}>
              <Image source={item.image} style={styles.image} />

              <View style={styles.infoColumn}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.points}>{item.description}</Text>
              </View>
              <TouchableOpacity style={styles.plantCardActionButton} onPress={onActionPress}>
                <FontAwesome6 name="repeat" size={20} color="white" />
              </TouchableOpacity>
            </LinearGradient>
          </Animated.View>
        </TouchableOpacity>

        {/* BACK */}
        <Animated.View style={[backStyle]} pointerEvents={showActionText ? 'auto' : 'none'}>
          <LinearGradient
            colors={item.gradientColors!}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.backGradient}>
            <View style={styles.backContent}>
              <Text style={styles.backTitle}>Edit Plant</Text>

              <View style={styles.backRow}>
                <View style={styles.column}>
                  <View style={styles.field}>
                    <Text style={styles.label}>Name</Text>
                    <TextInput
                      style={styles.input}
                      value={editedName}
                      onChangeText={setEditedName}
                    />
                  </View>

                  <View style={styles.field}>
                    <Text style={styles.label}>Description</Text>
                    <TextInput
                      style={styles.input}
                      value={editedDescription}
                      onChangeText={setEditedDescription}
                    />
                  </View>
                </View>

                <View style={styles.column}>
                  <View style={styles.field}>
                    <Text style={styles.label}>Plant Type</Text>
                    <TextInput
                      style={styles.input}
                      value={editedType}
                      onChangeText={setEditedType}
                    />
                  </View>
                  <Text style={styles.label}></Text>
                  <View style={styles.buttonRow}>
                    <TouchableOpacity style={styles.input} onPress={handleSave}>
                      <Text style={styles.saveText}>Save</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.input} onPress={onActionPress}>
                      <Text style={styles.saveText}>Cancel</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </View>

            <TouchableOpacity style={styles.plantCardActionButton} onPress={onActionPress}>
              <FontAwesome6 name="repeat" size={20} color="white" />
            </TouchableOpacity>
          </LinearGradient>
        </Animated.View>
      </View>
    );
  }
);
