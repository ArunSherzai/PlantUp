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
} from 'react-native';
import { StyleSheet, useUnistyles } from '~/lib/unistyles';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { usePlants } from '~/features/plantlist/hooks/usePlants';
import {
  fetchAvailablePlantBoxes,
  connectPlantBoxToPlant,
  formatPlantBoxLastSeen,
  PlantBoxOption,
} from '~/features/plantlist/api/plantBox';
import { PlantItem } from '~/features/plantlist/types/plant.types';
import { useUserStore } from '~/stores/UserStore';
import { ErrorHandlerService } from '~/core/error/services/ErrorHandlerService';
import { playSound } from '~/utils/SoundManager';
import AlertModal from '~/components/AlertModal';

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

type ScreenState = 'idle' | 'loading' | 'submitting' | 'success' | 'error';

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
  const [sensors, setSensors] = useState<PlantBoxOption[]>([]);
  const [screenState, setScreenState] = useState<ScreenState>('loading');
  const [loadError, setLoadError] = useState<string | null>(null);

  // Selection state
  const [selectedSensor, setSelectedSensor] = useState<PlantBoxOption | null>(null);
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

  // Fetch available sensors on mount
  useEffect(() => {
    loadSensors();
  }, []);

  // Pre-select plant if plantId is provided
  useEffect(() => {
    if (preSelectedPlantId && plants.length > 0) {
      const plant = plants.find((p) => p.id === preSelectedPlantId);
      if (plant) setSelectedPlant(plant);
    }
  }, [preSelectedPlantId, plants]);

  const loadSensors = async () => {
    try {
      setScreenState('loading');
      setLoadError(null);
      const data = await fetchAvailablePlantBoxes();
      // Only show sensors that are NOT already assigned to a plant
      const available = data.filter((s) => !s.existingPlantId);
      setSensors(available);
      setScreenState('idle');
    } catch (err: any) {
      ErrorHandlerService.handle(err, { showUI: false });
      setLoadError(err.message || 'Failed to load sensors.');
      setScreenState('error');
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
    if (!selectedSensor || !onSensorSelected) return;

    playSound('flip');
    onSensorSelected({
      controllerRecordId: selectedSensor.controllerRecordId,
      sensorBoxId: selectedSensor.sensorBoxId,
      latestSeenAt: selectedSensor.latestSeenAt,
    });
    navigation.goBack();
  };

  // Handle "Connect" mode — link sensor to plant
  const handleLink = async () => {
    if (!selectedSensor || !selectedPlant) return;

    setScreenState('submitting');

    try {
      await connectPlantBoxToPlant({
        controllerRecordId: selectedSensor.controllerRecordId,
        sensorBoxId: selectedSensor.sensorBoxId,
        plantId: selectedPlant.id,
        userId: user?.id,
      });

      playSound('flip');
      await refreshPlants();
      setScreenState('success');
      setModalConfig({
        type: 'success',
        title: 'Sensor Linked!',
        message: `"${selectedSensor.sensorBoxId.slice(0, 8)}…" is now connected to "${selectedPlant.name}".`,
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

  const canSubmitConnect =
    selectedSensor !== null && selectedPlant !== null && screenState !== 'submitting';
  const canSubmitSelect = selectedSensor !== null && screenState !== 'submitting';

  // Determine which header title to show
  const headerTitle = isSelectMode ? 'Select Sensor' : 'Link Sensor';

  // Show plant selection step?
  const showPlantStep = !isSelectMode && !isConnectWithPlant;

  // ─── Render helpers ──────────────────────────────────────────
  const renderSensorItem = (sensor: PlantBoxOption) => {
    const isSelected = selectedSensor?.controllerRecordId === sensor.controllerRecordId;
    return (
      <TouchableOpacity
        key={sensor.controllerRecordId}
        testID={`sensor-option-${sensor.sensorBoxId}`}
        style={[
          styles.optionCard,
          isSelected && styles.optionCardSelected,
        ]}
        activeOpacity={0.7}
        onPress={() => {
          playSound('click');
          setSelectedSensor(isSelected ? null : sensor);
        }}
      >
        <View style={styles.optionIconContainer}>
          <LinearGradient
            colors={
              isSelected
                ? ([theme.colors.secondary, theme.colors.primary] as [string, string])
                : ([theme.colors.surface, theme.colors.surface] as [string, string])
            }
            style={styles.optionIconGradient}
          >
            <FontAwesome6
              name="microchip"
              size={18}
              color={isSelected ? '#fff' : theme.colors.text}
            />
          </LinearGradient>
        </View>

        <View style={styles.optionTextContainer}>
          <Text style={styles.optionTitle} numberOfLines={1}>
            {sensor.sensorBoxId}
          </Text>
          <Text style={styles.optionSubtitle} numberOfLines={1}>
            Last seen: {formatPlantBoxLastSeen(sensor.latestSeenAt)}
          </Text>
        </View>

        {isSelected && (
          <View style={styles.checkBadge}>
            <FontAwesome6 name="check" size={12} color="#fff" />
          </View>
        )}
      </TouchableOpacity>
    );
  };

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
        {screenState === 'loading' ? (
          <View style={styles.centeredLoader}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={styles.loadingText}>Loading sensors…</Text>
          </View>
        ) : screenState === 'error' && loadError ? (
          <View style={styles.centeredLoader}>
            <FontAwesome6 name="circle-exclamation" size={40} color="#E55050" />
            <Text style={styles.errorTitle}>Something went wrong</Text>
            <Text style={styles.errorSubtitle}>{loadError}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={loadSensors}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.contentContainer}
            keyboardShouldPersistTaps="handled"
          >
            {/* ── STEP 1: Select Sensor ─────────────────── */}
            <View style={styles.sectionHeader}>
              <View style={styles.stepBadge}>
                <Text style={styles.stepBadgeText}>1</Text>
              </View>
              <Text style={styles.sectionTitle}>Select a Sensor</Text>
            </View>
            <Text style={styles.sectionSubtitle}>
              Choose an available PlantBox sensor to assign.
            </Text>

            {sensors.length === 0
              ? renderEmptyState(
                  'microchip',
                  'No sensors available',
                  'All sensors are either already linked or offline. Make sure your PlantBox is active and sending data.'
                )
              : sensors.map(renderSensorItem)}

            {/* ── STEP 2: Select Plant (only when no plantId provided and not select-only mode) ─── */}
            {showPlantStep && (
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
            {isConnectWithPlant && selectedPlant && (
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
            {showPlantStep && (selectedSensor || selectedPlant) && (
              <View style={styles.summaryCard}>
                <Text style={styles.summaryTitle}>Summary</Text>
                <View style={styles.summaryRow}>
                  <FontAwesome6 name="microchip" size={14} color={theme.colors.secondary} />
                  <Text style={styles.summaryLabel}>Sensor:</Text>
                  <Text style={styles.summaryValue} numberOfLines={1}>
                    {selectedSensor
                      ? selectedSensor.sensorBoxId.slice(0, 16) + '…'
                      : '—'}
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
            ) : (
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
            )}

            {/* Bottom spacing */}
            <View style={{ height: 40 }} />
          </ScrollView>
        )}
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

  // Loaders / errors
  centeredLoader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 14,
    fontSize: 15,
    color: theme.colors.greyedOut,
    fontFamily: theme.fonts.regular,
  },
  errorTitle: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text,
  },
  errorSubtitle: {
    marginTop: 6,
    fontSize: 14,
    color: theme.colors.greyedOut,
    textAlign: 'center',
    lineHeight: 20,
  },
  retryButton: {
    marginTop: 20,
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: theme.colors.primary,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
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
