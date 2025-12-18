import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator, Image } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import { useNavigation } from '@react-navigation/native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { db } from '../../../utils/supabase';
import { useUserStore } from '../../../stores/UserStore';

export default function AccountScreen() {
    const { theme } = useUnistyles();
    const navigation = useNavigation();
    const { user, profile, fetchProfile } = useUserStore();

    const [newUsername, setNewUsername] = useState(profile?.username ?? '');
    const [newBio, setNewBio] = useState(profile?.bio ?? '');
    const [selectedImage, setSelectedImage] = useState<string | null>(null);

    const [loading, setLoading] = useState(false);

    // Initialize state when profile loads
    useEffect(() => {
        if (profile) {
            setNewUsername(profile.username);
            setNewBio(profile.bio || '');
        }
    }, [profile]);

    const pickImage = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission needed', 'Sorry, we need camera roll permissions to make this work!');
            return;
        }

        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
        });

        if (!result.canceled && result.assets && result.assets.length > 0) {
            setSelectedImage(result.assets[0].uri);
        }
    };

    const handleSave = async () => {
        if (!newUsername.trim()) return Alert.alert("Error", "Username cannot be empty.");
        if (!user) return;

        setLoading(true);

        try {
            let avatarPath = null;

            // 1. Upload new Avatar if selected
            if (selectedImage) {
                const uri = selectedImage;
                const response = await fetch(uri);
                const blob = await response.blob();
                const arrayBuffer = await new Response(blob).arrayBuffer();

                const fileExt = uri.split('.').pop()?.toLowerCase() || 'jpg';
                const fileName = `${user.id}_${Date.now()}.${fileExt}`;
                const filePath = `${fileName}`;

                const { error: uploadError } = await db.public.storage
                    .from('avatar')
                    .upload(filePath, arrayBuffer, {
                        contentType: `image/${fileExt === 'jpg' ? 'jpeg' : fileExt}`,
                        upsert: false,
                    });

                if (uploadError) throw uploadError;
                avatarPath = filePath;
            }

            // 2. Update Users Table
            const updates: any = {
                username: newUsername,
                bio: newBio,
            };
            if (avatarPath) {
                updates.avatar_path = avatarPath;
            }

            const { error: updateError } = await db.user
                .from("Users")
                .update(updates)
                .eq("id", user.id);

            if (updateError) throw updateError;

            // 3. Refresh Profile
            await fetchProfile();
            Alert.alert("Success", "Profile updated!");
            navigation.goBack();

        } catch (err: any) {
            console.error(err);
            Alert.alert("Error", err.message || "Something went wrong.");
        } finally {
            setLoading(false);
        }
    };

    // Determine avatar source
    const displayImage = selectedImage
        ? { uri: selectedImage }
        : (profile?.profile_image
            ? { uri: profile.profile_image }
            : require('../../../../assets/images/Profilbild.jpg'));

    const insets = useSafeAreaInsets();

    return (
        <View style={styles.container}>
            {/* Header Background */}
            <View style={[styles.headerBg, { height: 200 + insets.top }]}>
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
                <Text style={styles.headerTitle}>Edit Profile</Text>
            </View>

            <View style={styles.roundedContainer}>
                <KeyboardAwareScrollView
                    enableOnAndroid={true}
                    extraScrollHeight={20}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.contentContainer}
                    style={{ flex: 1 }}
                >
                    {/* AVATAR SECTION */}
                    <View style={styles.avatarSection}>
                        <TouchableOpacity onPress={pickImage} style={styles.avatarWrapper}>
                            <Image source={displayImage} style={styles.avatar} resizeMode="cover" />
                            <View style={styles.editIconBadge}>
                                <FontAwesome6 name="pen" size={12} color="#fff" />
                            </View>
                        </TouchableOpacity>
                        <Text style={styles.changePhotoText}>Change Photo</Text>
                    </View>

                    {/* FIELDS SECTION */}
                    <View style={styles.section}>
                        <Text style={styles.inputLabel}>Username</Text>
                        <TextInput
                            style={styles.input}
                            value={newUsername}
                            onChangeText={setNewUsername}
                            placeholder="Username"
                            placeholderTextColor={theme.colors.typography}
                        />

                        <Text style={styles.inputLabel}>Bio</Text>
                        <TextInput
                            style={[styles.input, styles.bioInput]}
                            value={newBio}
                            onChangeText={setNewBio}
                            placeholder="Tell us about yourself..."
                            placeholderTextColor={theme.colors.typography}
                            multiline
                            textAlignVertical="top"
                            numberOfLines={4}
                            maxLength={150}
                        />
                        <Text style={styles.charCount}>{newBio.length}/150</Text>
                    </View>

                    {/* SAVE BUTTON */}
                    <TouchableOpacity
                        style={styles.saveButtonWrapper}
                        onPress={handleSave}
                        disabled={loading}
                    >
                        <LinearGradient
                            colors={theme.colors.gradient}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.gradientButton}
                        >
                            {loading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={styles.saveButtonText}>Save Changes</Text>
                            )}
                        </LinearGradient>
                    </TouchableOpacity>

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
        alignItems: 'center',
    },
    avatarSection: {
        alignItems: 'center',
        marginBottom: 30,
    },
    avatarWrapper: {
        position: 'relative',
        marginBottom: 10,
    },
    avatar: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: theme.colors.greyedOut,
    },
    editIconBadge: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: theme.colors.primary,
        width: 30,
        height: 30,
        borderRadius: 15,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: theme.colors.background,
    },
    changePhotoText: {
        color: theme.colors.primary,
        fontWeight: '600',
        fontSize: 14,
    },
    section: {
        width: '100%',
        marginBottom: 20,
    },
    inputLabel: {
        marginBottom: 8,
        color: theme.colors.typography,
        fontSize: 14,
        fontWeight: '600',
        marginTop: 15,
    },
    input: {
        backgroundColor: theme.colors.surface,
        padding: 15,
        borderRadius: 15,
        color: theme.colors.text,
        borderWidth: 1,
        borderColor: theme.colors.greyedOut,
        fontSize: 16,
    },
    bioInput: {
        minHeight: 100,
    },
    charCount: {
        alignSelf: 'flex-end',
        fontSize: 12,
        color: theme.colors.typography,
        marginTop: 5,
        opacity: 0.7,
    },
    saveButtonWrapper: {
        width: '100%',
        marginTop: 10,
    },
    gradientButton: {
        paddingVertical: 16,
        borderRadius: 15,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: theme.colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    saveButtonText: {
        fontSize: 18,
        color: "#fff",
        fontWeight: "bold",
    },
}));
