import React, { useState, useEffect } from 'react';
import { View, Text, Image, TouchableOpacity, TextInput, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  withTiming,
  interpolate,
  useAnimatedStyle,
  Easing,
} from 'react-native-reanimated';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import { FontAwesome6 } from '@expo/vector-icons';
import { db } from '../../../utils/supabase';
import { styles, vw, vh } from '../styles/plantStyles';
import { PlantItem } from '../types/plant.types';
import { useNavigation } from '@react-navigation/native';
import { playSound } from '~/utils/SoundManager';

interface Props {
  item: PlantItem;
  index: number;
  onActionPress: () => void;
  showActionText: boolean;
  refreshPlants: () => void;
  onPress: () => void;
}

export const PlantCard = React.memo(
  ({ item, onActionPress, showActionText, refreshPlants, onPress }: Props) => {
    const navigation = useNavigation<any>();
    const flip = useSharedValue(showActionText ? 1 : 0);
    const [typeDropdownOpen, setTypeDropdownOpen] = useState(false);

    const [editedName, setEditedName] = useState(item.name);
    const [editedType, setEditedType] = useState(item.type_id);
    const [editedDescription, setEditedDescription] = useState(item.description);

    const [plantTypes, setPlantTypes] = useState<{ id: number; name: string }[]>([]);

    // Flip animation
    useEffect(() => {
      flip.value = withTiming(showActionText ? 1 : 0, {
        duration: 700,
        easing: Easing.out(Easing.cubic),
      });
    }, [showActionText]);

    // Fetch plant types
    useEffect(() => {
      const fetchTypes = async () => {
        const { data, error } = await db.social
          .from('Plant_data')
          .select('id, common_name')
          .order('common_name', { ascending: true });

        if (error) {
          console.log('Error fetching plant types:', error);
          return;
        }

        setPlantTypes(data.map((p) => ({ id: p.id, name: p.common_name })));
      };

      fetchTypes();
    }, []);

    // Save data
    const handleSave = async () => {
      const { error } = await db.social
        .from('Plants')
        .update({
          nickname: editedName,
          description: editedDescription,
          plant_data_id: editedType,
        })
        .eq('id', item.id);

      if (error) {
        console.log('Update error:', error);
        return;
      }

      playSound('flip');
      await refreshPlants();
      onActionPress();
    };

    const handleDelete = async () => {
      playSound('bin');
      const { error } = await db.social.from('Plants').delete().eq('id', item.id);

      if (error) {
        console.log('Update error:', error);
        return;
      }

      await refreshPlants();
    };

    const handleCardPress = () => {
      if (!showActionText) {
        onPress();
      }
    };

    // FRONT ANIMATION STYLE
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

    // BACK ANIMATION STYLE
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
        {/* FRONT */}
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

              {/* RIGHT ICONS */}
              <View
                style={{
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  height: '100%',
                }}>
                <TouchableOpacity onPress={() => { playSound('flip'); onActionPress(); }}>
                  <FontAwesome6 name="repeat" size={24} color="white" />
                </TouchableOpacity>

                <TouchableOpacity onPress={handleDelete}>
                  <FontAwesome5 name="trash-alt" size={24} color="white" />
                </TouchableOpacity>
              </View>
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
                {/* LEFT SIDE */}
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

                {/* RIGHT SIDE */}
                <View style={styles.column}>
                  <View style={styles.field}>
                    <Text style={styles.label}>Plant Type</Text>

                    <View style={{ width: '100%', zIndex: 20 }}>
                      {/* DROPDOWN BUTTON */}
                      <TouchableOpacity
                        style={[
                          styles.input,
                          {
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                          },
                        ]}
                        onPress={() => setTypeDropdownOpen((prev) => !prev)}>
                        <Text style={{ color: styles.input.color, flexShrink: 1 }} numberOfLines={1}>
                          {plantTypes.find((t) => t.id === editedType)?.name || 'Select type'}
                        </Text>

                        <FontAwesome6 name="chevron-down" size={10} color={styles.label.color} />
                      </TouchableOpacity>

                      {/* DROPDOWN LIST */}
                      {typeDropdownOpen && (
                        <View
                          style={{
                            position: 'absolute',
                            top: '100%',
                            left: 0,
                            right: 0,
                            backgroundColor: 'rgba(0,0,0,0.8)',
                            borderRadius: 8,
                            marginTop: 4,
                            maxHeight: vh * 20, // Increased height
                            zIndex: 100,
                            padding: 4
                          }}>
                          <ScrollView showsVerticalScrollIndicator={true}>
                            {plantTypes.map((type) => (
                              <TouchableOpacity
                                key={type.id}
                                style={{ paddingVertical: 8, paddingHorizontal: 10 }}
                                onPress={() => {
                                  setEditedType(type.id);
                                  setTypeDropdownOpen(false);
                                }}>
                                <Text style={{ color: 'white', fontSize: 12 }} numberOfLines={1}>
                                  {type.name}
                                </Text>
                              </TouchableOpacity>
                            ))}
                          </ScrollView>
                        </View>
                      )}
                    </View>
                  </View>
                  <Text style={styles.label}></Text>

                  <View style={styles.buttonRow}>
                    <TouchableOpacity style={styles.cancelButton} onPress={() => { playSound('flip'); onActionPress(); }}>
                      <Text style={styles.cancelButtonText}>Cancel</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                      <Text style={styles.buttonText}>Save</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </View>

            <TouchableOpacity style={styles.plantCardActionButton} onPress={() => { playSound('flip'); onActionPress(); }}>
              <FontAwesome6 name="repeat" size={24} color="white" />
            </TouchableOpacity>
          </LinearGradient>
        </Animated.View>
      </View>
    );
  }
);
