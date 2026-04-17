import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, FlatList, Image, TouchableOpacity, Dimensions } from 'react-native';
import { StyleSheet, useUnistyles } from '~/lib/unistyles';
import { useNavigation, useFocusEffect, useRoute, RouteProp } from '@react-navigation/native';
import { usePlants } from '../../../features/plantlist/hooks/usePlants';
import GradientIcon from '../../../components/GradientIcon';
import { RootStackParamList } from '../../../navigation/Root';
import { useUserStore } from '../../../stores/UserStore';
import { calculateHealth, calculateHealthFull } from '~/features/plantstats/api/healthScore';
import { db } from '~/utils/supabase';
import { PlantItem } from '../../../features/plantlist/types/plant.types';

const { width } = Dimensions.get('window');
const COLUMN_COUNT = 2; // 🟢 Changed to 2 for larger cards
const SPACING = 15; // 🟢 Increased spacing
// Calculate width: (Total Width - Outside Padding - Middle Gap) / 2
const ITEM_WIDTH = (width - (20 * 2) - SPACING) / COLUMN_COUNT;

type ControllerReading = {
    id: string;
    device_id: string;
    temperature: number | null;
    humidity: number | null;
    soil_moisture: number | null;
    light: number | null;
    electrical_conductivity: number | null;
    time?: string | null;
    created_at?: string | null;
};

const CONTROLLER_HEALTH_SELECT =
    'id, device_id, temperature, humidity, soil_moisture, light, electrical_conductivity, time, created_at';

const getHealthColor = (health: number | null | undefined, theme: any) => {
    if (health == null) return theme.colors.greyedOut;
    if (health >= 70) return theme.colors.primary;
    if (health >= 40) return '#F59E0B';
    return '#EF4444';
};

export default function UserPlantsScreen() {
    const { theme } = useUnistyles();
    const navigation = useNavigation();
    const route = useRoute<RouteProp<RootStackParamList, 'UserPlants'>>();
    const paramsUserId = route.params?.userId;

    const { user: currentUser } = useUserStore();
    const targetUserId = paramsUserId || currentUser?.id;
    const isOwner = targetUserId === currentUser?.id;

    const { plants, refreshPlants } = usePlants(targetUserId);
    const [healthByPlantId, setHealthByPlantId] = useState<Record<string, number | null>>({});

    useFocusEffect(
        useCallback(() => {
            refreshPlants();
        }, [targetUserId])
    );

    useEffect(() => {
        let cancelled = false;

        const loadHealthScores = async () => {
            if (plants.length === 0) {
                setHealthByPlantId({});
                return;
            }

            const healthEntries = await Promise.all(
                plants.map(async (plant) => {
                    if (!plant.sensorBoxId) {
                        return [plant.id, null] as const;
                    }

                    try {
                        const { data, error } = await db.micro
                            .from('Controllers')
                            .select(CONTROLLER_HEALTH_SELECT)
                            .eq('device_id', plant.sensorBoxId)
                            .order('time', { ascending: false })
                            .limit(200);

                        if (error) {
                            console.error('[UserPlants] health lookup failed', error);
                            return [plant.id, null] as const;
                        }

                        const history = ((data ?? []) as ControllerReading[]).filter(Boolean);
                        const latest = history[0];

                        if (!latest) {
                            return [plant.id, null] as const;
                        }

                        const fullHealth = calculateHealthFull(
                            latest as unknown as Record<string, number | null>,
                            plant.plantTypeName,
                            { history: history as unknown as Array<Record<string, any>> }
                        );
                        const health = fullHealth?.health_percent ?? calculateHealth(latest);

                        return [plant.id, health] as const;
                    } catch (error) {
                        console.error('[UserPlants] health calculation failed', error);
                        return [plant.id, null] as const;
                    }
                })
            );

            if (!cancelled) {
                setHealthByPlantId(Object.fromEntries(healthEntries));
            }
        };

        void loadHealthScores();

        return () => {
            cancelled = true;
        };
    }, [plants]);

    const renderItem = ({ item }: { item: PlantItem }) => {
        const health = healthByPlantId[item.id];
        const healthColor = getHealthColor(health, theme);

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
                    <View style={[styles.healthCircle, { borderColor: healthColor }]}>
                        <Text style={[styles.healthText, { color: healthColor }]}>
                            {health == null ? '--' : `${health}%`}
                        </Text>
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
                    <Text style={styles.plantName} numberOfLines={1}>{item.name}</Text>
                    <Text style={styles.subText}>{item.plantTypeName || 'Plant'}</Text>
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
