import React, { useState, useEffect } from 'react';
import { View, Text, Image, TouchableOpacity, TextInput, ScrollView, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  withTiming,
  interpolate,
  useAnimatedStyle,
  Easing,
} from 'react-native-reanimated';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import { FontAwesome6, MaterialCommunityIcons } from '@expo/vector-icons';
import Feather from '@expo/vector-icons/Feather';
import * as ImagePicker from 'expo-image-picker';
import { decode } from 'base64-arraybuffer';
import { db } from '../../../utils/supabase';
import { useUserStore } from '../../../stores/UserStore';
import { styles, vw, vh } from '../styles/plantStyles';
import { PlantItem } from '../types/plant.types';
import { useNavigation } from '@react-navigation/native';
import { playSound } from '~/utils/SoundManager';
import AlertModal from '../../../components/AlertModal';
import ConnectPlantBoxModal from '~/components/ConnectPlantBoxModal';
import { ErrorHandlerService } from '~/core/error/services/ErrorHandlerService';
import {
  connectPlantBoxToPlant,
  formatPlantBoxLastSeen,
  validatePlantBoxId,
} from '../api/plantBox';

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
    const [linkedSensorBoxId, setLinkedSensorBoxId] = useState(item.sensorBoxId || null);
    const [linkedSensorLastSeenAt, setLinkedSensorLastSeenAt] = useState(
      item.sensorLastSeenAt || null
    );

    const [plantTypes, setPlantTypes] = useState<{ id: number; name: string }[]>([]);

    const { user } = useUserStore();
    const [customImageUri, setCustomImageUri] = useState<string | null>(item.image_url || null);
    const [customImageBase64, setCustomImageBase64] = useState<string | null>(null);

    const [modalVisible, setModalVisible] = useState(false);
    const [connectPlantBoxVisible, setConnectPlantBoxVisible] = useState(false);
    const [modalConfig, setModalConfig] = useState<{
      type: 'success' | 'error' | 'loading';
      title: string;
      message: string;
    }>({
      type: 'success',
      title: '',
      message: '',
    });

    const showModal = (type: 'success' | 'error' | 'loading', title: string, message: string) => {
      setModalConfig({ type, title, message });
      setModalVisible(true);
    };

    const pickImage = async () => {
      Alert.alert('Upload Photo', 'Choose a photo source', [
        {
          text: 'Camera',
          onPress: async () => {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== 'granted') {
              Alert.alert('Permission Denied', 'Camera permissions are required.');
              return;
            }
            const result = await ImagePicker.launchCameraAsync({
              mediaTypes: 'images',
              allowsEditing: true,
              quality: 0.8,
              base64: true,
            });
            if (!result.canceled && result.assets && result.assets[0]) {
              setCustomImageUri(result.assets[0].uri);
              setCustomImageBase64(result.assets[0].base64 || null);
            }
          },
        },
        {
          text: 'Gallery',
          onPress: async () => {
            const result = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: 'images',
              allowsEditing: true,
              quality: 0.8,
              base64: true,
            });
            if (!result.canceled && result.assets && result.assets[0]) {
              setCustomImageUri(result.assets[0].uri);
              setCustomImageBase64(result.assets[0].base64 || null);
            }
          },
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]);
    };

    const uploadCustomImage = async (plantId: string): Promise<string | null> => {
      if (!customImageUri || !customImageBase64) return null;
      try {
        const fileExt = customImageUri.split('.').pop() || 'jpg';
        const fileName = `${plantId}.${fileExt}`;
        const { data, error } = await db.public.storage
          .from('plant-images')
          .upload(fileName, decode(customImageBase64), {
            contentType: `image/${fileExt === 'jpg' ? 'jpeg' : fileExt}`,
            upsert: true, // Overwrite if changing avatar
          });

        if (error) throw error;
        return data?.path || null;
      } catch (e) {
        ErrorHandlerService.handle(e, { showUI: false });
        return null;
      }
    };

    // Flip animation
    useEffect(() => {
      flip.value = withTiming(showActionText ? 1 : 0, {
        duration: 700,
        easing: Easing.out(Easing.cubic),
      });
    }, [showActionText]);

    useEffect(() => {
      setLinkedSensorBoxId(item.sensorBoxId || null);
      setLinkedSensorLastSeenAt(item.sensorLastSeenAt || null);
    }, [item.sensorBoxId, item.sensorLastSeenAt]);

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
      let finalImageUrl = item.image_url;

      try {
        // If a NEW image was selected (we have base64 data)
        if (customImageBase64 && user) {
          const uploadedUrl = await uploadCustomImage(item.id);
          if (uploadedUrl) {
            finalImageUrl = uploadedUrl;
          } else {
            throw new Error('Image upload failed.');
          }
        }

        const { error } = await db.social
          .from('Plants')
          .update({
            nickname: editedName,
            description: editedDescription,
            plant_data_id: editedType,
            image_url: finalImageUrl,
          })
          .eq('id', item.id);

        if (error) {
          throw error;
        }

        playSound('flip');
        await refreshPlants();
        // Only clear base64, so if they flip it back we still show the new image or original url
        setCustomImageBase64(null);
        showModal('success', 'Saved!', 'Plant updated successfully.');
      } catch (err: any) {
        ErrorHandlerService.handle(err, { showUI: false });
        showModal('error', 'Update Failed', err.message || 'Could not update plant.');
      }
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

    const handlePlantBoxConnect = async (sensorBoxId: string) => {
      const validation = await validatePlantBoxId(sensorBoxId);

      if (!validation.isValid) {
        throw new Error(validation.message);
      }

      if (validation.existingPlantId && validation.existingPlantId !== item.id) {
        throw new Error('This PlantBox is already connected to another plant.');
      }

      await connectPlantBoxToPlant({
        sensorBoxId: validation.sensorBoxId ?? sensorBoxId.trim(),
        plantId: item.id,
        userId: user?.id,
      });

      setLinkedSensorBoxId(validation.sensorBoxId ?? sensorBoxId.trim());
      setLinkedSensorLastSeenAt(validation.latestSeenAt ?? null);
      await refreshPlants();
      showModal('success', 'PlantBox Connected', 'The PlantBox is now linked to this plant.');
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
      <View style={[styles.plantCard, showActionText && styles.plantCardExpanded]}>
        {/* FRONT */}
        <TouchableOpacity
          style={styles.absoluteFill}
          onPress={handleCardPress}
          activeOpacity={1}
          disabled={showActionText}
          testID="PlantCard">
          <Animated.View style={[frontStyle]} pointerEvents={!showActionText ? 'auto' : 'none'}>
            <LinearGradient
              colors={item.gradientColors!}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.gradient}>
              {item.image_url ? (
                <Image source={{ uri: item.image_url }} style={styles.image} />
              ) : (
                <Image source={item.image} style={styles.image} />
              )}

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
                <TouchableOpacity
                  onPress={() => navigation.navigate('PlantTimeline', { plantId: item.id })}>
                  <MaterialCommunityIcons name="cassette" size={26} color="white" />
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => {
                    playSound('flip');
                    onActionPress();
                  }}>
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
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: vh * 1.4 }}>
                <TouchableOpacity onPress={pickImage}>
                  <Image
                    source={
                      customImageUri
                        ? { uri: customImageUri }
                        : item.image_url
                          ? { uri: item.image_url }
                          : item.image
                    }
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 24,
                      borderWidth: 2,
                      borderColor: 'white',
                    }}
                  />
                  <View
                    style={{
                      position: 'absolute',
                      bottom: -2,
                      right: -2,
                      backgroundColor: 'rgba(0,0,0,0.5)',
                      borderRadius: 10,
                      padding: 3,
                    }}>
                    <Feather name="camera" size={10} color="white" />
                  </View>
                </TouchableOpacity>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={[styles.backTitle, { marginBottom: 2, fontSize: vw * 5 }]}>
                    Edit Plant
                  </Text>
                  <TouchableOpacity onPress={pickImage}>
                    <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11 }}>
                      Flip to edit, tap photo to update
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={styles.backScrollContent}
                keyboardShouldPersistTaps="handled"
                nestedScrollEnabled>
                <View style={styles.field}>
                  <Text style={styles.label}>Name</Text>
                  <TextInput style={styles.input} value={editedName} onChangeText={setEditedName} />
                </View>

                <View style={styles.field}>
                  <Text style={styles.label}>Plant Type</Text>

                  <View style={{ width: '100%', zIndex: 20 }}>
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

                    {typeDropdownOpen && (
                      <View
                        style={{
                          position: 'absolute',
                          top: '100%',
                          left: 0,
                          right: 0,
                          backgroundColor: 'rgba(0,0,0,0.88)',
                          borderRadius: 12,
                          marginTop: 4,
                          maxHeight: vh * 20,
                          zIndex: 100,
                          padding: 4,
                        }}>
                        <ScrollView
                          showsVerticalScrollIndicator
                          keyboardShouldPersistTaps="handled">
                          {plantTypes.map((type) => (
                            <TouchableOpacity
                              key={type.id}
                              style={{ paddingVertical: 10, paddingHorizontal: 10 }}
                              onPress={() => {
                                setEditedType(type.id);
                                setTypeDropdownOpen(false);
                              }}>
                              <Text style={{ color: 'white', fontSize: 13 }} numberOfLines={1}>
                                {type.name}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                      </View>
                    )}
                  </View>
                </View>

                <View style={styles.field}>
                  <Text style={styles.label}>Description</Text>
                  <TextInput
                    style={[styles.input, styles.inputMultiline]}
                    value={editedDescription}
                    onChangeText={setEditedDescription}
                    multiline
                  />
                </View>

                <View style={styles.sensorCard}>
                  <View style={styles.sensorTitleRow}>
                    <Text style={styles.sensorTitle}>PlantBox</Text>
                    <View
                      style={
                        linkedSensorBoxId ? styles.sensorBadgeConnected : styles.sensorBadgeIdle
                      }>
                      <Text style={styles.sensorBadgeText}>
                        {linkedSensorBoxId ? 'Connected' : 'Not Connected'}
                      </Text>
                    </View>
                  </View>

                  {linkedSensorBoxId ? (
                    <>
                      <Text style={styles.sensorIdText}>{linkedSensorBoxId}</Text>
                      <Text style={styles.sensorHelperText}>
                        Latest reading: {formatPlantBoxLastSeen(linkedSensorLastSeenAt)}
                      </Text>
                    </>
                  ) : (
                    <Text style={styles.sensorHelperText}>
                      Connect a PlantBox to start pulling sensor readings into this plant.
                    </Text>
                  )}

                  <TouchableOpacity
                    style={styles.sensorLinkButton}
                    onPress={() => setConnectPlantBoxVisible(true)}>
                    <Text style={styles.sensorLinkButtonText}>
                      {linkedSensorBoxId ? 'Change PlantBox' : 'Connect PlantBox'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>

              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => {
                    playSound('flip');
                    onActionPress();
                  }}>
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                  <Text style={styles.buttonText}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              style={styles.plantCardActionButton}
              onPress={() => {
                playSound('flip');
                onActionPress();
              }}>
              <FontAwesome6 name="repeat" size={24} color="white" />
            </TouchableOpacity>
          </LinearGradient>
        </Animated.View>

        <AlertModal
          visible={modalVisible}
          type={modalConfig.type}
          title={modalConfig.title}
          message={modalConfig.message}
          onClose={() => {
            setModalVisible(false);
            if (modalConfig.type === 'success') {
              onActionPress(); // flip card back
            }
          }}
        />

        <ConnectPlantBoxModal
          visible={connectPlantBoxVisible}
          onClose={() => setConnectPlantBoxVisible(false)}
          onConnect={handlePlantBoxConnect}
          initialValue={linkedSensorBoxId}
          description="Enter a Sensor Box ID. We’ll confirm that a recent controller entry exists before linking it to this plant."
        />
      </View>
    );
  }
);
