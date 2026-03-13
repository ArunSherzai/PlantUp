import React from 'react';
import { View, Text, Switch, TouchableOpacity, Image } from 'react-native';
import { StyleSheet, useUnistyles, UnistylesRuntime } from 'react-native-unistyles';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { StatusBar } from 'expo-status-bar';
import { ErrorHandlerService } from '~/core/error/services/ErrorHandlerService';

export default function AppearanceScreen() {
    const { theme } = useUnistyles();
    const navigation = useNavigation();
    const insets = useSafeAreaInsets();

    // Use UnistylesRuntime.themeName directly for truth to avoid sync issues
    const isDarkMode = UnistylesRuntime.themeName === 'dark';

    const toggleTheme = () => {
        try {
            const currentTheme = UnistylesRuntime.themeName;
            const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';

            console.log(`[Settings] Toggling theme. Current: ${currentTheme}, Next: ${nextTheme}`);

            // Try to force adaptive off before switch if it's on
            UnistylesRuntime.setAdaptiveThemes(false);

            // Force strict string usage
            UnistylesRuntime.setTheme(nextTheme);
        } catch (error) {
            ErrorHandlerService.handle(error);
        }
    };

    return (
        <View style={styles.container}>
            <StatusBar style="light" translucent backgroundColor="transparent" />
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
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <FontAwesome6 name="chevron-left" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Appearance</Text>
            </View>

            <View style={styles.roundedContainer}>
                <View style={styles.contentContainer}>
                    <View style={styles.section}>
                        <View style={styles.row}>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <FontAwesome6
                                    name={isDarkMode ? "moon" : "sun"}
                                    size={18}
                                    color={theme.colors.text}
                                    style={{ marginRight: 10 }}
                                />
                                <Text style={styles.label}>Dark Mode</Text>
                            </View>

                            <Switch
                                value={isDarkMode}
                                onValueChange={toggleTheme}
                                trackColor={{
                                    false: theme.colors.greyedOut,
                                    true: theme.colors.primary,
                                }}
                                thumbColor="#fff"
                            />
                        </View>
                    </View>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create((theme: any) => ({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
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
    roundedContainer: {
        flex: 1,
        backgroundColor: theme.colors.background,
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        overflow: 'hidden',
    },
    contentContainer: {
        padding: 20,
    },
    section: {
        marginBottom: 25,
        paddingBottom: 20,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    label: {
        fontSize: 16,
        color: theme.colors.text,
    },
}));
