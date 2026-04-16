import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ScrollView,
  ActivityIndicator,
  TextInput,
  Animated,
  Keyboard,
} from 'react-native';
import { StyleSheet, useUnistyles } from '~/lib/unistyles';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { usePlants } from '~/features/plantlist/hooks/usePlants';
import {
  connectPlantBoxToPlant,
  formatPlantBoxLastSeen,
  PlantBoxOption,
} from '~/features/plantlist/api/plantBox';
import { PlantItem } from '~/features/plantlist/types/plant.types';
import { useUserStore } from '~/stores/UserStore';
import { ErrorHandlerService } from '~/core/error/services/ErrorHandlerService';
import { playSound } from '~/utils/SoundManager';
import AlertModal from '~/components/AlertModal';
import { db } from '~/utils/supabase';

type LinkSensorParams = {
  LinkSensor: {
    plantId?: string;
    onSensorSelected?: (sensor: {
      controllerRecordId: string;
      sensorBoxId: string;
      latestSeenAt: string;
    }) => void;
  };
};

type ScreenState = 'idle' | 'searching' | 'submitting' | 'success' | 'error';

type DeviceLookupResult = {
  found: boolean;
  deviceId?: string;
  sensorBoxId?: string;
  latestSeenAt?: string;
  alreadyAssigned?: boolean;
  assignedUserId?: string | null;
  message?: string;
};

export default function LinkSensorScreen() {
  const { theme } = useUnistyles();
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<LinkSensorParams, 'LinkSensor'>>();
  const insets = useSafeAreaInsets();
  const { user } = useUserStore();
  const { plants, refreshPlants } = usePlants();

  // Route params
  const preSelectedPlantId = route.params?.plantId;
  const onSensorSelected = route.params?.onSensorSelected;

  // Mode: 'connect' when we have a plantId (link directly), 'select' when we need to return selection
  const isSelectMode = !preSelectedPlantId && !!onSensorSelected;
  const isConnectWithPlant = !!preSelectedPlantId;

  // Data state
  const [screenState, setScreenState] = useState<ScreenState>('idle');
  const [plantboxIdInput, setPlantboxIdInput] = useState('');
  const [lookupResult, setLookupResult] = useState<DeviceLookupResult | null>(null);

  // Selection state
  const [selectedPlant, setSelectedPlant] = useState<PlantItem | null>(null);
  const [plantSearchQuery, setPlantSearchQuery] = useState('');

  // Modal state
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

  // Animation
  const fadeAnim = useState(new Animated.Value(0))[0];

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, []);

  // Pre-select plant if plantId is provided
  useEffect(() => {
    if (preSelectedPlantId && plants.length > 0) {
      const plant = plants.find((p) => p.id === preSelectedPlantId);
      if (plant) setSelectedPlant(plant);
    }
  }, [preSelectedPlantId, plants]);

  // Look up the plantbox ID in the devices table
  const handleLookup = async () => {
    const trimmedId = plantboxIdInput.trim();

    if (!trimmedId) {
      setLookupResult({
        found: false,
        message: 'Please enter a PlantBox ID.',
      });
      return;
    }

    Keyboard.dismiss();
    setScreenState('searching');
    setLookupResult(null);

    try {
      // Search for the device in the devices table (microcontroller_schema)
      const { data, error } = await db.micro
        .from('Devices')
        .select('*')
        .eq('id', trimmedId)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        setLookupResult({
          found: false,
          message: 'No PlantBox found with this ID. Please check the ID and try again.',
        });
        setScreenState('idle');
        return;
      }

      // Device found — check if it's already assigned to someone
      const isAlreadyAssigned = !!data.user_id && data.user_id !== user?.id;

      setLookupResult({
        found: true,
        deviceId: data.id,
        sensorBoxId: data.id,
        latestSeenAt: data.last_seen_at ?? data.created_at ?? undefined,
        alreadyAssigned: isAlreadyAssigned,
        assignedUserId: data.user_id,
        message: isAlreadyAssigned
          ? 'This PlantBox is currently registered to someone else. Connecting will reassign it to you.'
          : undefined,
      });

      setScreenState('idle');
    } catch (err: any) {
      ErrorHandlerService.handle(err, { showUI: false });
      setLookupResult({
        found: false,
        message: err.message || 'Failed to look up the PlantBox. Please try again.',
      });
      setScreenState('idle');
    }
  };

  // Filter plants by search query
  const filteredPlants = useMemo(() => {
    if (!plantSearchQuery.trim()) return plants;
    const q = plantSearchQuery.toLowerCase();
    return plants.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q)
    );
  }, [plants, plantSearchQuery]);

  // Handle "Select only" mode — return sensor data back to caller
  const handleSelectSensor = () => {
    if (!lookupResult?.found || !onSensorSelected) return;

    playSound('flip');
    onSensorSelected({
      controllerRecordId: lookupResult.deviceId!,
      sensorBoxId: lookupResult.sensorBoxId!,
      latestSeenAt: lookupResult.latestSeenAt ?? '',
    });
    navigation.goBack();
  };

  // Handle "Connect" mode — link sensor to plant
  const handleLink = async () => {
    if (!lookupResult?.found || !selectedPlant) return;

    setScreenState('submitting');

    try {
      const isAlreadyOurs = lookupResult.assignedUserId === user?.id;
      
      if (!isAlreadyOurs) {
        console.log('[DEBUG] Attempting to claim device (reassign user_id):', { deviceId: lookupResult.deviceId, currentUserId: user?.id });
        
        // This step often fails if RLS prohibits reassigning someone else's device.
        const { data: assignData, error: assignError } = await db.micro
          .from('Devices')
          .update({ user_id: user?.id })
          .eq('id', lookupResult.deviceId!)
          .select()
          .single();

        if (assignError) {
          console.warn('[DEBUG] Device claim failed:', assignError);
          if (assignError.code === 'PGRST116') {
            // This is the most common failure point: RLS blocked the update because the user doesn't own the row yet.
            throw new Error('Database Permission Denied: You cannot claim this PlantBox because it is already registered to another user account.');
          }
          throw assignError;
        }
        console.log('[DEBUG] Device claim successful:', assignData);
      } else {
        console.log('[DEBUG] Device is already ours, skipping user_id update.');
      }

      // 2. Connect the plantbox to the plant (updates plant_id)
      // This is the core persistence step the user is looking for.
      await connectPlantBoxToPlant({
        sensorBoxId: lookupResult.sensorBoxId!,
        plantId: selectedPlant.id,
        userId: user?.id,
      });

      playSound('flip');
      await refreshPlants();
      setScreenState('success');
      setModalConfig({
        type: 'success',
        title: 'Sensor Linked!',
        message: `PlantBox "${lookupResult.sensorBoxId}" is now connected to "${selectedPlant.name}".`,
      });
      setModalVisible(true);
    } catch (err: any) {
      ErrorHandlerService.handle(err, { showUI: false });
      setScreenState('error');
      setModalConfig({
        type: 'error',
        title: 'Connection Failed',
        message: err.message || 'Could not link the sensor to this plant.',
      });
      setModalVisible(true);
    }
  };

  // Handle standalone connect — just assign device to user (no plant)
  const handleConnectToUser = async () => {
    if (!lookupResult?.found) return;

    setScreenState('submitting');

    try {
      console.log('[DEBUG Standalone] Attempting to assign device:', { deviceId: lookupResult.deviceId, currentUserId: user?.id });
      const { data: assignData, error: assignError } = await db.micro
        .from('Devices')
        .update({ user_id: user?.id })
        .eq('id', lookupResult.deviceId!)
        .select()
        .single();

      if (assignError) {
        console.warn('[DEBUG Standalone] Device assignment failed:', assignError);
        if (assignError.code === 'PGRST116') {
          throw new Error('Could not claim PlantBox. It may be registered to someone else.');
        }
        throw assignError;
      }
      console.log('[DEBUG Standalone] Device assignment successful:', assignData);
      if (!assignData) throw new Error('Could not assign PlantBox to your account. Permission denied or ID invalid.');

      playSound('flip');
      setScreenState('success');
      setModalConfig({
        type: 'success',
        title: 'PlantBox Connected!',
        message: `PlantBox "${lookupResult.sensorBoxId}" has been registered to your account.`,
      });
      setModalVisible(true);
    } catch (err: any) {
      ErrorHandlerService.handle(err, { showUI: false });
      setScreenState('error');
      setModalConfig({
        type: 'error',
        title: 'Connection Failed',
        message: err.message || 'Could not register the PlantBox.',
      });
      setModalVisible(true);
    }
  };

  const canSubmitConnect =
    lookupResult?.found && selectedPlant !== null && screenState !== 'submitting';
  const canSubmitSelect =
    lookupResult?.found && screenState !== 'submitting';

  // Determine which header title to show
  const headerTitle = isSelectMode ? 'Select Sensor' : 'Connect Sensor';

  // Show plant selection step?
  const showPlantStep = !isSelectMode && !isConnectWithPlant;

  // Is device ready to connect?
  const deviceReady = lookupResult?.found;

  // ─── Render helpers ──────────────────────────────────────────
  const renderPlantItem = (plant: PlantItem) => {
    const isSelected = selectedPlant?.id === plant.id;
    const alreadyLinked = !!plant.sensorBoxId;

    return (
      <TouchableOpacity
        key={plant.id}
        testID={`plant-option-${plant.id}`}
        style={[
          styles.optionCard,
          isSelected && styles.optionCardSelected,
          alreadyLinked && styles.optionCardDisabled,
        ]}
        activeOpacity={alreadyLinked ? 1 : 0.7}
        onPress={() => {
          if (alreadyLinked) return;
          playSound('click');
          setSelectedPlant(isSelected ? null : plant);
        }}
      >
        <View style={styles.optionIconContainer}>
          {plant.image_url ? (
            <Image
              source={{ uri: plant.image_url }}
              style={styles.plantThumbnail}
            />
          ) : (
            <LinearGradient
              colors={
                plant.gradientColors ?? ([theme.colors.secondary, theme.colors.primary] as [string, string])
              }
              style={styles.optionIconGradient}
            >
              <FontAwesome6
                name="seedling"
                size={18}
                color="#fff"
              />
            </LinearGradient>
          )}
        </View>

        <View style={styles.optionTextContainer}>
          <Text style={styles.optionTitle} numberOfLines={1}>
            {plant.name}
          </Text>
          <Text style={styles.optionSubtitle} numberOfLines={1}>
            {alreadyLinked
              ? `Already linked to ${plant.sensorBoxId?.slice(0, 8)}…`
              : plant.description || 'No description'}
          </Text>
        </View>

        {isSelected && (
          <View style={styles.checkBadge}>
            <FontAwesome6 name="check" size={12} color="#fff" />
          </View>
        )}
        {alreadyLinked && !isSelected && (
          <View style={styles.linkedBadge}>
            <FontAwesome6 name="link" size={10} color={theme.colors.greyedOut} />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderEmptyState = (icon: string, title: string, subtitle: string) => (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconWrapper}>
        <FontAwesome6 name={icon} size={32} color={theme.colors.greyedOut} />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptySubtitle}>{subtitle}</Text>
    </View>
  );

  // ─── Main render ─────────────────────────────────────────────
  return (
    <View style={styles.container}>
      {/* Header Background */}
      <View style={[styles.headerBg, { height: 140 + insets.top }]}>
        <Image
          source={require('../../../../assets/images/profileScreenBackground.png')}
          style={styles.headerGradient}
          resizeMode="cover"
        />
        <View style={styles.headerOverlay} />
      </View>

      <View style={[styles.headerContent, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          testID="link-sensor-back-button"
        >
          <FontAwesome6 name="chevron-left" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{headerTitle}</Text>
      </View>

      <Animated.View style={[styles.roundedContainer, { opacity: fadeAnim }]}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.contentContainer}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── STEP 1: Enter PlantBox ID ─────────────────── */}
          <View style={styles.sectionHeader}>
            <View style={styles.stepBadge}>
              <Text style={styles.stepBadgeText}>1</Text>
            </View>
            <Text style={styles.sectionTitle}>Enter PlantBox ID</Text>
          </View>
          <Text style={styles.sectionSubtitle}>
            Enter the ID printed on your PlantBox to connect it.
          </Text>

          {/* ID Input + Search Button */}
          <View style={styles.idInputRow}>
            <View style={styles.idInputContainer}>
              <FontAwesome6
                name="barcode"
                size={16}
                color={theme.colors.greyedOut}
                style={styles.idInputIcon}
              />
              <TextInput
                style={styles.idInput}
                placeholder="e.g. PB-2024-001"
                placeholderTextColor={theme.colors.greyedOut}
                value={plantboxIdInput}
                onChangeText={(text) => {
                  setPlantboxIdInput(text);
                  // Reset lookup result when input changes
                  if (lookupResult) setLookupResult(null);
                }}
                autoCapitalize="characters"
                autoCorrect={false}
                returnKeyType="search"
                onSubmitEditing={handleLookup}
                testID="plantbox-id-input"
              />
              {plantboxIdInput.length > 0 && (
                <TouchableOpacity
                  onPress={() => {
                    setPlantboxIdInput('');
                    setLookupResult(null);
                  }}
                  style={styles.idInputClear}
                >
                  <FontAwesome6 name="xmark" size={14} color={theme.colors.greyedOut} />
                </TouchableOpacity>
              )}
            </View>

            <TouchableOpacity
              style={[
                styles.searchButton,
                (!plantboxIdInput.trim() || screenState === 'searching') && styles.searchButtonDisabled,
              ]}
              onPress={handleLookup}
              disabled={!plantboxIdInput.trim() || screenState === 'searching'}
              activeOpacity={0.8}
              testID="plantbox-search-button"
            >
              {screenState === 'searching' ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <FontAwesome6 name="magnifying-glass" size={16} color="#fff" />
              )}
            </TouchableOpacity>
          </View>

          {/* Lookup Result */}
          {lookupResult && (
            <View style={[
              styles.resultCard,
              lookupResult.found && styles.resultCardSuccess,
              !lookupResult.found && styles.resultCardError,
            ]}>
              <View style={styles.resultIconRow}>
                <View style={[
                  styles.resultIconCircle,
                  lookupResult.found && styles.resultIconSuccess,
                  !lookupResult.found && styles.resultIconError,
                ]}>
                  <FontAwesome6
                    name={lookupResult.found ? 'circle-check' : 'circle-xmark'}
                    size={20}
                    color="#fff"
                  />
                </View>
                <View style={styles.resultTextContainer}>
                  <Text style={styles.resultTitle}>
                    {lookupResult.found
                      ? lookupResult.alreadyAssigned
                        ? 'Found (Already Claimed)'
                        : 'PlantBox Found!'
                      : 'Not Found'}
                  </Text>
                  {lookupResult.message && (
                    <Text style={styles.resultMessage}>{lookupResult.message}</Text>
                  )}
                  {lookupResult.found && (
                    <Text style={styles.resultDetail}>
                      ID: {lookupResult.sensorBoxId}
                    </Text>
                  )}
                </View>
              </View>
            </View>
          )}

          {/* ── STEP 2: Select Plant (only when no plantId provided and not select-only mode) ─── */}
          {showPlantStep && deviceReady && (
            <>
              <View style={[styles.sectionHeader, { marginTop: 28 }]}>
                <View style={styles.stepBadge}>
                  <Text style={styles.stepBadgeText}>2</Text>
                </View>
                <Text style={styles.sectionTitle}>Select a Plant</Text>
              </View>
              <Text style={styles.sectionSubtitle}>
                Choose which plant should receive data from the sensor.
              </Text>

              {/* Search */}
              {plants.length > 3 && (
                <View style={styles.searchContainer}>
                  <FontAwesome6
                    name="magnifying-glass"
                    size={14}
                    color={theme.colors.greyedOut}
                    style={styles.searchIcon}
                  />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Search plants…"
                    placeholderTextColor={theme.colors.greyedOut}
                    value={plantSearchQuery}
                    onChangeText={setPlantSearchQuery}
                    autoCapitalize="none"
                    autoCorrect={false}
                    testID="plant-search-input"
                  />
                  {plantSearchQuery.length > 0 && (
                    <TouchableOpacity onPress={() => setPlantSearchQuery('')}>
                      <FontAwesome6 name="xmark" size={14} color={theme.colors.greyedOut} />
                    </TouchableOpacity>
                  )}
                </View>
              )}

              {plants.length === 0
                ? renderEmptyState(
                    'seedling',
                    'No plants yet',
                    'Add a plant first before linking a sensor.'
                  )
                : filteredPlants.length === 0
                  ? renderEmptyState(
                      'magnifying-glass',
                      'No results',
                      `No plants match "${plantSearchQuery}".`
                    )
                  : filteredPlants.map(renderPlantItem)}
            </>
          )}

          {/* ── Pre-selected plant info (when plantId is provided) ─── */}
          {isConnectWithPlant && selectedPlant && deviceReady && (
            <View style={[styles.summaryCard, { marginTop: 24 }]}>
              <Text style={styles.summaryTitle}>Linking to</Text>
              <View style={styles.summaryRow}>
                <FontAwesome6 name="seedling" size={14} color={theme.colors.primary} />
                <Text style={styles.summaryLabel}>Plant:</Text>
                <Text style={styles.summaryValue} numberOfLines={1}>
                  {selectedPlant.name}
                </Text>
              </View>
            </View>
          )}

          {/* ── Summary & Confirm (full mode with plant selection) ─────── */}
          {showPlantStep && deviceReady && (lookupResult || selectedPlant) && (
            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>Summary</Text>
              <View style={styles.summaryRow}>
                <FontAwesome6 name="microchip" size={14} color={theme.colors.secondary} />
                <Text style={styles.summaryLabel}>Sensor:</Text>
                <Text style={styles.summaryValue} numberOfLines={1}>
                  {lookupResult?.sensorBoxId ?? '—'}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <FontAwesome6 name="seedling" size={14} color={theme.colors.primary} />
                <Text style={styles.summaryLabel}>Plant:</Text>
                <Text style={styles.summaryValue} numberOfLines={1}>
                  {selectedPlant ? selectedPlant.name : '—'}
                </Text>
              </View>
            </View>
          )}

          {/* ── Action button ─────────────────────────── */}
          {deviceReady && (
            <>
              {isSelectMode ? (
                /* Select-only mode: return sensor and go back */
                <TouchableOpacity
                  style={[styles.confirmButton, !canSubmitSelect && styles.confirmButtonDisabled]}
                  disabled={!canSubmitSelect}
                  onPress={handleSelectSensor}
                  activeOpacity={0.8}
                  testID="link-sensor-confirm-button"
                >
                  <LinearGradient
                    colors={[theme.colors.secondary, theme.colors.primary] as [string, string]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.confirmGradient}
                  >
                    <FontAwesome6 name="check" size={16} color="#fff" style={{ marginRight: 8 }} />
                    <Text style={styles.confirmText}>Select Sensor</Text>
                  </LinearGradient>
                </TouchableOpacity>
              ) : isConnectWithPlant || (showPlantStep && selectedPlant) ? (
                /* Connect mode: link sensor to plant */
                <TouchableOpacity
                  style={[styles.confirmButton, !canSubmitConnect && styles.confirmButtonDisabled]}
                  disabled={!canSubmitConnect}
                  onPress={handleLink}
                  activeOpacity={0.8}
                  testID="link-sensor-confirm-button"
                >
                  {screenState === 'submitting' ? (
                    <View style={styles.confirmGradient}>
                      <ActivityIndicator color={theme.colors.primary} />
                    </View>
                  ) : (
                    <LinearGradient
                      colors={[theme.colors.secondary, theme.colors.primary] as [string, string]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.confirmGradient}
                    >
                      <FontAwesome6 name="link" size={16} color="#fff" style={{ marginRight: 8 }} />
                      <Text style={styles.confirmText}>Link Sensor to Plant</Text>
                    </LinearGradient>
                  )}
                </TouchableOpacity>
              ) : (
                /* Standalone mode: just register device to user */
                <TouchableOpacity
                  style={[styles.confirmButton, screenState === 'submitting' && styles.confirmButtonDisabled]}
                  disabled={screenState === 'submitting'}
                  onPress={handleConnectToUser}
                  activeOpacity={0.8}
                  testID="link-sensor-confirm-button"
                >
                  {screenState === 'submitting' ? (
                    <View style={styles.confirmGradient}>
                      <ActivityIndicator color={theme.colors.primary} />
                    </View>
                  ) : (
                    <LinearGradient
                      colors={[theme.colors.secondary, theme.colors.primary] as [string, string]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.confirmGradient}
                    >
                      <FontAwesome6 name="plug" size={16} color="#fff" style={{ marginRight: 8 }} />
                      <Text style={styles.confirmText}>Connect PlantBox</Text>
                    </LinearGradient>
                  )}
                </TouchableOpacity>
              )}
            </>
          )}

          {/* Bottom spacing */}
          <View style={{ height: 40 }} />
        </ScrollView>
      </Animated.View>

      {/* Result modal */}
      <AlertModal
        visible={modalVisible}
        type={modalConfig.type}
        title={modalConfig.title}
        message={modalConfig.message}
        onClose={() => {
          setModalVisible(false);
          if (modalConfig.type === 'success') {
            navigation.goBack();
          } else {
            setScreenState('idle');
          }
        }}
      />
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────────────
const styles = StyleSheet.create((theme: any) => ({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },

  // Header
  headerBg: {
    width: '100%',
    position: 'absolute',
    top: 0,
    zIndex: 0,
  },
  headerGradient: {
    width: '100%',
    height: '100%',
  },
  headerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  headerContent: {
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 1,
    paddingBottom: 20,
  },
  backButton: {
    marginRight: 15,
    padding: 5,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },

  // Rounded container
  roundedContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    overflow: 'hidden',
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 50,
  },

  // Section headers
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  stepBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  stepBadgeText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 13,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.text,
    fontFamily: theme.fonts.header,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: theme.colors.greyedOut,
    marginBottom: 14,
    marginLeft: 36,
    lineHeight: 18,
  },

  // ID Input
  idInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  idInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  idInputIcon: {
    marginRight: 10,
  },
  idInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    padding: 0,
    letterSpacing: 1,
  },
  idInputClear: {
    padding: 4,
    marginLeft: 6,
  },
  searchButton: {
    width: 50,
    height: 50,
    borderRadius: 16,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchButtonDisabled: {
    opacity: 0.45,
  },

  // Result card
  resultCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  resultCardSuccess: {
    backgroundColor: 'rgba(64,176,108,0.08)',
    borderColor: 'rgba(64,176,108,0.3)',
  },
  resultCardError: {
    backgroundColor: 'rgba(229,80,80,0.08)',
    borderColor: 'rgba(229,80,80,0.3)',
  },
  resultIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  resultIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  resultIconSuccess: {
    backgroundColor: '#40B06C',
  },
  resultIconError: {
    backgroundColor: '#E55050',
  },
  resultTextContainer: {
    flex: 1,
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 2,
  },
  resultMessage: {
    fontSize: 13,
    color: theme.colors.greyedOut,
    lineHeight: 18,
  },
  resultDetail: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.text,
    marginTop: 4,
    opacity: 0.8,
  },

  // Option cards
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  optionCardSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.background,
    shadowOpacity: 0.1,
    elevation: 3,
  },
  optionCardDisabled: {
    opacity: 0.45,
  },
  optionIconContainer: {
    marginRight: 14,
  },
  optionIconGradient: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  plantThumbnail: {
    width: 44,
    height: 44,
    borderRadius: 14,
  },
  optionTextContainer: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 2,
  },
  optionSubtitle: {
    fontSize: 12,
    color: theme.colors.greyedOut,
  },
  checkBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  linkedBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.greyedOut,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },

  // Search
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.colors.greyedOut,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: theme.colors.text,
    padding: 0,
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingVertical: 28,
    paddingHorizontal: 20,
  },
  emptyIconWrapper: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: theme.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: theme.colors.greyedOut,
    textAlign: 'center',
    lineHeight: 18,
  },

  // Summary card
  summaryCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 18,
    padding: 18,
    marginTop: 24,
    borderWidth: 1,
    borderColor: theme.colors.greyedOut,
    gap: 10,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 4,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  summaryLabel: {
    fontSize: 13,
    color: theme.colors.greyedOut,
    fontWeight: '600',
  },
  summaryValue: {
    fontSize: 13,
    color: theme.colors.text,
    flex: 1,
  },

  // Confirm button
  confirmButton: {
    marginTop: 20,
    borderRadius: 16,
    overflow: 'hidden',
  },
  confirmButtonDisabled: {
    opacity: 0.45,
  },
  confirmGradient: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    borderRadius: 16,
  },
  confirmText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
}));
