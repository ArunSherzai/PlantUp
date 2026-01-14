import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, Animated, LayoutAnimation, Platform, UIManager } from 'react-native';
import Slider from '@react-native-community/slider';
import { useNavigation } from '@react-navigation/native';
import { useUnistyles } from 'react-native-unistyles';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import PlantPotPreview, { PlantMode } from '../../../components/PlantPotPreview';
import { PlantConfig, PlantStyle, DEFAULT_ROSETTE_CONFIG } from '../../../components/ProceduralPlant';
import { LSystemConfig, DEFAULT_LSYSTEM_CONFIG, PRESETS } from '../../../components/LSystemPlant3D';
import { PotType } from '../../../components/PotModel';

if (Platform.OS === 'android') {
    if (UIManager.setLayoutAnimationEnabledExperimental) {
        UIManager.setLayoutAnimationEnabledExperimental(true);
    }
}

const POT_OPTIONS: PotType[] = ['PotStandard', 'PotB', 'PotEgg'];

export default function Plant3DTestScreen() {
    const navigation = useNavigation();
    const { theme } = useUnistyles();

    const [seed, setSeed] = useState(42);
    const [mode, setMode] = useState<PlantMode>('lsystem'); // Default to L-System now
    const [style, setStyle] = useState<PlantStyle>('rosette');
    const [config, setConfig] = useState<PlantConfig>({ ...DEFAULT_ROSETTE_CONFIG });
    const [lsystemConfig, setLsystemConfig] = useState<LSystemConfig>({ ...DEFAULT_LSYSTEM_CONFIG });
    const [activePreset, setActivePreset] = useState<string>('classic');
    const [potType, setPotType] = useState<PotType>('PotStandard');

    const [menuVisible, setMenuVisible] = useState(true);

    const updateConfig = (key: keyof PlantConfig, value: number) => {
        setConfig(prev => ({ ...prev, [key]: value }));
    };

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

    const randomizeSeed = () => {
        setSeed(Math.floor(Math.random() * 100000));
    };

    const toggleMenu = () => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setMenuVisible(!menuVisible);
    };

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
                    mode={mode}
                    plantStyle={style}
                    plantConfig={config}
                    lsystemConfig={lsystemConfig}
                    potType={potType}
                />
            </View>

            {/* Controls */}
            {menuVisible && (
                <ScrollView style={styles.controlsContainer} contentContainerStyle={styles.controlsContent}>
                    {/* Mode Toggle */}
                    <View style={styles.row}>
                        <Text style={[styles.label, { color: theme.colors.text }]}>Generation Mode</Text>
                        <View style={styles.toggleRow}>
                            <TouchableOpacity
                                style={[styles.toggleBtn, mode === 'procedural' && styles.toggleActive]}
                                onPress={() => setMode('procedural')}
                            >
                                <Text style={styles.toggleText}>Procedural</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.toggleBtn, mode === 'lsystem' && styles.toggleActiveLSystem]}
                                onPress={() => setMode('lsystem')}
                            >
                                <Text style={styles.toggleText}>L-System</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Pot Selector */}
                    <View style={styles.row}>
                        <Text style={[styles.label, { color: theme.colors.text }]}>Pot Style</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.presetRow}>
                            {POT_OPTIONS.map(pot => (
                                <TouchableOpacity
                                    key={pot}
                                    style={[styles.presetBtn, potType === pot && styles.presetBtnActive]}
                                    onPress={() => setPotType(pot)}
                                >
                                    <Text style={styles.presetText}>{pot.replace('Pot', '')}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>

                    {mode === 'procedural' ? (
                        <>
                            {/* Procedural Style Toggle */}
                            <View style={styles.row}>
                                <Text style={[styles.label, { color: theme.colors.text }]}>Style</Text>
                                <View style={styles.toggleRow}>
                                    <TouchableOpacity
                                        style={[styles.toggleBtn, style === 'rosette' && styles.toggleActive]}
                                        onPress={() => setStyle('rosette')}
                                    >
                                        <Text style={styles.toggleText}>Rosette</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.toggleBtn, style === 'tuft' && styles.toggleActive]}
                                        onPress={() => setStyle('tuft')}
                                    >
                                        <Text style={styles.toggleText}>Tuft</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>

                            {/* Procedural Sliders */}
                            <View style={styles.sliderRow}>
                                <Text style={[styles.label, { color: theme.colors.text }]}>Leaves: {config.leafCount}</Text>
                                <Slider style={styles.slider} minimumValue={5} maximumValue={100} step={1} value={config.leafCount} onValueChange={(v) => updateConfig('leafCount', v)} minimumTrackTintColor={theme.colors.primary} />
                            </View>

                            <View style={styles.sliderRow}>
                                <Text style={[styles.label, { color: theme.colors.text }]}>Length: {config.leafLength.toFixed(2)}</Text>
                                <Slider style={styles.slider} minimumValue={0.05} maximumValue={0.5} step={0.01} value={config.leafLength} onValueChange={(v) => updateConfig('leafLength', v)} minimumTrackTintColor={theme.colors.primary} />
                            </View>

                            <View style={styles.sliderRow}>
                                <Text style={[styles.label, { color: theme.colors.text }]}>Bend: {config.bend.toFixed(2)}</Text>
                                <Slider style={styles.slider} minimumValue={0} maximumValue={2} step={0.05} value={config.bend} onValueChange={(v) => updateConfig('bend', v)} minimumTrackTintColor={theme.colors.primary} />
                            </View>

                            <View style={styles.sliderRow}>
                                <Text style={[styles.label, { color: theme.colors.text }]}>🎨 Hue: {(config.hue * 360).toFixed(0)}°</Text>
                                <Slider style={styles.slider} minimumValue={0} maximumValue={1} step={0.01} value={config.hue} onValueChange={(v) => updateConfig('hue', v)} minimumTrackTintColor="#FF6B6B" maximumTrackTintColor="#6BCB77" thumbTintColor="#FFD93D" />
                            </View>
                        </>
                    ) : (
                        <>
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

                            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>🌳 Settings</Text>

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

                            <View style={styles.sliderRow}>
                                <Text style={[styles.label, { color: theme.colors.text }]}>Size Scale: {(lsystemConfig.lengthScale * 100).toFixed(0)}%</Text>
                                <Slider style={styles.slider} minimumValue={0.5} maximumValue={0.95} step={0.05} value={lsystemConfig.lengthScale} onValueChange={(v) => updateLsystemConfig('lengthScale', v)} minimumTrackTintColor="#8B4513" thumbTintColor="#8B4513" />
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
                        </>
                    )}

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
});
