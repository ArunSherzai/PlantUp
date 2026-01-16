import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, Animated, LayoutAnimation, Platform, UIManager, ActivityIndicator, TextInput } from 'react-native';
import Slider from '@react-native-community/slider';
import { useNavigation } from '@react-navigation/native';
import { useUnistyles } from 'react-native-unistyles';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import PlantPotPreview, { PlantMode } from '../../../components/PlantPotPreview';
import { PlantConfig, PlantStyle, DEFAULT_ROSETTE_CONFIG } from '../../../components/ProceduralPlant';
import { LSystemConfig, DEFAULT_LSYSTEM_CONFIG, PRESETS } from '../../../components/LSystemPlant3D';
import { PotType } from '../../../components/PotModel';
import { useVirtualPlant } from '../../../hooks/useVirtualPlant';

if (Platform.OS === 'android') {
    if (UIManager.setLayoutAnimationEnabledExperimental) {
        UIManager.setLayoutAnimationEnabledExperimental(true);
    }
}

const POT_OPTIONS: PotType[] = ['PotStandard', 'PotB', 'PotEgg'];

export default function Plant3DTestScreen() {
    const navigation = useNavigation();
    const { theme } = useUnistyles();

    // Fetch plant from DB
    const { plant, growth: dbGrowth, loading, error, createPlant, updatePotType, regenerateSeed } = useVirtualPlant();

    // Local state (synced from DB)
    const [seed, setSeed] = useState(42);
    const [growth, setGrowth] = useState(50); // 0-100 scale
    const [lsystemConfig, setLsystemConfig] = useState<LSystemConfig>({ ...DEFAULT_LSYSTEM_CONFIG });
    const [activePreset, setActivePreset] = useState<string>('classic');
    const [potType, setPotType] = useState<PotType>('PotStandard');

    const [menuVisible, setMenuVisible] = useState(true);
    const [initialSyncDone, setInitialSyncDone] = useState(false);

    // Camera position
    const [cameraY, setCameraY] = useState(0.65);
    const [cameraDistance, setCameraDistance] = useState(1.5);

    // Sync DB data to local state ONLY on initial load
    useEffect(() => {
        if (plant && !initialSyncDone) {
            console.log('[Plant3DTestScreen] Initial sync from DB:', plant);
            setSeed(plant.seed);
            setPotType(plant.pot_type);
            setGrowth(dbGrowth);
            setInitialSyncDone(true);
        }
    }, [plant, dbGrowth, initialSyncDone]);

    // Auto-create plant if it doesn't exist
    useEffect(() => {
        if (!loading && !plant && !error) {
            console.log('[Plant3DTestScreen] No plant found, creating one...');
            createPlant();
        }
    }, [loading, plant, error, createPlant]);

    const updateLsystemConfig = (key: keyof LSystemConfig, value: any) => {
        setLsystemConfig(prev => ({ ...prev, [key]: value }));
    };

    const applyLSystemPreset = (name: string) => {
        const preset = PRESETS[name];
        if (preset) {
            setActivePreset(name);
            setLsystemConfig(prev => ({ ...prev, ...preset }));
        }
    };

    const randomizeSeed = async () => {
        const newSeed = Math.floor(Math.random() * 100000);
        setSeed(newSeed);
        // Also update in DB
        if (plant) {
            await regenerateSeed();
        }
    };

    const handlePotChange = async (pot: PotType) => {
        setPotType(pot);
        // Also update in DB
        if (plant) {
            await updatePotType(pot);
        }
    };

    const toggleMenu = () => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setMenuVisible(!menuVisible);
    };

    if (loading) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <ActivityIndicator size="large" color="#4CAF50" />
                    <Text style={{ color: theme.colors.text, marginTop: 16 }}>Loading your plant...</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
            {/* Header - Always Visible */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconButton}>
                    <FontAwesome6 name="arrow-left" size={20} color={theme.colors.text} />
                </TouchableOpacity>

                <Text style={[styles.title, { color: theme.colors.text }]}>
                    {menuVisible ? "3D Plant Editor" : ""}
                </Text>

                <View style={styles.headerRight}>
                    <TouchableOpacity onPress={randomizeSeed} style={styles.iconButton}>
                        <FontAwesome6 name="dice" size={20} color={theme.colors.accent} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={toggleMenu} style={[styles.iconButton, { marginLeft: 8 }]}>
                        <FontAwesome6
                            name={menuVisible ? "eye-slash" : "sliders"}
                            size={20}
                            color={theme.colors.text}
                        />
                    </TouchableOpacity>
                </View>
            </View>

            {/* 3D Plant Container - Grows when menu hidden */}
            <View style={[styles.plantContainer, !menuVisible && styles.plantContainerFull]}>
                <PlantPotPreview
                    seed={seed}
                    growth={growth}
                    mode={'lsystem'}
                    lsystemConfig={lsystemConfig}
                    potType={potType}
                    cameraY={cameraY}
                    cameraDistance={cameraDistance}
                />

                {/* Floating camera controls when menu is hidden */}
                {!menuVisible && (
                    <View style={styles.cameraOverlay}>
                        <View style={styles.inputRow}>
                            <Text style={styles.overlayLabel}>↕ Vertical:</Text>
                            <TextInput
                                style={styles.overlayInput}
                                value={cameraY.toFixed(2)}
                                onChangeText={(text) => {
                                    const val = parseFloat(text);
                                    if (!isNaN(val)) setCameraY(val);
                                }}
                                keyboardType="numeric"
                                selectTextOnFocus
                            />
                        </View>
                        <View style={styles.inputRow}>
                            <Text style={styles.overlayLabel}>↔ Distance:</Text>
                            <TextInput
                                style={styles.overlayInput}
                                value={cameraDistance.toFixed(2)}
                                onChangeText={(text) => {
                                    const val = parseFloat(text);
                                    if (!isNaN(val)) setCameraDistance(val);
                                }}
                                keyboardType="numeric"
                                selectTextOnFocus
                            />
                        </View>
                    </View>
                )}
            </View>

            {/* Controls */}
            {menuVisible && (
                <ScrollView style={styles.controlsContainer} contentContainerStyle={styles.controlsContent}>
                    {/* Pot Selector */}
                    <View style={styles.row}>
                        <Text style={[styles.label, { color: theme.colors.text }]}>Pot Style</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.presetRow}>
                            {POT_OPTIONS.map(pot => (
                                <TouchableOpacity
                                    key={pot}
                                    style={[styles.presetBtn, potType === pot && styles.presetBtnActive]}
                                    onPress={() => handlePotChange(pot)}
                                >
                                    <Text style={styles.presetText}>{pot.replace('Pot', '')}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>

                    {/* L-System Presets */}
                    <View style={styles.row}>
                        <Text style={[styles.label, { color: theme.colors.text }]}>Plant Type</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.presetRow}>
                            {Object.keys(PRESETS).map(key => (
                                <TouchableOpacity
                                    key={key}
                                    style={[styles.presetBtn, activePreset === key && styles.presetBtnActive]}
                                    onPress={() => applyLSystemPreset(key)}
                                >
                                    <Text style={styles.presetText}>{key.charAt(0).toUpperCase() + key.slice(1)}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>

                    <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>🌳 Advanced Settings</Text>

                    <View style={styles.sliderRow}>
                        <Text style={[styles.label, { color: theme.colors.text }]}>Iterations: {lsystemConfig.iterations}</Text>
                        <Slider style={styles.slider} minimumValue={1} maximumValue={6} step={1} value={lsystemConfig.iterations} onValueChange={(v) => updateLsystemConfig('iterations', v)} minimumTrackTintColor="#8B4513" thumbTintColor="#8B4513" />
                    </View>

                    <View style={styles.sliderRow}>
                        <Text style={[styles.label, { color: theme.colors.text }]}>Chaos (Jitter): {(lsystemConfig.chaos * 100).toFixed(0)}%</Text>
                        <Slider style={styles.slider} minimumValue={0} maximumValue={1} step={0.05} value={lsystemConfig.chaos} onValueChange={(v) => updateLsystemConfig('chaos', v)} minimumTrackTintColor="#E64A19" thumbTintColor="#E64A19" />
                    </View>

                    <View style={styles.sliderRow}>
                        <Text style={[styles.label, { color: theme.colors.text }]}>Leaf Probability: {(lsystemConfig.leafChance * 100).toFixed(0)}%</Text>
                        <Slider style={styles.slider} minimumValue={0} maximumValue={1} step={0.05} value={lsystemConfig.leafChance} onValueChange={(v) => updateLsystemConfig('leafChance', v)} minimumTrackTintColor="#4CAF50" thumbTintColor="#4CAF50" />
                    </View>

                    <View style={styles.sliderRow}>
                        <Text style={[styles.label, { color: theme.colors.text }]}>Bloom Probability: {(lsystemConfig.bloomChance * 100).toFixed(0)}%</Text>
                        <Slider style={styles.slider} minimumValue={0} maximumValue={1} step={0.05} value={lsystemConfig.bloomChance} onValueChange={(v) => updateLsystemConfig('bloomChance', v)} minimumTrackTintColor="#E040FB" thumbTintColor="#E040FB" />
                    </View>

                    <View style={styles.sliderRow}>
                        <Text style={[styles.label, { color: theme.colors.text }]}>Branch Angle: {lsystemConfig.angle}°</Text>
                        <Slider style={styles.slider} minimumValue={10} maximumValue={60} step={1} value={lsystemConfig.angle} onValueChange={(v) => updateLsystemConfig('angle', v)} minimumTrackTintColor="#8B4513" thumbTintColor="#8B4513" />
                    </View>

                    <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>🌱 Growth (Level: {dbGrowth})</Text>

                    <View style={styles.sliderRow}>
                        <Text style={[styles.label, { color: theme.colors.text }]}>Growth Level: {growth}%</Text>
                        <Slider
                            style={styles.slider}
                            minimumValue={1}
                            maximumValue={100}
                            step={1}
                            value={growth}
                            onValueChange={(v) => {
                                setGrowth(v);
                                const t = v / 100; // Normalize to 0-1
                                // Update all size and chance properties together
                                setLsystemConfig(prev => ({
                                    ...prev,
                                    iterations: 2 + Math.floor(t * 2),  // 2 at 0%, up to 4 at 100%
                                    length: 0.01 + t * 0.12,       // Branch height/length
                                    thickness: 0.003 + t * 0.02,  // Branch thickness
                                    lengthScale: 0.6 + t * 0.35,  // How much branches shrink
                                    leafSize: 0.01 + t * 0.05,
                                    bloomSize: 0.02 + t * 0.06,
                                    leafChance: t * 0.5,
                                    // No blooms below 25%, then ramps up to 80% at max
                                    bloomChance: t > 0.25 ? (t - 0.25) * 1.07 : 0,
                                }));
                            }}
                            minimumTrackTintColor="#4CAF50"
                            thumbTintColor="#4CAF50"
                        />
                    </View>

                    <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>🎨 Colors</Text>

                    <View style={styles.sliderRow}>
                        <Text style={[styles.label, { color: theme.colors.text }]}>Stem Hue: {(lsystemConfig.hue * 360).toFixed(0)}°</Text>
                        <Slider style={styles.slider} minimumValue={0} maximumValue={1} step={0.01} value={lsystemConfig.hue} onValueChange={(v) => updateLsystemConfig('hue', v)} minimumTrackTintColor="#FF6B6B" maximumTrackTintColor="#6BCB77" thumbTintColor="#FFD93D" />
                    </View>

                    <View style={styles.sliderRow}>
                        <Text style={[styles.label, { color: theme.colors.text }]}>Bloom Hue: {(lsystemConfig.bloomHue * 360).toFixed(0)}°</Text>
                        <Slider style={styles.slider} minimumValue={0} maximumValue={1} step={0.01} value={lsystemConfig.bloomHue} onValueChange={(v) => updateLsystemConfig('bloomHue', v)} minimumTrackTintColor="#FF6B6B" maximumTrackTintColor="#6BCB77" thumbTintColor="#FFD93D" />
                    </View>

                    <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>📷 Camera</Text>

                    <View style={styles.sliderRow}>
                        <Text style={[styles.label, { color: theme.colors.text }]}>Vertical: {cameraY.toFixed(2)}</Text>
                        <Slider style={styles.slider} minimumValue={-0.5} maximumValue={2.0} step={0.05} value={cameraY} onValueChange={(v) => setCameraY(v)} minimumTrackTintColor="#2196F3" thumbTintColor="#2196F3" />
                    </View>

                    <View style={styles.sliderRow}>
                        <Text style={[styles.label, { color: theme.colors.text }]}>Distance: {cameraDistance.toFixed(2)}</Text>
                        <Slider style={styles.slider} minimumValue={0.5} maximumValue={3.0} step={0.1} value={cameraDistance} onValueChange={(v) => setCameraDistance(v)} minimumTrackTintColor="#2196F3" thumbTintColor="#2196F3" />
                    </View>

                    <View style={{ height: 40 }} />
                </ScrollView>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, zIndex: 10 },
    headerRight: { flexDirection: 'row' },
    iconButton: { padding: 8, borderRadius: 8, backgroundColor: 'rgba(0,0,0,0.1)' },
    title: { fontSize: 18, fontWeight: '600' },
    plantContainer: { height: 260, margin: 16, marginTop: 0, borderRadius: 16, overflow: 'hidden', backgroundColor: '#1a1a2e' },
    plantContainerFull: { flex: 1, marginBottom: 16 },
    controlsContainer: { flex: 1 },
    controlsContent: { paddingHorizontal: 16 },
    sectionTitle: { fontSize: 16, fontWeight: '700', marginTop: 16, marginBottom: 8 },
    row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
    sliderRow: { marginBottom: 6 },
    label: { fontSize: 13, fontWeight: '500', marginBottom: 2 },
    slider: { width: '100%', height: 32 },
    toggleRow: { flexDirection: 'row', gap: 8 },
    toggleBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16, backgroundColor: '#333' },
    toggleActive: { backgroundColor: '#4CAF50' },
    toggleActiveLSystem: { backgroundColor: '#8B4513' },
    toggleText: { color: '#fff', fontWeight: '600', fontSize: 13 },
    presetRow: { gap: 8 },
    presetBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, backgroundColor: '#333', borderWidth: 1, borderColor: '#555' },
    presetBtnActive: { backgroundColor: '#448AFF', borderColor: '#448AFF' },
    presetText: { color: '#fff', fontSize: 13 },
    cameraOverlay: {
        position: 'absolute',
        bottom: 10,
        left: 10,
        right: 10,
        backgroundColor: 'rgba(0,0,0,0.6)',
        borderRadius: 12,
        padding: 12
    },
    overlayLabel: { color: '#fff', fontSize: 12, fontWeight: '500' },
    overlaySlider: { width: '100%', height: 30 },
    inputRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
    overlayInput: {
        backgroundColor: 'rgba(255,255,255,0.2)',
        color: '#fff',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 6,
        fontSize: 14,
        width: 80,
        textAlign: 'center'
    },
});
