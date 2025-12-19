import React, { useCallback } from 'react';
import { View, Text, FlatList, Image, TouchableOpacity, Dimensions } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { useNavigation, useFocusEffect, useRoute, RouteProp } from '@react-navigation/native';
import { usePlants } from '../../../features/plantlist/hooks/usePlants';
import GradientIcon from '../../../components/GradientIcon';
import { RootStackParamList } from '../../../navigation/Root';
import { useUserStore } from '../../../stores/UserStore';

const { width } = Dimensions.get('window');
const COLUMN_COUNT = 3;
const SPACING = 10;
const ITEM_WIDTH = (width - (SPACING * (COLUMN_COUNT + 1))) / COLUMN_COUNT;

export default function UserPlantsScreen() {
    const { theme } = useUnistyles();
    const navigation = useNavigation();
    const route = useRoute<RouteProp<RootStackParamList, 'UserPlants'>>();
    const paramsUserId = route.params?.userId;

    const { user: currentUser } = useUserStore();
    const targetUserId = paramsUserId || currentUser?.id;
    const isOwner = targetUserId === currentUser?.id;

    // We can fetch the username for the header if it's another user
    // Or just use generic "User's Plants" if not passed.
    // Ideally we might want to fetch profile briefly or pass username in params.
    // For now: "My Plants" vs "Plants"

    const { plants, refreshPlants } = usePlants(targetUserId);

    useFocusEffect(
        useCallback(() => {
            refreshPlants();
        }, [targetUserId])
    );

    const renderItem = ({ item }: { item: any }) => {
        // Mock health for now as it's not in the hook yet, or generate random
        const health = 75;

        return (
            <View style={styles.cardContainer}>
                <View style={styles.healthBadge}>
                    <View style={[styles.healthCircle, { borderColor: health > 50 ? theme.colors.primary : 'red' }]}>
                        <Text style={styles.healthText}>{health}%</Text>
                    </View>
                </View>

                <Image
                    source={item.image || require('../../../../assets/images/plant4.png')}
                    style={styles.plantImage}
                    resizeMode="contain"
                />

                <Text style={styles.plantName} numberOfLines={1}>{item.name}</Text>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <GradientIcon name="chevron-left" size={24} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{isOwner ? "My Plants" : "Plants"}</Text>
                <View style={{ width: 24 }} />
            </View>

            <FlatList
                data={plants}
                renderItem={renderItem}
                keyExtractor={(item) => item.id}
                numColumns={COLUMN_COUNT}
                contentContainerStyle={styles.listContent}
                columnWrapperStyle={styles.columnWrapper}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyText}>No plants found.</Text>
                    </View>
                }
            />
        </View>
    );
}

const styles = StyleSheet.create((theme) => ({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 50,
        paddingBottom: 20,
    },
    backButton: {
        padding: 5,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: theme.colors.text,
    },
    listContent: {
        padding: SPACING,
    },
    columnWrapper: {
        justifyContent: 'space-between',
    },
    cardContainer: {
        width: ITEM_WIDTH,
        height: ITEM_WIDTH * 1.4, // Aspect ratio
        backgroundColor: '#fff', // White card as requested
        borderRadius: 20,
        padding: 10,
        marginBottom: SPACING,
        alignItems: 'center',
        justifyContent: 'space-between',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
        position: 'relative',
    },
    healthBadge: {
        position: 'absolute',
        top: 8,
        right: 8,
        zIndex: 1,
    },
    healthCircle: {
        width: 36,
        height: 36,
        borderRadius: 18,
        borderWidth: 3,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#fff',
    },
    healthText: {
        fontSize: 10,
        fontWeight: 'bold',
        color: theme.colors.text,
    },
    plantImage: {
        width: '80%',
        height: '60%',
        marginTop: 10,
    },
    plantName: {
        fontSize: 14,
        fontWeight: '600',
        color: '#000',
        marginBottom: 5,
        textAlign: 'center',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 50,
    },
    emptyText: {
        fontSize: 16,
        color: theme.colors.typography,
    }
}));
