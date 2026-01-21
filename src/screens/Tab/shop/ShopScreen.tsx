import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, SafeAreaView, StatusBar, Dimensions, StyleSheet } from 'react-native';
import { useUnistyles } from 'react-native-unistyles';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useUserStore } from '~/stores/UserStore';

// --- Placeholder Data ---
const MOCK_ITEMS = [
    { id: 'lootbox', name: 'Lootbox', rarity: 'rare', quantity: 'x1', price: '500', currency: 'gold', imageColor: '#E67E22', icon: 'gift' },
    { id: 'xp_boost_24h', name: 'XP Boost', rarity: 'epic', quantity: 'x1', price: '500', currency: 'gold', imageColor: '#9B59B6', icon: 'flask', image: require('../../../../assets/images/XPBoostItem.png') },
    { id: 'streak_freeze_24h', name: 'Streak Freeze', rarity: 'rare', quantity: 'x1', price: '500', currency: 'gold', imageColor: '#3498DB', icon: 'snowflake' },
];

const RARITY_COLORS: { [key: string]: string } = {
    common: '#BDC3C7',
    rare: '#3498DB',
    epic: '#9B59B6',
    legendary: '#F1C40F',
};


// Metadata for Inventory Items (Client-side mapping for visuals)
const ITEM_METADATA: { [key: string]: any } = {
    'xp_boost_24h': { name: 'XP Boost', icon: 'flask', color: '#9B59B6', rarity: 'epic', description: 'x1.5 XP for 24h', image: require('../../../../assets/images/XPBoostItem.png') },
    'lootbox': { name: 'Lootbox', icon: 'gift', color: '#E67E22', rarity: 'rare', description: 'Random rewards!' },
    'streak_freeze_24h': { name: 'Streak Freeze', icon: 'snowflake', color: '#3498DB', rarity: 'rare', description: 'Save your streak!' },
    // Add generic fallback
    'default': { name: 'Unknown Item', icon: 'box', color: '#BDC3C7', rarity: 'common', description: 'Mystery item' }
};

import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '~/navigation/Root';

import { Audio } from 'expo-av';
import { playSound } from '~/utils/SoundManager';

export default function ShopScreen() {
    const { theme } = useUnistyles();
    const styles = getStyles(theme); // Use manual style generation
    const route = useRoute<any>();
    const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
    
    // Store
    const { profile, inventory, activateBooster, buyShopItem, buyLootbox } = useUserStore();
    
    // State
    const [activeTab, setActiveTab] = React.useState<'shop' | 'inventory'>('shop');
    const [loadingId, setLoadingId] = React.useState<string | null>(null);

    React.useEffect(() => {
        if (route.params?.initialTab) {
            setActiveTab(route.params.initialTab);
        }
    }, [route.params]);

    const handlePurchase = async (item: typeof MOCK_ITEMS[0]) => {
        if (loadingId) return;
        setLoadingId(item.id);

        try {
            if (item.id === 'lootbox') {
                const result = await buyLootbox(Number(item.price));
                if (result.success) {
                    playSound('purchase'); 
                    // Navigate to Lootbox screen with the reward
                    navigation.navigate('Lootbox', { 
                        itemName: 'Lootbox',
                        rewardId: result.rewardValue, // @ts-ignore
                        rewardType: result.rewardType
                    });
                } else {
                    alert(`${result.message}`);
                }
            } else {
                const result = await buyShopItem(item.id, Number(item.price));
                if (result.success) {
                    playSound('purchase'); 
                    // alert('Purchase Successful!'); // Removed as requested
                } else {
                    alert(result.message || 'Purchase Failed');
                }
            }
        } catch (error) {
            alert('Something went wrong.');
        } finally {
            setLoadingId(null);
        }
    };

    const handleUseItem = async (itemId: string) => {
        if (itemId === 'xp_boost_24h') {
             const result = await activateBooster(itemId);
             if (result.success) {
                 alert('Booster Activated!');
             } else {
                 alert(result.message || 'Failed');
             }
        } else {
            alert('This item cannot be used here.');
        }
    };

    const renderInventory = () => {
        if (!inventory || inventory.length === 0) {
            return (
                <View style={styles.emptyStateContainer}>
                    <FontAwesome6 name="box-open" size={40} color="#BDC3C7" />
                    <Text style={styles.emptyStateText}>Your inventory is empty.{'\n'}Buy some items from the shop!</Text>
                </View>
            );
        }

        return (
            <View style={styles.grid}>
                 {inventory.map((invItem) => {
                     const meta = ITEM_METADATA[invItem.item_id] || ITEM_METADATA['default'];
                     return (
                        <View key={invItem.item_id} style={[styles.card, { borderColor: meta.color || RARITY_COLORS[meta.rarity] }]}>
                            <View style={[styles.rarityStripe, { backgroundColor: meta.color || RARITY_COLORS[meta.rarity] }]} />
                            
                            <View style={[styles.imagePlaceholder, { backgroundColor: meta.color }]}>
                                {meta.image ? (
                                    <Image source={meta.image} style={{ width: 60, height: 60, resizeMode: 'contain' }} />
                                ) : (
                                    <FontAwesome6 name={meta.icon} size={32} color="#FFF" />
                                )}
                            </View>

                            <Text style={styles.itemName} numberOfLines={1}>{meta.name}</Text>
                            <Text style={[styles.rarityLabel, { color: meta.color || RARITY_COLORS[meta.rarity], fontSize: 9 }]}>
                                {meta.description}
                            </Text>
                            
                            <View style={styles.quantityBadge}>
                                <Text style={styles.quantityText}>x{invItem.quantity}</Text>
                            </View>

                            <TouchableOpacity 
                                style={[styles.priceButton, { backgroundColor: '#27ae60', borderBottomColor: '#219150' }]}
                                onPress={() => handleUseItem(invItem.item_id)}
                            >
                                <Text style={styles.freeText}>USE</Text>
                            </TouchableOpacity>
                        </View>
                     );
                 })}
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" />
            
            {/* Top Bar / Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <FontAwesome6 name="arrow-left" size={20} color="#2C3E50" />
                </TouchableOpacity>

                <View style={styles.headerRight}>
                    <View style={styles.currencyContainer}>
                        <View style={styles.currencyItem}>
                            <FontAwesome6 name="coins" size={16} color="#FFD700" />
                            <Text style={styles.currencyText}>{profile?.plant_coins || 0}</Text>
                        </View>
                    </View>
                </View>
            </View>

            {/* Tab Switcher */}
            <View style={styles.tabContainer}>
                <TouchableOpacity 
                    style={[styles.tabButton, activeTab === 'shop' && styles.activeTabButton]} 
                    onPress={() => setActiveTab('shop')}
                >
                    <Text style={[styles.tabText, activeTab === 'shop' && styles.activeTabText]}>SHOP</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                    style={[styles.tabButton, activeTab === 'inventory' && styles.activeTabButton]} 
                    onPress={() => setActiveTab('inventory')}
                >
                    <Text style={[styles.tabText, activeTab === 'inventory' && styles.activeTabText]}>INVENTORY</Text>
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                
                {activeTab === 'shop' ? (
                    <>
                        {/* Shop Grid */}
                        <View style={styles.grid}>
                            {MOCK_ITEMS.map((item) => (
                                <View key={item.id} style={[styles.card, { borderColor: item.imageColor || RARITY_COLORS[item.rarity] }]}>
                                    {/* Rarity Ribbon (Simple Corner Detail) */}
                                    <View style={[styles.rarityStripe, { backgroundColor: item.imageColor || RARITY_COLORS[item.rarity] }]} />

                                    {/* Item Image Placeholder */}
                                    <View style={[styles.imagePlaceholder, { backgroundColor: item.imageColor }]}>
                                        {(item as any).image ? (
                                            <Image source={(item as any).image} style={{ width: 60, height: 60, resizeMode: 'contain' }} />
                                        ) : (
                                            <FontAwesome6 name={item.icon} size={32} color="#FFF" />
                                        )}
                                    </View>

                                    {/* Item Info */}
                                    <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
                                    <Text style={[styles.rarityLabel, { color: item.imageColor || RARITY_COLORS[item.rarity] }]}>
                                        {item.rarity.toUpperCase()}
                                    </Text>
                                    <View style={styles.quantityBadge}>
                                        <Text style={styles.quantityText}>{item.quantity}</Text>
                                    </View>

                                    {/* Price Button */}
                                    <TouchableOpacity 
                                        style={[styles.priceButton, loadingId === item.id && { opacity: 0.7 }]}
                                        onPress={() => handlePurchase(item)}
                                        disabled={loadingId !== null}
                                    >
                                        {loadingId === item.id ? (
                                             <Text style={styles.freeText}>...</Text>
                                        ) : item.price === 'FREE' ? (
                                            <Text style={styles.freeText}>FREE</Text>
                                        ) : (
                                            <>
                                                {item.currency === 'gems' ? (
                                                    <FontAwesome6 name="gem" size={12} color="#FFF" style={{ marginRight: 4 }} />
                                                ) : (
                                                    <FontAwesome6 name="coins" size={12} color="#5D4037" style={{ marginRight: 4 }} />
                                                )}
                                                <Text style={item.currency === 'gems' ? styles.priceTextGem : styles.priceTextGold}>
                                                    {item.price}
                                                </Text>
                                            </>
                                        )}
                                    </TouchableOpacity>
                                </View>
                            ))}
                        </View>


                    </>
                ) : (
                    // INVENTORY VIEW
                    renderInventory()
                )}

            </ScrollView>
        </SafeAreaView>
    );
}

const getStyles = (theme: any) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 15,
        backgroundColor: theme.colors.surface, // Assuming card color fits or use separate header color
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.greyedOut || '#E0E0E0', 
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    backButton: {
        padding: 5,
        marginRight: 15,
    },
    headerRight: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'flex-end',
        alignItems: 'center',
        gap: 15,
    },
    currencyContainer: {
        flexDirection: 'row',
        gap: 15,
    },
    currencyItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.background, // Contrast against header
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 15,
        gap: 6,
        borderWidth: 1,
        borderColor: theme.colors.greyedOut || '#E0E0E0',
    },
    currencyText: {
        color: theme.colors.text,
        fontWeight: 'bold',
        fontSize: 14,
    },
    scrollContent: {
        padding: 20,
        paddingBottom: 40,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    card: {
        width: (Dimensions.get('window').width - 50) / 2,
        backgroundColor: theme.colors.surface || '#FFF',
        borderRadius: 16,
        marginBottom: 20,
        padding: 10,
        alignItems: 'center',
        borderWidth: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 5,
        elevation: 5,
        overflow: 'hidden',
        borderColor: theme.colors.greyedOut, // Default
    },
    rarityStripe: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 6,
    },
    imagePlaceholder: {
        width: 80,
        height: 80,
        borderRadius: 12,
        marginBottom: 10,
        marginTop: 10,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
    },
    itemName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: theme.colors.text,
        marginBottom: 2,
        textAlign: 'center',
    },
    rarityLabel: {
        fontSize: 10,
        fontWeight: '800',
        marginBottom: 5,
        letterSpacing: 0.5,
    },
    quantityBadge: {
        position: 'absolute',
        top: 10,
        right: 10,
        backgroundColor: 'rgba(0,0,0,0.6)',
        borderRadius: 8,
        paddingHorizontal: 6,
        paddingVertical: 2,
    },
    quantityText: {
        color: '#FFF',
        fontSize: 10,
        fontWeight: 'bold',
    },
    priceButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F1C40F',
        paddingVertical: 8,
        paddingHorizontal: 15,
        borderRadius: 20,
        width: '100%',
        marginTop: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
        elevation: 3,
    },
    freeText: {
        color: '#FFF',
        fontWeight: '900',
        fontSize: 14,
        textShadowColor: 'rgba(0,0,0,0.2)',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 1,
    },
    priceTextGold: {
        color: '#5D4037',
        fontWeight: 'bold',
        fontSize: 14,
    },
    priceTextGem: {
        color: '#FFF',
        fontWeight: 'bold',
        fontSize: 14,
    },
    emptyStateContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 40,
        backgroundColor: theme.colors.surface || '#FFF',
        borderRadius: 20,
        marginTop: 20,
        borderWidth: 2,
        borderColor: theme.colors.greyedOut || '#BDC3C7',
        borderStyle: 'dashed',
    },
    emptyStateText: {
        fontSize: 16,
        color: theme.colors.text,
        marginTop: 10,
        textAlign: 'center',
        fontWeight: '500',
    },
    tabContainer: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        marginBottom: 15,
        gap: 15,
        marginTop: 15,
    },
    tabButton: {
        flex: 1,
        paddingVertical: 10,
        backgroundColor: theme.colors.surface || '#FFF',
        borderRadius: 20,
        alignItems: 'center',
        borderWidth: 2,
        borderColor: theme.colors.greyedOut || '#BDC3C7',
    },
    activeTabButton: {
        borderColor: '#3498DB',
        backgroundColor: theme.colors.primary ? theme.colors.primary + '20' : '#EBF5FB', // 20% opacity of primary
    },
    tabText: {
        fontWeight: 'bold',
        color: theme.colors.text,
        fontSize: 14,
        opacity: 0.6
    },
    activeTabText: {
        color: '#3498DB',
        opacity: 1
    },
});
