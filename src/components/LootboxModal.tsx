import React, { useState, useEffect } from 'react';
import { View, Text, Modal, TouchableOpacity, Dimensions, Image } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

type LootboxModalProps = {
    visible: boolean;
    onClose: () => void;
    itemName?: string;
};

export default function LootboxModal({ visible, onClose, itemName = 'ItemName' }: LootboxModalProps) {
    const { theme } = useUnistyles();
    const [showReward, setShowReward] = useState(false);

    useEffect(() => {
        if (visible) {
            setShowReward(false);
            // After 3 seconds (approx length of opening gif), transition to reward screen
            const timer = setTimeout(() => {
                setShowReward(true);
            }, 3000);

            return () => clearTimeout(timer);
        }
    }, [visible]);

    const handleClose = () => {
        setShowReward(false);
        onClose();
    };

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="fade"
            onRequestClose={handleClose}>
            <View style={styles.modalOverlay}>
                {/* White Card Container */}
                <View style={styles.cardContainer}>

                    {/* Content Area */}
                    <View style={styles.contentContainer}>
                        {!showReward ? (
                            // State 1: Opening
                            <View style={styles.stateContainer}>
                                <Image
                                    source={require('../../assets/animations/opening lootbox.gif')}
                                    style={styles.gifStyle}
                                    resizeMode="contain"
                                />
                                <Text style={styles.stateText}>Opening...</Text>
                            </View>
                        ) : (
                            // State 2: Reward Reveal
                            <View style={styles.stateContainer}>
                                <Image
                                    source={require('../../assets/animations/gettingitem.gif')}
                                    style={styles.gifStyle}
                                    resizeMode="contain"
                                />
                                <Text style={styles.stateText}>new Item: {itemName}</Text>
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
        </Modal>
    );
}

const styles = StyleSheet.create((theme) => ({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    cardContainer: {
        width: '85%',
        maxWidth: 340,
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 30,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 10,
    },
    contentContainer: {
        width: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
    },
    stateContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
    },
    gifStyle: {
        width: 180,
        height: 180,
        marginBottom: 20,
    },
    stateText: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#000',
        textAlign: 'center',
    },
    closeButton: {
        backgroundColor: '#000',
        paddingVertical: 12,
        paddingHorizontal: 40,
        borderRadius: 30,
        marginTop: 10,
    },
    closeButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
}));
