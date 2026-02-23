import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert, Image, ScrollView, Switch } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { db } from '../../../utils/supabase';
import { useUserStore } from '../../../stores/UserStore';
import { SoundManager, playSound } from '~/utils/SoundManager';

import { StatusBar } from 'expo-status-bar';

export default function SettingsScreen() {
    const { theme } = useUnistyles();
    const navigation = useNavigation<any>();
    const insets = useSafeAreaInsets();

    // Sound Effects State
    const [soundEnabled, setSoundEnabled] = useState(SoundManager.isEnabled());

    // Sign Out
    const handleSignOut = () => {
        Alert.alert("Sign Out", "Are you sure you want to sign out?", [
            { text: "Cancel", style: "cancel" },
            {
                text: "Sign Out",
                style: "destructive",
                onPress: async () => {
                    try {
                        await db.public.auth.signOut();

                        // Reset local state
                        useUserStore.getState().setUser(null);

                        // Reset navigation to Auth stack
                        navigation.reset({
                            index: 0,
                            routes: [{ name: 'Auth' as never }],
                        });
                    } catch (error) {
                        console.error("Sign out error:", error);
                        Alert.alert("Error", "Failed to sign out.");
                    }
                },
            },
        ]);
    };

    const navigateTo = (screen: string) => {
        navigation.navigate(screen);
    };

    const handleSoundToggle = async (enabled: boolean) => {
        setSoundEnabled(enabled);
        await SoundManager.setEnabled(enabled);
        if (enabled) {
            playSound('click'); // Play a sound to confirm it's on
        }
    };

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
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <FontAwesome6 name="chevron-left" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Settings</Text>
            </View>

            <View style={styles.roundedContainer}>
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.contentContainer}
                    style={{ flex: 1 }}
                >
                    {/* Sound Effects Toggle */}
                    <View style={styles.menuItem}>
                        <View style={styles.menuItemLeft}>
                            <View style={[styles.iconContainer, { backgroundColor: theme.colors.surface }]}>
                                <FontAwesome6 name="volume-high" size={18} color={theme.colors.text} />
                            </View>
                            <Text style={styles.menuItemText}>Sound Effects</Text>
                        </View>
                        <Switch
                            value={soundEnabled}
                            onValueChange={handleSoundToggle}
                            trackColor={{ false: theme.colors.greyedOut, true: theme.colors.primary }}
                            thumbColor="#fff"
                        />
                    </View>

                    {/* Appearance */}
                    <TouchableOpacity style={styles.menuItem} onPress={() => navigateTo('Appearance')}>
                        <View style={styles.menuItemLeft}>
                            <View style={[styles.iconContainer, { backgroundColor: theme.colors.surface }]}>
                                <FontAwesome6 name="paintbrush" size={18} color={theme.colors.text} />
                            </View>
                            <Text style={styles.menuItemText}>Appearance</Text>
                        </View>
                        <FontAwesome6 name="chevron-right" size={16} color={theme.colors.greyedOut} />
                    </TouchableOpacity>

                    {/* Notifications */}
                    <TouchableOpacity style={styles.menuItem} onPress={() => navigateTo('Notifications')}>
                        <View style={styles.menuItemLeft}>
                            <View style={[styles.iconContainer, { backgroundColor: theme.colors.surface }]}>
                                <FontAwesome6 name="bell" size={18} color={theme.colors.text} />
                            </View>
                            <Text style={styles.menuItemText}>Notifications</Text>
                        </View>
                        <FontAwesome6 name="chevron-right" size={16} color={theme.colors.greyedOut} />
                    </TouchableOpacity>

                    {/* Account */}
                    <TouchableOpacity style={styles.menuItem} onPress={() => navigateTo('Account')}>
                        <View style={styles.menuItemLeft}>
                            <View style={[styles.iconContainer, { backgroundColor: theme.colors.surface }]}>
                                <FontAwesome6 name="user" size={18} color={theme.colors.text} />
                            </View>
                            <Text style={styles.menuItemText}>Account</Text>
                        </View>
                        <FontAwesome6 name="chevron-right" size={16} color={theme.colors.greyedOut} />
                    </TouchableOpacity>

                    {/* Tutorials */}
                    <TouchableOpacity style={styles.menuItem} onPress={() => navigateTo('TutorialSettings')}>
                        <View style={styles.menuItemLeft}>
                            <View style={[styles.iconContainer, { backgroundColor: theme.colors.surface }]}>
                                <FontAwesome6 name="graduation-cap" size={18} color={theme.colors.text} />
                            </View>
                            <Text style={styles.menuItemText}>Tutorials</Text>
                        </View>
                        <FontAwesome6 name="chevron-right" size={16} color={theme.colors.greyedOut} />
                    </TouchableOpacity>

                    {/* Sign Out */}
                    <TouchableOpacity style={styles.dangerButton} onPress={handleSignOut}>
                        <FontAwesome6 name="arrow-right-from-bracket" color="#fff" size={18} style={{ marginRight: 8 }} />
                        <Text style={styles.dangerText}>Sign Out</Text>
                    </TouchableOpacity>

                </ScrollView>
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
        paddingBottom: 50,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.greyedOut,
        marginBottom: 5,
    },
    menuItemLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
        borderWidth: 1,
        borderColor: theme.colors.greyedOut,
    },
    menuItemText: {
        fontSize: 16,
        color: theme.colors.text,
        fontWeight: '500',
    },
    dangerButton: {
        backgroundColor: "#FF4444",
        padding: 15,
        borderRadius: 15,
        marginTop: 30,
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
    },
    dangerText: {
        color: "#fff",
        fontWeight: "bold",
        fontSize: 16,
    },
}));
