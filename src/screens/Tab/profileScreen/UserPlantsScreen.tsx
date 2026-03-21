import React, { useCallback } from 'react';
import { View, Text, FlatList, Image, TouchableOpacity, Dimensions } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { useNavigation, useFocusEffect, useRoute, RouteProp } from '@react-navigation/native';
import { usePlants } from '../../../features/plantlist/hooks/usePlants';
import GradientIcon from '../../../components/GradientIcon';
import { RootStackParamList } from '../../../navigation/Root';
import { useUserStore } from '../../../stores/UserStore';

const { width } = Dimensions.get('window');
const COLUMN_COUNT = 2; // 🟢 Changed to 2 for larger cards
const SPACING = 15; // 🟢 Increased spacing
// Calculate width: (Total Width - Outside Padding - Middle Gap) / 2
const ITEM_WIDTH = (width - (20 * 2) - SPACING) / COLUMN_COUNT;

export default function UserPlantsScreen() {
    const { theme } = useUnistyles();
    const navigation = useNavigation();
    const route = useRoute<RouteProp<RootStackParamList, 'UserPlants'>>();
    const paramsUserId = route.params?.userId;

    const { user: currentUser } = useUserStore();
    const targetUserId = paramsUserId || currentUser?.id;
    const isOwner = targetUserId === currentUser?.id;

    const { plants, refreshPlants } = usePlants(targetUserId);

    useFocusEffect(
        useCallback(() => {
            refreshPlants();
        }, [targetUserId])
    );

    const renderItem = ({ item }: { item: any }) => {
        // Mock health for now
        const health = 75;

        return (
            <TouchableOpacity
                activeOpacity={0.9}
                style={styles.cardContainer}
                onPress={() => {
                    // Optional: Navigate to detail if needed
                    // navigation.navigate('ShowPlantStats', { plantId: item.id });
                }}
            >
                <View style={styles.healthBadge}>
                    <View style={[styles.healthCircle, { borderColor: health > 50 ? theme.colors.primary : '#ef4444' }]}>
                        <Text style={styles.healthText}>{health}%</Text>
                    </View>
                </View>

                {/* Image Container for better centering */}
                <View style={styles.imageWrapper}>
                    {item.image_url ? (
                        <Image
                            source={{ uri: item.image_url }}
                            style={styles.plantImage}
                            resizeMode="contain"
                        />
                    ) : (
                        <Image
                            source={item.image || ""}
                            style={styles.plantImage}
                            resizeMode="contain"
                        />
                    )}
                </View>

                <View style={styles.infoContainer}>
                    <Text style={styles.plantName} numberOfLines={1}>{item.nickname || item.name}</Text>
                    <Text style={styles.subText}>{item.species || 'Plant'}</Text>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => {
                    if (navigation.canGoBack()) {
                        navigation.goBack();
                    }
                }} style={styles.backButton}>
                    <GradientIcon name="chevron-left" size={28} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{isOwner ? "My Plants" : "Plants"}</Text>
                <View style={{ width: 28 }} />
            </View>

            <FlatList
                data={plants}
                renderItem={renderItem}
                keyExtractor={(item) => item.id}
                numColumns={COLUMN_COUNT}
                // 🟢 Force re-render when columns change to avoid "changing numColumns on the fly" error
                key={`plants-grid-${COLUMN_COUNT}`}
                contentContainerStyle={styles.listContent}
                columnWrapperStyle={styles.columnWrapper}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Image
                            // Fallback illustration
                            style={{ width: 100, height: 100, opacity: 0.5, marginBottom: 10 }}
                            resizeMode="contain"
                        />
                        <Text style={styles.emptyText}>No plants found.</Text>
                        <Text style={styles.emptySubText}>Add your first plant to get started!</Text>
                    </View>
                }
            />
        </View>
    );
}

const styles = StyleSheet.create((theme) => ({
    container: {
        flex: 1,
        backgroundColor: '#F8F9FA', // Slightly gray background for contrast
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 60, // Match other screens
        paddingBottom: 20,
        backgroundColor: '#F8F9FA',
    },
    backButton: {
        padding: 5,
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: '800',
        color: theme.colors.text,
        letterSpacing: 0.5,
    },
    listContent: {
        paddingHorizontal: 20,
        paddingTop: 10,
        paddingBottom: 100,
    },
    columnWrapper: {
        justifyContent: 'space-between',
        marginBottom: SPACING,
    },
    cardContainer: {
        width: ITEM_WIDTH,
        height: ITEM_WIDTH * 1.3, // 4:5 Aspect Ratio typically looks good
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        padding: 12,
        alignItems: 'center',
        justifyContent: 'space-between',

        // Premium Shadow
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 6,
    },
    healthBadge: {
        position: 'absolute',
        top: 10,
        right: 10,
        zIndex: 10,
    },
    healthCircle: {
        width: 32,
        height: 32,
        borderRadius: 16,
        borderWidth: 2.5,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.9)',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    healthText: {
        fontSize: 9,
        fontWeight: '900',
        color: theme.colors.text,
    },
    imageWrapper: {
        flex: 1,
        width: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 10,
    },
    plantImage: {
        width: '90%',
        height: '90%',
        // drop shadow for the plant itself effectively makes it pop
    },
    infoContainer: {
        width: '100%',
        alignItems: 'center',
        paddingTop: 5,
        paddingBottom: 5,
    },
    plantName: {
        fontSize: 16,
        fontWeight: '700',
        color: theme.colors.text,
        textAlign: 'center',
        marginBottom: 2,
    },
    subText: {
        fontSize: 12,
        fontWeight: '500',
        color: theme.colors.typography, // Gray scaling
        opacity: 0.6,
    },

    // Empty State
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 100,
    },
    emptyText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: theme.colors.text,
        marginBottom: 8,
    },
    emptySubText: {
        fontSize: 14,
        color: theme.colors.typography,
        opacity: 0.7,
    }
}));
