import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator, Image } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import { useNavigation } from '@react-navigation/native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { db } from '../../../utils/supabase';
import { useUserStore } from '../../../stores/UserStore';

export default function AccountScreen() {
    const { theme } = useUnistyles();
    const navigation = useNavigation();
    const { user, profile, fetchProfile } = useUserStore();

    const [newUsername, setNewUsername] = useState(profile?.username ?? '');
    const [currentPw, setCurrentPw] = useState('');
    const [newPw, setNewPw] = useState('');
    const [confirmPw, setConfirmPw] = useState('');

    const [loadingUser, setLoadingUser] = useState(false);
    const [loadingPw, setLoadingPw] = useState(false);

    // Username update
    const handleUsernameUpdate = async () => {
        if (!newUsername.trim()) return Alert.alert("Error", "Username cannot be empty.");

        setLoadingUser(true);

        try {
            const { data: { user } } = await db.public.auth.getUser();
            if (!user) throw new Error("User not found");

            const { error } = await db.user
                .from("Users")
                .update({ username: newUsername })
                .eq("id", user.id);

            if (error) throw error;

            await fetchProfile();
            Alert.alert("Success", "Username updated!");
        } catch (err: any) {
            Alert.alert("Error", err.message);
        } finally {
            setLoadingUser(false);
        }
    };

    // Password update
    const handlePasswordUpdate = async () => {
        if (newPw !== confirmPw)
            return Alert.alert("Error", "Passwords do not match.");

        if (newPw.length < 6)
            return Alert.alert("Error", "Password must be at least 6 characters.");

        setLoadingPw(true);

        try {
            const { data: { user } } = await db.public.auth.getUser();
            if (!user?.email) throw new Error("Unable to find user email.");

            // Verify old password
            const { error: signinError } = await db.public.auth.signInWithPassword({
                email: user.email,
                password: currentPw,
            });

            if (signinError) throw new Error("Current password incorrect.");

            // Update password
            const { error } = await db.public.auth.updateUser({ password: newPw });
            if (error) throw error;

            setCurrentPw('');
            setNewPw('');
            setConfirmPw('');

            Alert.alert("Success", "Password updated!");
        } catch (err: any) {
            Alert.alert("Error", err.message);
        } finally {
            setLoadingPw(false);
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
                <Text style={styles.headerTitle}>Account</Text>
            </View>

            <View style={styles.roundedContainer}>
                <KeyboardAwareScrollView
                    enableOnAndroid={true}
                    extraScrollHeight={20}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.contentContainer}
                    style={{ flex: 1 }}
                >
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Profile Info</Text>

                        <Text style={styles.inputLabel}>Username</Text>
                        <TextInput
                            style={styles.input}
                            value={newUsername}
                            onChangeText={setNewUsername}
                            placeholder="New username"
                            placeholderTextColor={theme.colors.typography}
                        />

                        <TouchableOpacity
                            style={styles.saveButton}
                            onPress={handleUsernameUpdate}
                            disabled={loadingUser}
                        >
                            {loadingUser ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={styles.saveButtonText}>Save Username</Text>
                            )}
                        </TouchableOpacity>
                    </View>

                    {/* SECURITY - Only show if Google is NOT linked */}
                    {!user?.app_metadata?.providers?.includes('google') && (
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Security</Text>

                            <Text style={styles.inputLabel}>Current Password</Text>
                            <TextInput
                                style={styles.input}
                                secureTextEntry
                                value={currentPw}
                                onChangeText={setCurrentPw}
                                placeholder="Current password"
                                placeholderTextColor={theme.colors.typography}
                            />

                            <Text style={styles.inputLabel}>New Password</Text>
                            <TextInput
                                style={styles.input}
                                secureTextEntry
                                value={newPw}
                                onChangeText={setNewPw}
                                placeholder="New password"
                                placeholderTextColor={theme.colors.typography}
                            />

                            <Text style={styles.inputLabel}>Confirm Password</Text>
                            <TextInput
                                style={styles.input}
                                secureTextEntry
                                value={confirmPw}
                                onChangeText={setConfirmPw}
                                placeholder="Confirm new password"
                                placeholderTextColor={theme.colors.typography}
                            />

                            <TouchableOpacity
                                style={styles.saveButton}
                                onPress={handlePasswordUpdate}
                                disabled={loadingPw}
                            >
                                {loadingPw ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <Text style={styles.saveButtonText}>Update Password</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    )}
                </KeyboardAwareScrollView>
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
        paddingBottom: 50,
    },
    section: {
        marginBottom: 25,
        paddingBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.greyedOut,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: theme.colors.secondary,
        marginBottom: 15,
    },
    inputLabel: {
        marginTop: 10,
        marginBottom: 6,
        color: theme.colors.typography,
        fontSize: 14,
    },
    input: {
        backgroundColor: theme.colors.surface,
        padding: 12,
        borderRadius: 12,
        color: theme.colors.text,
        borderWidth: 1,
        borderColor: theme.colors.greyedOut,
    },
    saveButton: {
        backgroundColor: theme.colors.primary,
        padding: 13,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 15,
    },
    saveButtonText: {
        fontSize: 16,
        color: "#fff",
        fontWeight: "bold",
    },
}));
