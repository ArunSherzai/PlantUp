import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Image } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useUserStore } from '../../../stores/UserStore';
import { TUTORIALS } from '../../../config/TutorialsConfig';

const TUTORIAL_NAMES: Record<string, string> = {
    app_onboarding: 'Feed Tutorial',
    missions_tutorial: 'Missions Tutorial',
    chat_tutorial: 'Chat Tutorial',
    profile_tutorial: 'Profile Tutorial',
    shop_inventory_tutorial: 'Shop & Inventory Tutorial',
    notifications_tutorial: 'Notifications Tutorial',
    plant_stats_tutorial: 'Plant Stats Tutorial',
    plant_setup: 'Plant Setup Tutorial',
};

export default function TutorialSettingsScreen() {
    const { theme } = useUnistyles();
    const navigation = useNavigation();
    const insets = useSafeAreaInsets();

    const profile = useUserStore((state) => state.profile);
    const resetTutorialProgress = useUserStore((state) => state.resetTutorialProgress);

    // Keep track of which tutorials the user wants to reset
    const [selectedToReset, setSelectedToReset] = useState<string[]>([]);

    const toggleSelection = (tutorialId: string) => {
        setSelectedToReset(prev =>
            prev.includes(tutorialId)
                ? prev.filter(id => id !== tutorialId)
                : [...prev, tutorialId]
        );
    };

    const handleSave = () => {
        // Reset all selected tutorials
        selectedToReset.forEach(id => {
            resetTutorialProgress(id);
        });

        // Go back
        navigation.goBack();
    };

    // Only show tutorials that exist in the config
    const availableTutorials = Object.keys(TUTORIALS);

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
                <Text style={styles.headerTitle}>Tutorials</Text>
            </View>

            <View style={styles.roundedContainer}>
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.contentContainer}
                    style={{ flex: 1 }}
                >
                    <Text style={[styles.description, { color: theme.colors.text }]}>
                        Select the tutorials you want to see again. They will be played the next time you visit their respective screens.
                    </Text>

                    {availableTutorials.map((tutorialId) => {
                        const isCompleted = profile?.tutorial_progress?.[tutorialId] === true;
                        const isSelected = selectedToReset.includes(tutorialId);
                        const displayName = TUTORIAL_NAMES[tutorialId] || tutorialId;

                        return (
                            <TouchableOpacity
                                key={tutorialId}
                                style={[styles.menuItem, { borderBottomColor: theme.colors.greyedOut }]}
                                onPress={() => toggleSelection(tutorialId)}
                                disabled={!isCompleted && !isSelected} // Prevent selecting if not completed and not already selected
                            >
                                <View style={styles.menuItemLeft}>
                                    <View style={[styles.iconContainer, { backgroundColor: theme.colors.surface, borderColor: theme.colors.greyedOut }]}>
                                        <FontAwesome6
                                            name="person-chalkboard"
                                            size={16}
                                            color={theme.colors.text}
                                        />
                                    </View>
                                    <View>
                                        <Text style={[styles.menuItemText, { color: theme.colors.text }]}>
                                            {displayName}
                                        </Text>
                                        <Text style={{ color: isCompleted ? '#4CAF50' : theme.colors.greyedOut, fontSize: 12, marginTop: 2 }}>
                                            {isCompleted ? 'Completed' : 'Not seen yet'}
                                        </Text>
                                    </View>
                                </View>

                                {/* Checkbox / Toggle indicator */}
                                <View style={[
                                    styles.checkbox,
                                    {
                                        borderColor: isSelected ? theme.colors.primary : theme.colors.greyedOut,
                                        backgroundColor: isSelected ? theme.colors.primary : 'transparent'
                                    }
                                ]}>
                                    {isSelected && <FontAwesome6 name="check" size={12} color="#fff" />}
                                </View>
                            </TouchableOpacity>
                        );
                    })}

                    <TouchableOpacity
                        style={[styles.saveButton, { backgroundColor: theme.colors.primary }]}
                        onPress={handleSave}
                        disabled={selectedToReset.length === 0}
                    >
                        <Text style={styles.saveButtonText}>
                            Save & Reload Selected
                        </Text>
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
    description: {
        fontSize: 15,
        lineHeight: 22,
        marginBottom: 25,
        opacity: 0.8,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 15,
        borderBottomWidth: 1,
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
    },
    menuItemText: {
        fontSize: 16,
        fontWeight: '500',
    },
    checkbox: {
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 2,
        justifyContent: 'center',
        alignItems: 'center',
    },
    saveButton: {
        marginTop: 40,
        paddingVertical: 16,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 5,
    },
    saveButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
}));
