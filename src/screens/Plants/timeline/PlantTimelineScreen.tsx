import React, { useState, useEffect } from 'react';
import { View, Text, Image, TouchableOpacity, FlatList, ActivityIndicator, Modal, TextInput } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, FontAwesome6, MaterialCommunityIcons } from '@expo/vector-icons';
import { useUnistyles, StyleSheet } from 'react-native-unistyles';
import { usePlantProgress, ProgressPhoto } from '../../../features/plantstats/hooks/usePlantProgress';
import { usePlants } from '../../../features/plantlist/hooks/usePlants';
import { getPublicPostUrl } from '../../../utils/media';

export default function PlantTimelineScreen() {
    const route = useRoute<any>();
    const navigation = useNavigation<any>();
    const insets = useSafeAreaInsets();
    const { theme } = useUnistyles();

    const { plants } = usePlants();
    const plantId = route.params?.plantId;

    // Auto-select first plant if none is selected
    useEffect(() => {
        if (!plantId && plants.length > 0) {
            navigation.setParams({ plantId: plants[0].id });
        }
    }, [plantId, plants, navigation]);

    const activePlant = plants.find(p => p.id === plantId);

    const { photos, plantDetails, loading, isUploading, canTakePhoto, takePhoto } = usePlantProgress(plantId);

    const [isPlantDropdownVisible, setIsPlantDropdownVisible] = useState(false);
    const [isTitleModalVisible, setIsTitleModalVisible] = useState(false);
    const [newPhotoTitle, setNewPhotoTitle] = useState('Progress Update');

    const handleSelectPlant = (pId: string) => {
        setIsPlantDropdownVisible(false);
        navigation.setParams({ plantId: pId });
    };

    const promptForTitle = () => {
        setNewPhotoTitle('Progress Update');
        setIsTitleModalVisible(true);
    };

    const handleTakePhoto = async () => {
        setIsTitleModalVisible(false);
        const success = await takePhoto(newPhotoTitle.trim() || 'Progress Update');
        if (success) {
            setNewPhotoTitle('Progress Update');
        }
    };

    const startDate = plantDetails?.created_at
        ? new Date(plantDetails.created_at)
        : new Date();

    // Default to 7 days from last photo, or 7 days from start if no photos
    const nextPhotoDate = new Date(photos.length > 0 ? photos[photos.length - 1].created_at : startDate);
    nextPhotoDate.setDate(nextPhotoDate.getDate() + 7);

    // Header Component
    const renderHeader = () => (
        <View style={styles.topCardContainer}>
            <View style={styles.topCardInner}>
                <TouchableOpacity style={styles.plantInfoRow} onPress={() => setIsPlantDropdownVisible(true)}>
                    <View style={styles.plantImageContainer}>
                        {plantDetails?.image_url ? (
                            <Image source={{ uri: plantDetails.image_url }} style={styles.plantImage} />
                        ) : (
                            <Feather name="image" size={32} color={theme.colors.greyedOut} />
                        )}
                    </View>
                    <View style={styles.plantTextContainer}>
                        <Text style={styles.plantNickname} numberOfLines={1}>
                            {activePlant?.name || plantDetails?.nickname || 'Select Plant'}
                        </Text>
                        <Text style={styles.plantCommonName} numberOfLines={1}>
                            {activePlant?.description || plantDetails?.common_name || 'Indoor Plant'}
                        </Text>
                    </View>
                    <Feather name="chevron-down" size={24} color="rgba(255,255,255,0.8)" style={styles.chevron} />
                </TouchableOpacity>

                <View style={styles.dateAndButtonRow}>
                    <View style={styles.datesContainer}>
                        <View style={styles.dateRow}>
                            <Feather name="circle" size={16} color="black" style={styles.dateIcon} />
                            <Text style={styles.dateLabel}>Start Date: </Text>
                            <Text style={styles.dateValue}>{startDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</Text>
                        </View>
                        <View style={styles.dateRow}>
                            <MaterialCommunityIcons name="update" size={18} color="black" style={styles.dateIcon} />
                            <Text style={styles.dateLabel}>Next Photo: </Text>
                            <Text style={styles.dateValue}>{nextPhotoDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</Text>
                        </View>
                    </View>

                    <TouchableOpacity
                        style={[styles.takePhotoButton, !canTakePhoto() && styles.takePhotoButtonDisabled]}
                        onPress={promptForTitle}
                        disabled={false}
                    >
                        <Feather name="camera" size={20} color="black" style={{ marginRight: 6 }} />
                        <Text style={styles.takePhotoButtonText}>Take Photo</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );

    const renderTimelineItem = ({ item, index }: { item: ProgressPhoto | 'ADD_NEW', index: number }) => {
        if (item === 'ADD_NEW') {
            const disabled = !canTakePhoto() && photos.length > 0;
            return (
                <View style={styles.timelineRow}>
                    <View style={styles.dateColumn}>
                        {/* Only dotted line, no date text for the empty slot */}
                        <View style={[styles.verticalDottedLine, { height: '100%' }]} />
                        <View style={styles.timelineDotEnd} />
                    </View>
                    <View style={styles.contentColumn}>
                        <TouchableOpacity
                            style={[styles.emptyPhotoBox]}
                            onPress={promptForTitle}
                        >
                            <Feather name="camera" size={32} color={theme.colors.greyedOut} />
                        </TouchableOpacity>
                        <View style={styles.stageCardDisabled}>
                            <Text style={styles.stageTitleDark}>Stage {photos.length + 1}</Text>
                            <Text style={styles.stageDescDark}>Add a new progress photo</Text>
                            <View style={styles.dueDateBadge}>
                                <Text style={styles.dueDateText}>
                                    Due {nextPhotoDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
                                </Text>
                            </View>
                        </View>
                    </View>
                </View>
            );
        }

        const PItem = item as ProgressPhoto;
        const pDate = new Date(PItem.created_at);
        const isFirst = index === 0;

        return (
            <View style={styles.timelineRow}>
                <View style={styles.dateColumn}>
                    <Text style={styles.dateColumnText}>{pDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}</Text>
                    {/* The line drops down from this item */}
                    <View style={styles.verticalDottedLine} />
                    {isFirst && <View style={styles.timelineDotStart} />}
                </View>

                <View style={styles.contentColumn}>
                    <View style={styles.photoContainer}>
                        <Image source={{ uri: getPublicPostUrl(PItem.image_url) || undefined }} style={styles.photoImage} />
                    </View>
                    <View style={styles.stageCard}>
                        <Text style={styles.stageTitle}>Stage {index + 1}</Text>
                        <Text style={styles.stageDesc}>{PItem.title}</Text>
                        {/* Fake background texture using absolute position elements or icons could go here */}
                    </View>
                </View>
            </View>
        );
    };

    const timelineData = [...photos, 'ADD_NEW'];

    return (
        <View style={styles.container}>
            {/* Theme adaptive Background */}
            <View style={[StyleSheet.absoluteFillObject, { backgroundColor: theme.colors.background || '#ffffff' }]} />

            {/* Simple App Header */}
            <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Feather name="chevron-left" size={32} color={theme.colors.textDark || '#112c1d'} />
                </TouchableOpacity>
                <View style={styles.headerTitleContainer}>
                    <Feather name="image" size={24} color={theme.colors.textDark || '#112c1d'} />
                    <Text style={styles.headerTitle}>Progress Photos</Text>
                </View>
                <View style={{ width: 32 }} />
            </View>

            {loading && photos.length === 0 ? (
                <ActivityIndicator size="large" color="#4caf50" style={{ marginTop: 50 }} />
            ) : (
                <FlatList
                    data={timelineData}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.listContent}
                    ListHeaderComponent={renderHeader}
                    keyExtractor={(item) => item === 'ADD_NEW' ? 'ADD_NEW' : (item as ProgressPhoto).id}
                    renderItem={renderTimelineItem as any}
                />
            )}

            {/* Plant Dropdown Modal */}
            <Modal
                transparent
                visible={isPlantDropdownVisible}
                animationType="fade"
                onRequestClose={() => setIsPlantDropdownVisible(false)}
            >
                <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setIsPlantDropdownVisible(false)}>
                    <View style={styles.dropdownContent}>
                        <Text style={styles.modalTitle}>Select a Plant</Text>
                        <FlatList
                            data={plants}
                            keyExtractor={(item) => item.id}
                            style={{ maxHeight: 300, width: '100%' }}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={styles.dropdownItem}
                                    onPress={() => handleSelectPlant(item.id)}
                                >
                                    <View style={styles.dropdownImageContainer}>
                                        <Feather name="image" size={20} color={theme.colors.primary} />
                                    </View>
                                    <View>
                                        <Text style={styles.dropdownItemName}>{item.name}</Text>
                                    </View>
                                </TouchableOpacity>
                            )}
                        />
                    </View>
                </TouchableOpacity>
            </Modal>

            {/* Title Modal */}
            <Modal
                transparent
                visible={isTitleModalVisible}
                animationType="fade"
                onRequestClose={() => setIsTitleModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>New Progress Photo</Text>
                        <TextInput
                            style={styles.modalInput}
                            value={newPhotoTitle}
                            onChangeText={setNewPhotoTitle}
                            placeholder="e.g. First germination!"
                            placeholderTextColor={theme.colors.greyedOut}
                            maxLength={30}
                            autoFocus
                        />
                        <View style={styles.modalButtons}>
                            <TouchableOpacity onPress={() => setIsTitleModalVisible(false)} style={styles.modalButtonCancel}>
                                <Text style={styles.modalButtonTextCancel}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={handleTakePhoto} style={styles.modalButtonSubmit}>
                                <Text style={styles.modalButtonTextSubmit}>Take Photo</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {isUploading && (
                <View style={styles.uploadOverlay}>
                    <ActivityIndicator size="large" color="#ffffff" />
                    <Text style={styles.uploadText}>Saving entry...</Text>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create((theme) => ({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingBottom: 10,
    },
    backButton: {
        padding: 0,
    },
    headerTitleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    headerTitle: {
        color: theme.colors.textDark || '#112c1d',
        fontSize: 22,
        fontWeight: 'bold',
    },
    listContent: {
        paddingHorizontal: 16,
        paddingBottom: 40,
    },
    // Top Card Styles
    topCardContainer: {
        backgroundColor: '#d8ebd8',
        borderRadius: 24,
        padding: 16,
        marginBottom: 30,
        marginTop: 10,
    },
    topCardInner: {
        flex: 1,
    },
    plantInfoRow: {
        flexDirection: 'row',
        backgroundColor: '#298547',
        borderRadius: 16,
        padding: 12,
        alignItems: 'center',
        marginBottom: 16,
    },
    plantImageContainer: {
        width: 56,
        height: 56,
        borderRadius: 12,
        backgroundColor: 'white',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
        overflow: 'hidden',
    },
    plantImage: {
        width: '100%',
        height: '100%',
    },
    plusOverlay: {
        position: 'absolute',
        bottom: 2,
        right: 2,
        backgroundColor: '#4caf50',
        borderRadius: 10,
        padding: 2,
    },
    plantTextContainer: {
        flex: 1,
    },
    plantNickname: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
    },
    plantCommonName: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 14,
    },
    chevron: {
        marginLeft: 10,
    },
    dateAndButtonRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    datesContainer: {
        flex: 1,
        gap: 6,
    },
    dateRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    dateIcon: {
        marginRight: 6,
        color: theme.colors.textDark || 'black',
    },
    dateLabel: {
        color: theme.colors.text || '#4a5d50',
        fontSize: 14,
    },
    dateValue: {
        color: theme.colors.textDark || '#112c1d',
        fontSize: 14,
        fontWeight: '600',
    },
    takePhotoButton: {
        backgroundColor: '#fedb71',
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 30,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    takePhotoButtonDisabled: {
        opacity: 0.5,
    },
    takePhotoButtonText: {
        color: 'black',
        fontWeight: 'bold',
        fontSize: 16,
    },
    // Timeline Styles
    timelineRow: {
        flexDirection: 'row',
        marginBottom: 16,
    },
    dateColumn: {
        width: 70,
        alignItems: 'flex-end',
        position: 'relative',
        paddingRight: 12,
    },
    dateColumnText: {
        color: '#fedb71',
        fontWeight: 'bold',
        fontSize: 16,
        marginTop: 10, // Align roughly with top of photo slightly lower
    },
    verticalDottedLine: {
        position: 'absolute',
        right: 0,
        top: 30,
        bottom: -30, // Stretch to next item
        width: 2,
        borderStyle: 'dashed',
        borderColor: '#fedb71',
        borderWidth: 1,
    },
    timelineDotStart: {
        position: 'absolute',
        right: -3, // Center on line
        top: 15,
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#fedb71',
    },
    timelineDotEnd: {
        position: 'absolute',
        right: -4,
        bottom: -20,
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#fedb71',
    },
    contentColumn: {
        flex: 1,
        flexDirection: 'row',
        gap: 16,
        marginLeft: 20,
    },
    photoContainer: {
        width: 130,
        height: 150,
        borderRadius: 20,
        backgroundColor: theme.colors.background || 'white',
        padding: 4, // create inner white border
    },
    photoImage: {
        width: '100%',
        height: '100%',
        borderRadius: 16,
        backgroundColor: '#f0f0f0',
    },
    emptyPhotoBox: {
        width: 130,
        height: 140,
        borderRadius: 20,
        backgroundColor: '#e6ebd6',
        borderWidth: 3,
        borderColor: '#fedb71',
        borderStyle: 'dashed',
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyPhotoBoxDisabled: {
        opacity: 0.5,
    },
    stageCard: {
        flex: 1,
        maxWidth: 160,
        backgroundColor: '#298547',
        borderRadius: 20,
        padding: 16,
        justifyContent: 'center',
        overflow: 'hidden',
    },
    stageCardDisabled: {
        flex: 1,
        maxWidth: 160,
        backgroundColor: '#d8ebd8',
        borderRadius: 20,
        padding: 16,
        justifyContent: 'center',
    },
    stageTitle: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 18,
        marginBottom: 8,
    },
    stageDesc: {
        color: 'rgba(255,255,255,0.9)',
        fontSize: 14,
        lineHeight: 20,
    },
    stageTitleDark: {
        color: theme.colors.textDark || '#112c1d',
        fontWeight: 'bold',
        fontSize: 18,
        marginBottom: 8,
    },
    stageDescDark: {
        color: theme.colors.text || '#2d4739',
        fontSize: 14,
        lineHeight: 20,
        marginBottom: 12,
    },
    dueDateBadge: {
        backgroundColor: '#fedb71',
        alignSelf: 'flex-start',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
    },
    dueDateText: {
        color: 'black',  // keeping this black since background is always yellow
        fontWeight: 'bold',
        fontSize: 13,
    },
    // Plant Dropdown Styles
    dropdownContent: {
        backgroundColor: theme.colors.background || 'white',
        borderRadius: 24,
        padding: 24,
        width: '85%',
        maxHeight: '70%',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 6,
    },
    dropdownItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    dropdownImageContainer: {
        width: 40,
        height: 40,
        borderRadius: 8,
        backgroundColor: '#f5f5f5',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    dropdownItemName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: theme.colors.textDark || '#112c1d',
    },
    dropdownItemDesc: {
        fontSize: 12,
        color: theme.colors.text,
    },
    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        backgroundColor: theme.colors.background || 'white',
        borderRadius: 24,
        padding: 24,
        width: '85%',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 6,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: theme.colors.textDark || '#112c1d',
        marginBottom: 16,
    },
    modalInput: {
        borderWidth: 1,
        borderColor: theme.colors.greyedOut + '40',
        borderRadius: 12,
        padding: 12,
        fontSize: 16,
        color: theme.colors.textDark,
        marginBottom: 24,
    },
    modalButtons: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 12,
    },
    modalButtonCancel: {
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 12,
        backgroundColor: theme.colors.background,
    },
    modalButtonSubmit: {
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 12,
        backgroundColor: '#4caf50',
    },
    modalButtonTextCancel: {
        color: theme.colors.text,
        fontWeight: 'bold',
    },
    modalButtonTextSubmit: {
        color: 'white',
        fontWeight: 'bold',
    },
    uploadOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.6)',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
    },
    uploadText: {
        color: 'white',
        marginTop: 15,
        fontSize: 18,
        fontWeight: '600',
    }
}));
