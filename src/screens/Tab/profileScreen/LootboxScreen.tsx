import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Dimensions, Image } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../../../navigation/Root';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type LootboxScreenRouteProp = RouteProp<RootStackParamList, 'Lootbox'>;

export default function LootboxScreen() {
    const { theme } = useUnistyles();
    const navigation = useNavigation();
    const route = useRoute<LootboxScreenRouteProp>();
    // Default to 'Rare Plant' if param is missing (though typings say optional in plan, let's be safe)
    const itemName = route.params?.itemName || 'Rare Plant';

    const [showReward, setShowReward] = useState(false);

    useEffect(() => {
        setShowReward(false);
        // After 3 seconds (approx length of opening gif), transition to reward screen
        const timer = setTimeout(() => {
            setShowReward(true);
        }, 3000);

        return () => clearTimeout(timer);
    }, []);

    const handleClose = () => {
        navigation.goBack();
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
                                resizeMode="contain"
                            />
                            <Text style={styles.stateText}>Opening...</Text>
                        </View>
                    ) : (
                        // State 2: Reward Reveal
                        <View style={styles.stateContainer}>
                            <Image
                                source={require('../../../../assets/animations/gettingitem.gif')}
                                style={styles.gifStyle}
                                resizeMode="contain"
                            />
                            <Text style={styles.stateText}>New Item:</Text>
                            <Text style={styles.itemNameText}>{itemName}</Text>
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
        maxWidth: 400,
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
        marginBottom: 20,
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
