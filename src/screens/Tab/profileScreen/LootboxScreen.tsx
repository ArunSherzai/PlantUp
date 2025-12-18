import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../../../navigation/Root';
import { db } from '~/utils/supabase';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type LootboxScreenRouteProp = RouteProp<RootStackParamList, 'Lootbox'>;

export default function LootboxScreen() {
    const { theme } = useUnistyles();
    const navigation = useNavigation();
    const route = useRoute<LootboxScreenRouteProp>();
    // Default to 'Rare Plant' if param is missing (though typings say optional in plan, let's be safe)
    const itemName = route.params?.itemName || 'Rare Plant';

    const [showReward, setShowReward] = useState(false);
    const [rewardItem, setRewardItem] = useState<any>(null);
    const [isDuplicate, setIsDuplicate] = useState(false);

    useEffect(() => {
        setShowReward(false);
        setRewardItem(null);
        setIsDuplicate(false);

        const fetchDataAndWait = async () => {
            // 1. Min wait time for animation
            const timerPromise = new Promise(resolve => setTimeout(resolve, 3000));
            // 2. Fetch data
            const fetchPromise = pullBorder();

            // 3. Wait for both
            const [_, fetchedBorder] = await Promise.all([timerPromise, fetchPromise]);

            if (fetchedBorder) {
                setRewardItem(fetchedBorder);
            }
            setShowReward(true);
        };

        fetchDataAndWait();
    }, []);

    const handleClose = () => {
        navigation.goBack();
    };


    const pullBorder = async () => {
        try {
            // 1. Get current user
            const { data: { user }, error: userError } = await db.public.auth.getUser();
            if (userError || !user) throw new Error("No user found");

            // 2. Call RPC to get a random border
            // The function is in the gamification schema and requires parameters.
            const { data, error: rpcError } = await (db.gamification as any)
                .rpc('get_random_border', {
                    target_schema: 'gamification',
                    target_table: 'Cosmetic_avatar_borders'
                })
                .single();

            const border = data as any; // Cast so we can access properties. Ideally define an interface.

            if (rpcError) throw rpcError;
            if (!border) throw new Error("No border returned");

            console.log('Random Border:', border);

            // Fix media_url using Supabase Storage
            if (border && border.media_url) {
                // Folder structure is 'rarity/filename' (e.g., 'common/green_flower_border.png')
                // We assume media_url in DB is just the filename. 
                // If it includes path, we might need to adjust, but assuming strict move:
                const rarityFolder = border.rarity ? border.rarity.toLowerCase() : 'common';
                const fileName = border.media_url.split('/').pop(); // Ensure we just have filename
                const path = `${rarityFolder}/${fileName}`;

                const { data: publicUrlData } = db.public.storage
                    .from('border-skins')
                    .getPublicUrl(path);

                border.media_url = publicUrlData.publicUrl;
                console.log('Generated Public URL:', border.media_url);
            }

            // 3. Award the border to the user
            const { error: insertError } = await db.gamification
                .from('User_owned_border')
                .insert({
                    user_id: user.id,
                    border_id: border.id,
                });

            if (insertError) {
                // Check for unique key violation (Postgres code 23505)
                if (insertError.code === '23505') {
                    console.log('Duplicate border! Awarding 500 coins instead.');

                    // Award 500 coins using require to avoid circular deps if any, or just import
                    const { useUserStore } = require('~/stores/UserStore');
                    await useUserStore.getState().addPlantCoins(500);

                    // Mark as duplicate so UI knows
                    setIsDuplicate(true);
                } else {
                    console.warn('Error awarding border:', insertError);
                }
            } else {
                console.log('Border awarded to user successfully');
                setIsDuplicate(false);
            }

            return border;
        } catch (err) {
            console.error('Error in lootbox flow:', err);
            return null;
        }
    };

    return (
        <View style={styles.container}>
            {/* White Card Container - "Big Card" */}
            <View style={styles.cardContainer}>

                {/* Content Area */}
                <View style={styles.contentContainer}>
                    {!showReward ? (
                        // State 1: Opening
                        <View style={styles.stateContainer}>
                            <Image
                                source={require('../../../../assets/animations/opening lootbox.gif')}
                                style={styles.gifStyle}
                                contentFit="contain"
                            />
                            <Text style={styles.stateText}>Opening...</Text>
                        </View>
                    ) : (
                        // State 2: Reward Reveal
                        <View style={styles.stateContainer}>
                            <View style={styles.rewardWrapper}>

                                {isDuplicate ? (
                                    <Image
                                        source={require('../../../../assets/images/plantupcoin.png')}
                                        style={styles.rewardImageOverlay}
                                        contentFit="contain"
                                    />
                                ) : (
                                    rewardItem?.media_url && (
                                        <Image
                                            source={{ uri: rewardItem.media_url }}
                                            style={styles.rewardImageOverlay}
                                            contentFit="contain"
                                        />
                                    )
                                )}
                            </View>

                            {isDuplicate ? (
                                <>
                                    <Text style={styles.stateText}>Duplicate!</Text>
                                    <Text style={styles.coinText}>+500 Plant Coins</Text>
                                </>
                            ) : (
                                <>
                                    <Text style={styles.stateText}>New Item:</Text>
                                    <Text style={styles.itemNameText}>{rewardItem?.name || itemName}</Text>
                                </>
                            )}
                        </View>
                    )}
                </View>

                {/* Close/Action Button */}
                {showReward && (
                    <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
                        <Text style={styles.closeButtonText}>Collect</Text>
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create((theme) => ({
    container: {
        flex: 1,
        // Using a semi-transparent background to simulate the modal look over the previous screen
        // BUT since it's a screen, if we use 'transparentModal' in navigation, this works perfectly.
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    cardContainer: {
        width: SCREEN_WIDTH * 0.85,
        maxWidth: 800,
        backgroundColor: theme.colors.background || '#fff',
        borderRadius: 30,
        paddingVertical: 50,
        paddingHorizontal: 30,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 15,
    },
    contentContainer: {
        width: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 30,
    },
    stateContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
    },

    gifStyle: {
        width: 200,
        height: 200,
    },
    rewardWrapper: {
        position: 'relative',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
    },
    rewardImageOverlay: {
        width: 200,
        height: 200,
    },
    stateText: {
        fontSize: 22,
        fontWeight: 'bold',
        color: theme.colors.text || '#000',
        textAlign: 'center',
        marginBottom: 5,
    },
    itemNameText: {
        fontSize: 26,
        fontWeight: '900',
        color: theme.colors.primary || '#4CAF50',
        textAlign: 'center',
    },
    coinText: {
        fontSize: 24,
        fontWeight: '900',
        color: '#FFD700', // Gold color for coins
        textAlign: 'center',
        textShadowColor: 'rgba(0, 0, 0, 0.1)',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 2,
    },
    closeButton: {
        backgroundColor: theme.colors.primary || '#000',
        paddingVertical: 15,
        paddingHorizontal: 60,
        borderRadius: 40,
        marginTop: 10,
        elevation: 5,
    },
    closeButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
}));
