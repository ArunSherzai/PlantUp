import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useUnistyles, StyleSheet } from '~/lib/unistyles';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useState, useEffect } from 'react';
import { ScrollView, GestureHandlerRootView } from 'react-native-gesture-handler';
import Feather from '@expo/vector-icons/Feather';
import * as ImagePicker from 'expo-image-picker';
import { decode } from 'base64-arraybuffer';
import FilledButton from '~/features/auth/components/FilledButton';
import { db } from '~/utils/supabase';
import { useUserStore } from '~/stores/UserStore';
import DraggableBottomSheet from '~/components/DraggableBottomSheet';
import AlertModal from '~/components/AlertModal';
import { getPublicPlantImageUrl } from '~/utils/media';
import { ErrorHandlerService } from '~/core/error/services/ErrorHandlerService';
import {
  connectPlantBoxToPlant,
  fetchAvailablePlantBoxes,
  formatPlantBoxLastSeen,
  validatePlantBoxId,
} from '~/features/plantlist/api/plantBox';

type PlantData = {
  id: number;
  name: string;
  common_name: string;
  scientific_name: string;
  description?: string;
  optimal_temperature?: string;
  optimal_humidity?: string;
  image_url?: string;
  water_frequency?: string;
  sunlight_requirements?: string;
};

export default function AddPlantScreen() {
  const { theme } = useUnistyles();
  const navigation = useNavigation<any>();
  const { user } = useUserStore();
  const [nickname, setNickname] = useState('');
  const [description, setDescription] = useState('');
  const [plantDataId, setPlantDataId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDropdownVisible, setDropdownVisible] = useState(false);
  const [plantDataList, setPlantDataList] = useState<PlantData[]>([]);
  const [isLoadingPlants, setIsLoadingPlants] = useState(true);
  const [customImageUri, setCustomImageUri] = useState<string | null>(null);
  const [customImageBase64, setCustomImageBase64] = useState<string | null>(null);
  const [sensorDropdownVisible, setSensorDropdownVisible] = useState(false);
  const [availableSensors, setAvailableSensors] = useState<
    {
      controllerRecordId: string;
      sensorBoxId: string;
      latestSeenAt: string;
      existingPlantId: string | null;
    }[]
  >([]);
  const [isLoadingSensors, setIsLoadingSensors] = useState(true);
  const [selectedControllerRecordId, setSelectedControllerRecordId] = useState<string | null>(null);
  const [pendingSensorBoxId, setPendingSensorBoxId] = useState<string | null>(null);
  const [pendingSensorLastSeenAt, setPendingSensorLastSeenAt] = useState<string | null>(null);

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
        });

      if (error) throw error;
      return data?.path || null;
    } catch (e) {
      ErrorHandlerService.handle(e, { showUI: false });
      return null;
    }
  };

  // Fetch plant data from the database
  useEffect(() => {
    const fetchPlantData = async () => {
      try {
        setIsLoadingPlants(true);
        const { data, error } = await db.social
          .from('Plant_data')
          .select('*')
          .order('common_name', { ascending: true });

        if (error) {
          ErrorHandlerService.handle(error, { showUI: false });
          throw new Error('Failed to load plant data');
        }

        if (!data || data.length === 0) {
          console.log('No plant data found');
          return;
        }

        // Ensure the data is properly typed as PlantData[]
        const typedData: PlantData[] = data.map((item) => ({
          id: item.id,
          name: item.name || item.common_name || 'Unnamed Plant',
          common_name: item.common_name || item.name || 'Unnamed Plant',
          scientific_name: item.scientific_name || '',
          description: item.description,
          optimal_temperature: item.optimal_temperature,
          optimal_humidity: item.optimal_humidity,
          image_url: getPublicPlantImageUrl(item.image_url) || undefined,
          water_frequency: item.water_frequency,
          sunlight_requirements: item.sunlight_requirements,
        }));
        setPlantDataList(typedData);
      } catch (error) {
        ErrorHandlerService.handle(error, { showUI: false });
        Alert.alert('Error', error instanceof Error ? error.message : 'Failed to load plant data');
      } finally {
        setIsLoadingPlants(false);
      }
    };

    fetchPlantData();
  }, []);

  useEffect(() => {
    const loadAvailableSensors = async () => {
      try {
        setIsLoadingSensors(true);
        const sensors = await fetchAvailablePlantBoxes();
        setAvailableSensors(sensors);
      } catch (error) {
        ErrorHandlerService.handle(error, { showUI: false });
      } finally {
        setIsLoadingSensors(false);
      }
    };

    loadAvailableSensors();
  }, []);

  const toggleDropdown = () => {
    setDropdownVisible(!isDropdownVisible);
  };

  const handleSave = async () => {
    if (!nickname.trim()) {
      Alert.alert('Error', 'Please enter a nickname for your plant');
      return;
    }

    if (!plantDataId) {
      Alert.alert('Error', 'Please select a plant type');
      return;
    }

    try {
      setIsLoading(true);

      // Get the current session
      const {
        data: { user },
        error: sessionError,
      } = await db.public.auth.getUser();

      console.log('Auth session:', {
        hasUser: !!user,
        userId: user?.id,
      });

      if (sessionError) {
        ErrorHandlerService.handle(sessionError, { showUI: false });
        throw new Error('Failed to verify authentication. Please log in again.');
      }

      if (!user) {
        ErrorHandlerService.handle(new Error('No authenticated user found in session'), {
          showUI: false,
        });
        throw new Error('No active session. Please log in again.');
      }

      const userId = user.id;
      console.log('Using user ID from auth session:', userId);

      if (!user) {
        ErrorHandlerService.handle(new Error('User not found in database'), { showUI: false });
        throw new Error('User account not found. Please sign up first.');
      }

      console.log('User verified:', {
        userId: user.id,
        email: user.email,
      });

      // Get the selected plant data
      const selectedPlant = plantDataList.find((plant) => plant.id === plantDataId);

      if (!selectedPlant) {
        throw new Error('Selected plant data not found');
      }

      if (pendingSensorBoxId) {
        const sensorValidation = await validatePlantBoxId(pendingSensorBoxId);

        if (!sensorValidation.isValid) {
          throw new Error(
            sensorValidation.message || 'The selected sensor is no longer available.'
          );
        }

        if (sensorValidation.existingPlantId) {
          throw new Error('The selected sensor is already connected to another plant.');
        }
      }

      // Insert the new plant into the Plants table first (without image)
      const { data: insertedPlant, error: insertError } = await db.social
        .from('Plants')
        .insert([
          {
            nickname: nickname.trim(),
            description: description.trim() || null,
            plant_data_id: plantDataId,
            user_id: user.id,
          },
        ])
        .select()
        .single();

      if (insertError || !insertedPlant) {
        ErrorHandlerService.handle(insertError, { showUI: false });
        throw new Error('Failed to add plant. Please try again.');
      }

      // Upload custom image if provided using the new plant ID
      if (customImageUri) {
        const customImageUrl = await uploadCustomImage(insertedPlant.id);

        if (customImageUrl) {
          const { error: updateError } = await db.social
            .from('Plants')
            .update({ image_url: customImageUrl })
            .eq('id', insertedPlant.id);

          if (updateError) {
            ErrorHandlerService.handle(updateError, { showUI: false });
          }
        }
      }

      if (pendingSensorBoxId) {
        await connectPlantBoxToPlant({
          controllerRecordId: selectedControllerRecordId ?? undefined,
          sensorBoxId: pendingSensorBoxId,
          plantId: insertedPlant.id,
          userId: user.id,
        });
      }

      showModal('success', 'Success!', 'Your plant has been successfully uploaded.');
    } catch (error) {
      ErrorHandlerService.handle(error, { showUI: false });
      showModal(
        'error',
        'Error',
        error instanceof Error ? error.message : 'An unknown error occurred'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={styles.container}>
        {/* Header Background */}
        <View style={styles.headerBg}>
          <Image
            source={require('../../../../assets/images/updatePlant.png')}
            style={styles.headerImage}
            resizeMode="cover"
          />
          <TouchableOpacity style={styles.arrowIcon} onPress={() => navigation.goBack()}>
            <Feather name="arrow-left" size={24} color={theme.colors.textDark} />
          </TouchableOpacity>
          <View style={styles.headerContainer}>
            <Text style={styles.headerTitle}>Add</Text>
            <Text style={styles.headerTitle}>your</Text>
            <Text style={styles.headerTitle}>Plant!</Text>
          </View>
        </View>

        {/* Draggable Bottom Sheet */}
        <DraggableBottomSheet initialHeight={0.59} maxHeight={0.85}>
          <ScrollView
            overScrollMode="never"
            style={styles.formScrollView}
            contentContainerStyle={styles.formContentContainer}
            keyboardShouldPersistTaps="handled">
            <View style={{ alignItems: 'center', marginBottom: 20 }}>
              <TouchableOpacity onPress={pickImage} style={styles.imagePickerButton}>
                {customImageUri ? (
                  <Image source={{ uri: customImageUri }} style={styles.imagePickerImage} />
                ) : plantDataId && plantDataList.find((p) => p.id === plantDataId)?.image_url ? (
                  <Image
                    source={{ uri: plantDataList.find((p) => p.id === plantDataId)?.image_url }}
                    style={styles.imagePickerImage}
                  />
                ) : (
                  <Image style={styles.imagePickerImage} />
                )}
                <View style={styles.editIconContainer}>
                  <Feather name="edit-2" size={16} color="white" />
                </View>
              </TouchableOpacity>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Nickname*</Text>
              <TextInput
                style={styles.input}
                value={nickname}
                onChangeText={setNickname}
                placeholder="Enter plant nickname"
                placeholderTextColor={theme.colors.text}
                maxLength={50}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Plant Type*</Text>
              <TouchableOpacity
                style={styles.dropdownButton}
                onPress={toggleDropdown}
                activeOpacity={0.8}>
                <View style={styles.selectedPlantContainer}>
                  {plantDataId && plantDataList.find((p) => p.id === plantDataId)?.image_url && (
                    <Image
                      source={{ uri: plantDataList.find((p) => p.id === plantDataId)?.image_url }}
                      style={styles.selectedPlantImage}
                      resizeMode="cover"
                    />
                  )}
                  <Text style={styles.dropdownButtonText}>
                    {plantDataId
                      ? plantDataList.find((p) => p.id === plantDataId)?.name || 'Select plant type'
                      : 'Select plant type'}
                  </Text>
                </View>
                <Feather
                  name={isDropdownVisible ? 'chevron-up' : 'chevron-down'}
                  size={20}
                  color={theme.colors.text}
                />
              </TouchableOpacity>

              {isDropdownVisible && (
                <View style={styles.dropdownContainer}>
                  <ScrollView style={styles.dropdownScrollView} keyboardShouldPersistTaps="handled">
                    {isLoadingPlants ? (
                      <View style={styles.dropdownItem}>
                        <ActivityIndicator size="small" color={theme.colors.primary} />
                        <Text style={[styles.dropdownItemText, { marginLeft: 10 }]}>
                          Loading plants...
                        </Text>
                      </View>
                    ) : plantDataList.length > 0 ? (
                      plantDataList.map((plant) => (
                        <TouchableOpacity
                          key={plant.id}
                          style={styles.dropdownItem}
                          onPress={() => {
                            setPlantDataId(plant.id);
                            setDropdownVisible(false);
                          }}>
                          <View style={styles.plantItem}>
                            {plant.image_url && (
                              <Image
                                source={{ uri: plant.image_url }}
                                style={styles.plantImage}
                                resizeMode="cover"
                              />
                            )}
                            <View style={styles.plantInfo}>
                              <Text style={styles.dropdownItemText}>{plant.common_name}</Text>
                              {plant.scientific_name && (
                                <Text style={styles.dropdownItemScientific}>
                                  {plant.scientific_name}
                                </Text>
                              )}
                            </View>
                          </View>
                        </TouchableOpacity>
                      ))
                    ) : (
                      <Text style={styles.dropdownItem}>
                        No plant types available. Please try again later.
                      </Text>
                    )}
                  </ScrollView>
                </View>
              )}
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Description</Text>
              <TextInput
                style={[styles.input, { minHeight: 100, textAlignVertical: 'top' }]}
                value={description}
                onChangeText={setDescription}
                placeholder="Tell us about your plant..."
                placeholderTextColor={theme.colors.text}
                multiline
                numberOfLines={4}
                maxLength={500}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>PlantBox</Text>
              <View style={styles.sensorCard}>
                <View style={styles.sensorHeaderRow}>
                  <Text style={styles.sensorTitle}>Sensor Connection</Text>
                  <View
                    style={
                      pendingSensorBoxId ? styles.sensorBadgeConnected : styles.sensorBadgeIdle
                    }>
                    <Text style={styles.sensorBadgeText}>
                      {pendingSensorBoxId ? 'Ready' : 'Not Connected'}
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.dropdownButton}
                  onPress={() => setSensorDropdownVisible((current) => !current)}
                  activeOpacity={0.8}>
                  <View style={styles.selectedPlantContainer}>
                    <Text style={styles.dropdownButtonText}>
                      {pendingSensorBoxId ? pendingSensorBoxId : 'Select a sensor'}
                    </Text>
                  </View>
                  <Feather
                    name={sensorDropdownVisible ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color={theme.colors.text}
                  />
                </TouchableOpacity>

                {sensorDropdownVisible && (
                  <View style={styles.dropdownContainer}>
                    <ScrollView
                      style={styles.dropdownScrollView}
                      keyboardShouldPersistTaps="handled">
                      {isLoadingSensors ? (
                        <View style={styles.dropdownItem}>
                          <ActivityIndicator size="small" color={theme.colors.primary} />
                          <Text style={[styles.dropdownItemText, { marginLeft: 10 }]}>
                            Loading sensors...
                          </Text>
                        </View>
                      ) : availableSensors.length > 0 ? (
                        availableSensors.map((sensor) => (
                          <TouchableOpacity
                            key={sensor.controllerRecordId}
                            style={styles.dropdownItem}
                            onPress={() => {
                              setSelectedControllerRecordId(sensor.controllerRecordId);
                              setPendingSensorBoxId(sensor.sensorBoxId);
                              setPendingSensorLastSeenAt(sensor.latestSeenAt);
                              setSensorDropdownVisible(false);
                            }}>
                            <View style={styles.sensorOptionRow}>
                              <Text style={styles.dropdownItemText}>{sensor.sensorBoxId}</Text>
                              <Text style={styles.dropdownItemScientific}>
                                Controller row: {sensor.controllerRecordId}
                              </Text>
                              <Text style={styles.dropdownItemScientific}>
                                Latest: {formatPlantBoxLastSeen(sensor.latestSeenAt)}
                              </Text>
                              <Text
                                style={[
                                  styles.dropdownItemScientific,
                                  sensor.existingPlantId && styles.sensorLinkedText,
                                ]}>
                                {sensor.existingPlantId
                                  ? `Already linked to plant ${sensor.existingPlantId}`
                                  : 'Currently unlinked'}
                              </Text>
                            </View>
                          </TouchableOpacity>
                        ))
                      ) : (
                        <Text style={styles.dropdownItem}>
                          No recent sensors are currently available.
                        </Text>
                      )}
                    </ScrollView>
                  </View>
                )}

                {pendingSensorBoxId ? (
                  <>
                    <Text style={styles.sensorIdText}>{pendingSensorBoxId}</Text>
                    <Text style={styles.sensorHelperText}>
                      Latest reading: {formatPlantBoxLastSeen(pendingSensorLastSeenAt)}
                    </Text>
                    <Text style={styles.sensorHelperText}>
                      The plant id and selected sensor id will be synced when you save the plant.
                    </Text>
                  </>
                ) : (
                  <Text style={styles.sensorHelperText}>
                    Choose any recent sensor here. If it is already linked, saving this plant will
                    reassign it.
                  </Text>
                )}
              </View>
            </View>

            <FilledButton
              text={isLoading ? 'Saving...' : 'Save Plant'}
              onPress={handleSave}
              disabled={isLoading}
            />
          </ScrollView>
        </DraggableBottomSheet>

        {/* Custom Result Modal */}
        <AlertModal
          visible={modalVisible}
          type={modalConfig.type}
          title={modalConfig.title}
          message={modalConfig.message}
          onClose={() => {
            setModalVisible(false);
            if (modalConfig.type === 'success') {
              navigation.goBack();
            }
          }}
        />
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create((theme) => ({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  headerBg: {
    height: '100%',
    width: '100%',
    position: 'absolute',
    top: 0,
  },
  headerImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  arrowIcon: {
    position: 'absolute',
    top: 50,
    left: 20,
    zIndex: 10,
  },
  headerContainer: {
    position: 'absolute',
    top: 100,
    left: 20,
  },
  headerTitle: {
    fontSize: 48,
    fontWeight: 'bold',
    color: theme.colors.textDark,
  },
  formScrollView: {
    flex: 1,
  },
  formContentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  imagePickerButton: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: theme.colors.background,
    borderWidth: 2,
    borderColor: theme.colors.greyedOut,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  imagePickerImage: {
    width: '100%',
    height: '100%',
    borderRadius: 60,
  },
  imagePickerPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  editIconContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 6,
    width: '100%',
    alignItems: 'center',
  },
  inputContainer: {
    marginBottom: 25,
  },
  sensorCard: {
    borderRadius: 18,
    padding: 16,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.greyedOut,
    gap: 8,
  },
  sensorHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sensorTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: theme.colors.text,
  },
  sensorBadgeConnected: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: 'rgba(64,176,108,0.18)',
  },
  sensorBadgeIdle: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: 'rgba(0,0,0,0.06)',
  },
  sensorBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.text,
  },
  sensorIdText: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.text,
  },
  sensorHelperText: {
    fontSize: 13,
    lineHeight: 19,
    color: theme.colors.text,
    opacity: 0.75,
  },
  sensorActionButton: {
    marginTop: 8,
    minHeight: 46,
    borderRadius: 14,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sensorActionButtonText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#fff',
  },
  sensorOptionRow: {
    gap: 4,
  },
  sensorLinkedText: {
    color: '#C96B1A',
  },
  label: {
    fontSize: 16,
    fontFamily: theme.fonts.regular,
    color: theme.colors.text,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.greyedOut,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: theme.colors.text,
    backgroundColor: theme.colors.background,
  },
  dropdownButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.greyedOut,
    borderRadius: 8,
    padding: 12,
    backgroundColor: theme.colors.background,
  },
  dropdownButtonText: {
    fontSize: 16,
    color: theme.colors.text,
  },
  dropdownContainer: {
    maxHeight: 200,
    borderWidth: 1,
    borderColor: theme.colors.greyedOut,
    borderRadius: 8,
    marginTop: 5,
    backgroundColor: theme.colors.background,
    elevation: 3,
    zIndex: 1000,
  },
  dropdownScrollView: {
    maxHeight: 196,
  },
  dropdownItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.greyedOut,
    backgroundColor: theme.colors.background,
  },
  selectedPlantContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  selectedPlantImage: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginRight: 10,
  },
  plantItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  plantImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  plantInfo: {
    flex: 1,
  },
  dropdownItemText: {
    fontSize: 16,
    color: theme.colors.text,
    fontWeight: '500',
  },
  dropdownItemScientific: {
    fontSize: 14,
    color: theme.colors.greyedOut,
    marginTop: 2,
    fontStyle: 'italic',
  },
}));
