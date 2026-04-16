import React, { useState, useEffect } from 'react';
import { View, Text, Image, TouchableOpacity, TextInput, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import { FontAwesome6, MaterialCommunityIcons } from '@expo/vector-icons';
import Feather from '@expo/vector-icons/Feather';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { decode } from 'base64-arraybuffer';
import { db } from '../../../utils/supabase';
import { useUserStore } from '../../../stores/UserStore';
import { styles, vw, vh } from '../styles/plantStyles';
import { PlantItem } from '../types/plant.types';
import { useNavigation } from '@react-navigation/native';
import { playSound } from '~/utils/SoundManager';
import AlertModal from '../../../components/AlertModal';
import { formatPlantBoxLastSeen } from '../api/plantBox';
import { showActionSheet, showAlertDialog } from '~/services/appDialog';

interface Props {
  item: PlantItem;
  index: number;
  onActionPress: (nextOpen?: boolean) => void;
  showActionText: boolean;
  refreshPlants: () => void | Promise<void>;
  onPress: () => void;
  cardHeight?: number;
  cardWidth?: number;
}

export const PlantCard = React.memo(
  ({
    item,
    onActionPress,
    showActionText,
    refreshPlants,
    onPress,
    cardHeight,
    cardWidth,
  }: Props) => {
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
    const [isSaving, setIsSaving] = useState(false);
    const [isClosingEditor, setIsClosingEditor] = useState(false);

    const [modalVisible, setModalVisible] = useState(false);
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

    const getSaveErrorMessage = (error: any) => {
      const message = error?.message ?? '';

      if (error?.code === '42703' && message.includes('plant_id')) {
        return (
          'The plant was not saved because the database update policy or trigger for Plants still ' +
          'references plant_id. Plants uses id as its primary key. Run the Supabase SQL fix in ' +
          'supabase/sql/fix_plants_update_policy.sql.'
        );
      }

      return message || 'Could not update plant.';
    };

    const closeEditor = () => {
      console.log('[PlantCard] close editor', { plantId: item.id });
      setIsClosingEditor(true);
      setTypeDropdownOpen(false);
      setModalVisible(false);
      onActionPress(false);

      setTimeout(() => {
        setIsClosingEditor(false);
      }, 450);
    };

    const refreshAfterEditorClose = () => {
      setTimeout(() => {
        try {
          console.log('[PlantCard] refresh plants after save', { plantId: item.id });
          void Promise.resolve(refreshPlants()).catch((error) => {
            console.error('[PlantCard] refresh plants failed after save', {
              plantId: item.id,
              error,
            });
          });
        } catch (error) {
          console.error('[PlantCard] refresh plants threw after save', {
            plantId: item.id,
            error,
          });
        }
      }, 520);
    };

    const pickImage = async () => {
      const selection = await showActionSheet({
        title: 'Upload Photo',
        message: 'Choose a photo source',
        buttons: [
          { key: 'camera', label: 'Camera' },
          { key: 'gallery', label: 'Gallery' },
          { key: 'cancel', label: 'Cancel', role: 'cancel' },
        ],
      });

      if (selection === 'camera') {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          await showAlertDialog({
            title: 'Permission Denied',
            message: 'Camera permissions are required.',
            variant: 'warning',
          });
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
        return;
      }

      if (selection === 'gallery') {
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
      }
    };

    const uploadCustomImage = async (plantId: string): Promise<string | null> => {
      if (!customImageUri) return null;

      const base64FileData =
        customImageBase64 ||
        (await FileSystem.readAsStringAsync(customImageUri, {
          encoding: FileSystem.EncodingType.Base64,
        }));
      const fileExtMatch = customImageUri.match(/\.([a-zA-Z0-9]+)(?:\?|$)/);
      const fileExt = (fileExtMatch?.[1] || 'jpg').toLowerCase();
      const normalizedExt = fileExt === 'jpeg' ? 'jpg' : fileExt;
      const contentType = normalizedExt === 'jpg' ? 'image/jpeg' : `image/${normalizedExt}`;
      const fileName = `${plantId}-${Date.now()}.${normalizedExt}`;

      const { data, error } = await db.public.storage
        .from('plant-images')
        .upload(fileName, decode(base64FileData), {
          contentType,
          upsert: false,
        });

      if (error) {
        throw new Error(`Image upload failed: ${error.message}`);
      }

      return data?.path || null;
    };

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
      let uploadedImagePath: string | null = null;
      const hasNewImage = !!customImageUri && customImageUri !== item.image_url;
      const hasChanges =
        hasNewImage ||
        editedName !== item.name ||
        editedDescription !== item.description ||
        editedType !== item.type_id;

      console.log('[PlantCard] save pressed', {
        plantId: item.id,
        hasChanges,
        hasNewImage,
        nameChanged: editedName !== item.name,
        descriptionChanged: editedDescription !== item.description,
        typeChanged: editedType !== item.type_id,
      });

      if (!hasChanges) {
        playSound('flip');
        closeEditor();
        return;
      }

      try {
        setIsSaving(true);
        console.log('[PlantCard] save started', { plantId: item.id });

        if (hasNewImage) {
          if (!user) {
            throw new Error('You must be logged in to upload a plant image.');
          }

          console.log('[PlantCard] uploading plant image', { plantId: item.id });
          const uploadedUrl = await uploadCustomImage(item.id);
          if (uploadedUrl) {
            uploadedImagePath = uploadedUrl;
          } else {
            throw new Error('Image upload failed.');
          }
        }

        const updates: {
          nickname: string;
          description: string;
          plant_data_id?: number;
          image_url?: string;
        } = {
          nickname: editedName,
          description: editedDescription,
          plant_data_id: editedType,
        };

        if (uploadedImagePath) {
          updates.image_url = uploadedImagePath;
        }

        console.log('[PlantCard] updating plant row', { plantId: item.id, updates });
        const { error } = await db.social.from('Plants').update(updates).eq('id', item.id);

        if (error) {
          throw error;
        }

        console.log('[PlantCard] update complete', { plantId: item.id });
        setCustomImageBase64(null);
        playSound('flip');
        closeEditor();
        refreshAfterEditorClose();
      } catch (err: any) {
        console.warn('[PlantCard] save failed', { plantId: item.id, error: err });
        showModal('error', 'Update Failed', getSaveErrorMessage(err));
      } finally {
        console.log('[PlantCard] save finished', { plantId: item.id });
        setIsSaving(false);
      }
    };

    const handleDelete = async () => {
      playSound('bin');
      const { error } = await db.social.from('Plants').delete().eq('id', item.id);

      if (error) {
        console.log('Update error:', error);
        return;
      }

      void Promise.resolve(refreshPlants()).catch((refreshError) => {
        console.error('[PlantCard] refresh plants failed after delete', {
          plantId: item.id,
          error: refreshError,
        });
      });
    };

    const handleOpenLinkSensor = () => {
      navigation.navigate('LinkSensor', { plantId: item.id });
    };

    const handleCardPress = () => {
      if (!showActionText) {
        onPress();
      }
    };

    useEffect(() => {
      flip.value = withTiming(showActionText ? 1 : 0, {
        duration: 450,
        easing: Easing.out(Easing.cubic),
      });
    }, [flip, showActionText]);

    const frontStyle = useAnimatedStyle(() => ({
      opacity: interpolate(flip.value, [0, 0.45, 0.55, 1], [1, 1, 0, 0]),
      transform: [
        { perspective: 1000 },
        { rotateY: `${interpolate(flip.value, [0, 1], [0, 180])}deg` },
      ],
      backfaceVisibility: 'hidden',
    }));

    const backStyle = useAnimatedStyle(() => ({
      opacity: interpolate(flip.value, [0, 0.45, 0.55, 1], [0, 0, 1, 1]),
      transform: [
        { perspective: 1000 },
        { rotateY: `${interpolate(flip.value, [0, 1], [180, 360])}deg` },
      ],
      backfaceVisibility: 'hidden',
    }));

    return (
      <View
        style={[
          styles.plantCard,
          showActionText && styles.plantCardExpanded,
          cardWidth ? { width: cardWidth } : null,
          cardHeight ? { height: cardHeight } : null,
        ]}>
        {/* FRONT */}
        <Animated.View
          style={[styles.absoluteFill, frontStyle, { zIndex: showActionText ? 0 : 2 }]}
          pointerEvents={!showActionText ? 'auto' : 'none'}>
          <TouchableOpacity
            style={styles.absoluteFill}
            onPress={handleCardPress}
            activeOpacity={1}
            testID="PlantCard">
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
                    onActionPress(true);
                  }}>
                  <FontAwesome6 name="repeat" size={24} color="white" />
                </TouchableOpacity>

                <TouchableOpacity onPress={handleDelete}>
                  <FontAwesome5 name="trash-alt" size={24} color="white" />
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>

        {/* BACK */}
        {(showActionText || isClosingEditor) && (
          <Animated.View
            style={[styles.absoluteFill, backStyle, { zIndex: showActionText ? 2 : 0 }]}
            pointerEvents={showActionText && !isClosingEditor ? 'auto' : 'none'}>
            <LinearGradient
              colors={item.gradientColors!}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.backGradient}>
              <View style={styles.backContent}>
                <View
                  style={{ flexDirection: 'row', alignItems: 'center', marginBottom: vh * 1.4 }}>
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
                        backgroundColor: 'rgba(255,255,255,0.18)',
                      }}
                      resizeMode="cover"
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
                    <TextInput
                      style={styles.input}
                      value={editedName}
                      onChangeText={setEditedName}
                    />
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
                        <Text
                          style={{ color: styles.input.color, flexShrink: 1 }}
                          numberOfLines={1}>
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
                      onPress={handleOpenLinkSensor}>
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
                      closeEditor();
                    }}>
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.saveButton}
                    onPress={handleSave}
                    disabled={isSaving}
                    activeOpacity={0.8}>
                    <Text style={styles.buttonText}>{isSaving ? 'Saving...' : 'Save'}</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity
                style={styles.plantCardActionButton}
                onPress={() => {
                  playSound('flip');
                  closeEditor();
                }}>
                <FontAwesome6 name="repeat" size={24} color="white" />
              </TouchableOpacity>
            </LinearGradient>
          </Animated.View>
        )}

        {modalVisible && (
          <AlertModal
            visible={modalVisible}
            type={modalConfig.type}
            title={modalConfig.title}
            message={modalConfig.message}
            onClose={() => {
              setModalVisible(false);
              if (modalConfig.type === 'success') {
                closeEditor();
              }
            }}
          />
        )}
      </View>
    );
  }
);
