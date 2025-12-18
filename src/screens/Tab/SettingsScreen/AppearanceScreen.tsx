import React from 'react';
import { View, Text, Switch, TouchableOpacity, Image } from 'react-native';
import { StyleSheet, useUnistyles, UnistylesRuntime } from 'react-native-unistyles';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import { useNavigation } from '@react-navigation/native';

export default function AppearanceScreen() {
    const { theme } = useUnistyles();
    const navigation = useNavigation();

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
            console.error('[Settings] Failed to change theme:', error);
        }
    };

    return (
        <View style={styles.container}>
            {/* Header Background */}
            <View style={styles.headerBg}>
                <Image
                    source={require('../../../../assets/images/profileScreenBackground.png')}
                    style={styles.headerGradient}
                    resizeMode="cover"
                />
                <View style={styles.headerOverlay} />
            </View>

            <View style={styles.headerContent}>
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
        height: 200,
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
        paddingTop: 60,
        paddingHorizontal: 20,
        flexDirection: 'row',
        alignItems: 'center',
        zIndex: 1,
        height: 120,
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
