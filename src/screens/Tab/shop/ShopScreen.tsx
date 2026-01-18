import React, { useCallback, useEffect, useState } from 'react';
import {
    View,
    Text,
    Image,
    TouchableOpacity,
    ActivityIndicator,
    RefreshControl,
    Dimensions,
    SectionList,
    Alert,
} from 'react-native';
import { useUnistyles, StyleSheet } from 'react-native-unistyles';
import { vw, vh } from '~/features/plantlist/styles/plantStyles';
import { LinearGradient } from 'expo-linear-gradient';
import MaskedView from '@react-native-masked-view/masked-view';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Audio } from 'expo-av';

import DraggableBottomSheet from '../../../components/DraggableBottomSheet';
import { useUserStore } from '../../../stores/UserStore';
import { RootStackParamList } from '~/navigation/Root';

const { height, width } = Dimensions.get('window');

// --- Shop Item Data ---
const SHOP_ITEMS = [
    { id: 'lootbox', name: 'Lootbox', category: 'special', rarity: 'rare', price: 500, currency: 'gold', icon: 'gift', color: '#9B59B6', description: 'Random rewards!' },
    { id: 'xp_boost_24h', name: 'XP Fertilizer', category: 'booster', rarity: 'epic', price: 500, currency: 'gold', icon: 'flask', color: '#2ecc71', description: 'x1.5 XP for 24h' },
    { id: 'streak_freeze_24h', name: 'Streak Freeze', category: 'booster', rarity: 'rare', price: 500, currency: 'gold', icon: 'snowflake', color: '#3498DB', description: 'Save your streak!' },
];

const RARITY_COLORS: { [key: string]: string } = {
    common: '#BDC3C7',
    rare: '#3498DB',
    epic: '#9B59B6',
    legendary: '#F1C40F',
};

// Inventory Metadata
const ITEM_METADATA: { [key: string]: any } = {
    'xp_boost_24h': { name: 'XP Fertilizer', icon: 'flask', color: '#2ecc71', rarity: 'epic', description: 'x1.5 XP for 24h' },
    'lootbox': { name: 'Lootbox', icon: 'gift', color: '#9B59B6', rarity: 'rare', description: 'Random rewards!' },
    'streak_freeze_24h': { name: 'Streak Freeze', icon: 'snowflake', color: '#3498DB', rarity: 'rare', description: 'Save your streak!' },
    'default': { name: 'Unknown Item', icon: 'box', color: '#BDC3C7', rarity: 'common', description: 'Mystery item' }
};

export default function ShopScreen() {
    const { theme } = useUnistyles();
    const route = useRoute<any>();
    const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();

    // Store
    const { profile, inventory, fetchProfile, fetchInventory, activateBooster, buyShopItem, buyLootbox } = useUserStore();

    // State
    const [activeTab, setActiveTab] = useState<'shop' | 'inventory'>('shop');
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [loadingId, setLoadingId] = useState<string | null>(null);
    const [sound, setSound] = useState<Audio.Sound | null>(null);

    // Handle route params for initial tab
    useEffect(() => {
        if (route.params?.initialTab) {
            setActiveTab(route.params.initialTab);
        }
    }, [route.params]);

    // Pre-load purchase sound
    useEffect(() => {
        async function loadSound() {
            try {
                const { sound } = await Audio.Sound.createAsync(
                    require('../../../../assets/sounds/cash-register-kaching-sound-effect-125042.wav')
                );
                setSound(sound);
            } catch (error) {
                console.log('Error loading sound', error);
            }
        }
        loadSound();

        return () => {
            if (sound) {
                sound.unloadAsync();
            }
        };
    }, []);

    const playPurchaseSound = async () => {
        try {
            if (sound) {
                await sound.replayAsync();
            } else {
                const { sound: newSound } = await Audio.Sound.createAsync(
                    require('../../../../assets/sounds/cash-register-kaching-sound-effect-125042.wav')
                );
                await newSound.playAsync();
                setSound(newSound);
            }
        } catch (error) {
            console.log('Error playing sound', error);
        }
    };

    // Refresh Data
    const handleRefresh = useCallback(async () => {
        setRefreshing(true);
        await Promise.all([fetchProfile(), fetchInventory()]);
        setRefreshing(false);
    }, [fetchProfile, fetchInventory]);

    // Purchase Handler
    const handlePurchase = async (item: typeof SHOP_ITEMS[0]) => {
        if (loadingId) return;
        setLoadingId(item.id);

        try {
            if (item.id === 'lootbox') {
                const result = await buyLootbox(item.price);
                if (result.success) {
                    playPurchaseSound();
                    navigation.navigate('Lootbox', {
                        itemName: 'Lootbox',
                        rewardId: result.rewardValue,
                        rewardType: result.rewardType
                    });
                } else {
                    Alert.alert('Oops!', result.message || 'Purchase failed');
                }
            } else {
                const result = await buyShopItem(item.id, item.price);
                if (result.success) {
                    playPurchaseSound();
                    Alert.alert('Success! 🎉', `${item.name} added to your inventory!`);
                } else {
                    Alert.alert('Oops!', result.message || 'Purchase failed');
                }
            }
        } catch (error) {
            Alert.alert('Error', 'Something went wrong.');
        } finally {
            setLoadingId(null);
        }
    };

    // Use Item Handler
    const handleUseItem = async (itemId: string) => {
        if (itemId === 'xp_boost_24h') {
            const result = await activateBooster(itemId);
            if (result.success) {
                Alert.alert('Boost Activated! 🚀', 'XP x1.5 active for 24 hours!');
            } else {
                Alert.alert('Error', result.message || 'Failed to activate');
            }
        } else {
            Alert.alert('Info', 'This item cannot be used directly.');
        }
    };

    // Sections for Shop
    const boosterItems = SHOP_ITEMS.filter(i => i.category === 'booster');
    const specialItems = SHOP_ITEMS.filter(i => i.category === 'special');

    const shopSections = [
        { title: 'Boosters', data: boosterItems.length > 0 ? boosterItems : [{ id: 'empty-boosters', type: 'empty' } as any] },
        { title: 'Special', data: specialItems.length > 0 ? specialItems : [{ id: 'empty-special', type: 'empty' } as any] },
    ];

    // Sections for Inventory
    const inventorySections = [
        { title: 'Your Items', data: inventory.length > 0 ? inventory : [{ id: 'empty-inventory', type: 'empty' } as any] },
    ];

    const sections = activeTab === 'shop' ? shopSections : inventorySections;

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <View style={{ flex: 1 }}>
                {/* BACKGROUND */}
                <View style={styles.bgContainer}>
                    <Image
                        source={require('../../../../assets/images/showDailyMissionsBackground.png')}
                        style={styles.bgImage}
                        resizeMode="cover"
                    />
                </View>

                {/* HEADER */}
                <View style={styles.headerWrapper}>
                    {/* Currency Display */}
                    <View style={styles.currencyRow}>
                        <View style={styles.currencyBadge}>
                            <FontAwesome6 name="coins" size={16} color="#FFD700" solid />
                            <Text style={styles.currencyText}>{profile?.plant_coins || 0}</Text>
                        </View>
                    </View>

                    <MaskedView
                        style={{ height: vh * 15, width: '100%', marginBottom: vh * 1 }}
                        maskElement={<Text style={styles.headerTitle}>Shop &{'\n'}Inventory</Text>}>
                        <LinearGradient
                            colors={['#FFFFFF', '#E0F7FA']}
                            start={{ x: 0.2, y: 0 }}
                            end={{ x: 0.8, y: 1 }}
                            style={{ flex: 1 }}
                        />
                    </MaskedView>

                    {/* Tab Switcher */}
                    <View style={styles.tabContainer}>
                        <TouchableOpacity
                            style={[styles.tabButton, activeTab === 'shop' && styles.activeTabButton]}
                            onPress={() => setActiveTab('shop')}
                        >
                            <FontAwesome6 name="store" size={14} color={activeTab === 'shop' ? '#FFF' : 'rgba(255,255,255,0.6)'} style={{ marginRight: 6 }} />
                            <Text style={[styles.tabText, activeTab === 'shop' && styles.activeTabText]}>SHOP</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.tabButton, activeTab === 'inventory' && styles.activeTabButton]}
                            onPress={() => setActiveTab('inventory')}
                        >
                            <FontAwesome6 name="box-open" size={14} color={activeTab === 'inventory' ? '#FFF' : 'rgba(255,255,255,0.6)'} style={{ marginRight: 6 }} />
                            <Text style={[styles.tabText, activeTab === 'inventory' && styles.activeTabText]}>INVENTORY</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* DRAGGABLE BOTTOM SHEET */}
                <DraggableBottomSheet initialHeight={0.55} maxHeight={0.80}>
                    <View style={{ flex: 1, paddingHorizontal: 20 }}>
                        {loading && !refreshing ? (
                            <ActivityIndicator
                                size="large"
                                color={theme.colors.primary}
                                style={{ marginTop: 20 }}
                            />
                        ) : (
                            <SectionList
                                sections={sections}
                                keyExtractor={(item) => item.id?.toString() || item.item_id}
                                removeClippedSubviews={true}
                                initialNumToRender={6}
                                maxToRenderPerBatch={4}
                                windowSize={7}
                                contentContainerStyle={{ paddingBottom: height * 0.5 }}
                                showsVerticalScrollIndicator={false}
                                renderSectionHeader={({ section: { title } }) => (
                                    <View style={styles.sectionHeaderContainer}>
                                        <Text style={styles.sectionTitle}>{title}</Text>
                                    </View>
                                )}
                                renderItem={({ item }) => {
                                    // Empty state
                                    if (item.type === 'empty') {
                                        const text = item.id === 'empty-inventory'
                                            ? "Your inventory is empty.\nBuy some items from the shop!"
                                            : 'No items available.';
                                        return (
                                            <View style={styles.emptyContainer}>
                                                <FontAwesome6 name="box-open" size={30} color={theme.colors.greyedOut} />
                                                <Text style={styles.emptyText}>{text}</Text>
                                            </View>
                                        );
                                    }

                                    // Shop Item
                                    if (activeTab === 'shop') {
                                        return (
                                            <View style={styles.itemWrapper}>
                                                <ShopItemCard
                                                    item={item}
                                                    onPurchase={() => handlePurchase(item)}
                                                    isLoading={loadingId === item.id}
                                                    disabled={loadingId !== null}
                                                />
                                            </View>
                                        );
                                    }

                                    // Inventory Item
                                    const meta = ITEM_METADATA[item.item_id] || ITEM_METADATA['default'];
                                    return (
                                        <View style={styles.itemWrapper}>
                                            <InventoryItemCard
                                                item={item}
                                                meta={meta}
                                                onUse={() => handleUseItem(item.item_id)}
                                            />
                                        </View>
                                    );
                                }}
                                refreshControl={
                                    <RefreshControl
                                        refreshing={refreshing}
                                        onRefresh={handleRefresh}
                                        tintColor={theme.colors.primary}
                                    />
                                }
                            />
                        )}
                    </View>
                </DraggableBottomSheet>
            </View>
        </GestureHandlerRootView>
    );
}

// --- SHOP ITEM CARD ---
function ShopItemCard({
    item,
    onPurchase,
    isLoading,
    disabled,
}: {
    item: typeof SHOP_ITEMS[0];
    onPurchase: () => void;
    isLoading: boolean;
    disabled: boolean;
}) {
    const rarityColor = RARITY_COLORS[item.rarity] || RARITY_COLORS.common;

    return (
        <View style={[styles.card, { borderLeftColor: rarityColor, borderLeftWidth: 4 }]}>
            <View style={styles.cardContent}>
                {/* Icon */}
                <View style={[styles.iconContainer, { backgroundColor: item.color }]}>
                    <FontAwesome6 name={item.icon} size={24} color="#FFF" solid />
                </View>

                {/* Info */}
                <View style={styles.cardInfo}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={styles.itemName}>{item.name}</Text>
                        <View style={[styles.rarityBadge, { backgroundColor: rarityColor }]}>
                            <Text style={styles.rarityText}>{item.rarity.toUpperCase()}</Text>
                        </View>
                    </View>
                    <Text style={styles.itemDescription}>{item.description}</Text>
                </View>

                {/* Price Button */}
                <TouchableOpacity
                    style={[styles.priceButton, isLoading && { opacity: 0.6 }]}
                    onPress={onPurchase}
                    disabled={disabled}
                >
                    <LinearGradient
                        colors={['#F1C40F', '#F39C12']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={StyleSheet.absoluteFillObject}
                    />
                    {isLoading ? (
                        <ActivityIndicator size="small" color="#FFF" />
                    ) : (
                        <>
                            <FontAwesome6 name="coins" size={12} color="#5D4037" style={{ marginRight: 4 }} solid />
                            <Text style={styles.priceText}>{item.price}</Text>
                        </>
                    )}
                </TouchableOpacity>
            </View>
        </View>
    );
}

// --- INVENTORY ITEM CARD ---
function InventoryItemCard({
    item,
    meta,
    onUse,
}: {
    item: any;
    meta: any;
    onUse: () => void;
}) {
    const rarityColor = RARITY_COLORS[meta.rarity] || RARITY_COLORS.common;
    const canUse = item.item_id === 'xp_boost_24h';

    return (
        <View style={[styles.card, { borderLeftColor: rarityColor, borderLeftWidth: 4 }]}>
            <View style={styles.cardContent}>
                {/* Icon */}
                <View style={[styles.iconContainer, { backgroundColor: meta.color }]}>
                    <FontAwesome6 name={meta.icon} size={24} color="#FFF" solid />
                </View>

                {/* Info */}
                <View style={styles.cardInfo}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={styles.itemName}>{meta.name}</Text>
                        <View style={styles.quantityBadge}>
                            <Text style={styles.quantityText}>x{item.quantity}</Text>
                        </View>
                    </View>
                    <Text style={styles.itemDescription}>{meta.description}</Text>
                </View>

                {/* Use Button */}
                {canUse ? (
                    <TouchableOpacity style={styles.useButton} onPress={onUse}>
                        <LinearGradient
                            colors={['#2ecc71', '#27ae60']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={StyleSheet.absoluteFillObject}
                        />
                        <Text style={styles.useButtonText}>USE</Text>
                    </TouchableOpacity>
                ) : (
                    <View style={styles.heldBadge}>
                        <FontAwesome6 name="check" size={14} color="#329D9C" />
                    </View>
                )}
            </View>
        </View>
    );
}

// --- STYLES ---
const styles = StyleSheet.create((theme) => ({
    bgContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '55%',
        justifyContent: 'flex-end',
        zIndex: -1,
    },
    bgImage: { width: '100%', height: '100%' },
    headerWrapper: {
        position: 'absolute',
        top: vh * 6,
        left: 0,
        right: 0,
        paddingHorizontal: vw * 5,
        alignItems: 'flex-start',
    },
    currencyRow: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        width: '100%',
        marginBottom: vh * 1,
    },
    currencyBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.3)',
        paddingHorizontal: vw * 3,
        paddingVertical: vh * 0.8,
        borderRadius: vw * 5,
        gap: 6,
    },
    currencyText: {
        color: '#FFF',
        fontSize: vw * 4,
        fontWeight: 'bold',
    },
    headerTitle: {
        fontSize: vw * 10,
        fontWeight: '900',
        color: 'white',
        lineHeight: vw * 11,
        textAlign: 'left',
    },
    tabContainer: {
        flexDirection: 'row',
        gap: vw * 3,
        marginTop: vh * 1,
    },
    tabButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: vh * 1.2,
        paddingHorizontal: vw * 5,
        borderRadius: vw * 6,
        backgroundColor: 'rgba(255,255,255,0.15)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.3)',
    },
    activeTabButton: {
        backgroundColor: 'rgba(50, 157, 156, 0.8)',
        borderColor: '#329D9C',
    },
    tabText: {
        color: 'rgba(255,255,255,0.6)',
        fontWeight: '700',
        fontSize: vw * 3,
    },
    activeTabText: {
        color: '#FFF',
    },

    sectionHeaderContainer: { marginBottom: vh * 1, marginTop: vh * 1 },
    sectionTitle: { fontSize: vw * 4.5, fontWeight: 'bold', color: theme.colors.text, textAlign: 'center' },

    itemWrapper: {
        backgroundColor: theme.colors.surface,
        paddingHorizontal: vw * 3,
        paddingVertical: vh * 1,
        marginHorizontal: 0,
        borderRadius: vw * 3,
        marginBottom: vh * 1,
    },
    emptyContainer: {
        backgroundColor: theme.colors.surface,
        borderRadius: vw * 5,
        padding: vw * 6,
        borderWidth: 2,
        borderColor: theme.colors.greyedOut,
        borderStyle: 'dashed',
        alignItems: 'center',
        gap: 10,
    },
    emptyText: {
        textAlign: 'center',
        color: theme.colors.typography,
        fontStyle: 'italic',
        fontSize: vw * 3.5,
    },

    card: {
        backgroundColor: theme.colors.background,
        borderRadius: vw * 3.5,
        padding: vw * 3,
        shadowColor: theme.colors.text,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    cardContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconContainer: {
        width: vw * 14,
        height: vw * 14,
        borderRadius: vw * 3,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: vw * 3,
    },
    cardInfo: {
        flex: 1,
    },
    itemName: {
        fontSize: vw * 4,
        fontWeight: '700',
        color: theme.colors.text,
    },
    itemDescription: {
        fontSize: vw * 3,
        color: theme.colors.typography,
        marginTop: 2,
    },
    rarityBadge: {
        marginLeft: vw * 2,
        paddingHorizontal: vw * 2,
        paddingVertical: vh * 0.3,
        borderRadius: vw * 2,
    },
    rarityText: {
        color: '#FFF',
        fontSize: vw * 2.5,
        fontWeight: '800',
    },
    quantityBadge: {
        marginLeft: vw * 2,
        backgroundColor: 'rgba(50, 157, 156, 0.15)',
        paddingHorizontal: vw * 2,
        paddingVertical: vh * 0.3,
        borderRadius: vw * 2,
        borderWidth: 1,
        borderColor: '#329D9C',
    },
    quantityText: {
        color: '#329D9C',
        fontSize: vw * 3,
        fontWeight: '700',
    },
    priceButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        width: vw * 20,
        height: vh * 4.5,
        borderRadius: vw * 4,
        overflow: 'hidden',
    },
    priceText: {
        color: '#5D4037',
        fontWeight: '800',
        fontSize: vw * 3.5,
    },
    useButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        width: vw * 16,
        height: vh * 4,
        borderRadius: vw * 4,
        overflow: 'hidden',
    },
    useButtonText: {
        color: '#FFF',
        fontWeight: '800',
        fontSize: vw * 3,
    },
    heldBadge: {
        width: vw * 10,
        height: vw * 10,
        borderRadius: vw * 5,
        backgroundColor: 'rgba(50, 157, 156, 0.15)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#329D9C',
    },
}));
