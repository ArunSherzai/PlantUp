import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, TouchableWithoutFeedback, Alert } from 'react-native';
import { useUnistyles } from 'react-native-unistyles';
import { db } from '../utils/supabase';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import { useNavigation } from '@react-navigation/native';
import { usePlantTipSystem } from '../hooks/usePlantTipSystem';
import { getRandomGeneralTip } from '../utils/tipResolver';
import { saveTip } from '../utils/tipHistory';
import { useTipStore } from '../stores/TipStore';

interface DeveloperMenuProps {
    visible: boolean;
    onClose: () => void;
}

export default function DeveloperMenu({ visible, onClose }: DeveloperMenuProps) {
    const { theme } = useUnistyles();
    const navigation = useNavigation<any>();
    const { checkPlantHealth } = usePlantTipSystem();

    const onRunTestSequence = () => {
        const randomTip = getRandomGeneralTip();
        useTipStore.getState().setActiveTip(randomTip);
        saveTip(randomTip);

        setTimeout(() => {
            const plantTip = {
                message: "Your Monstera Deliciosa is looking thirsty! (Test)",
                severity: 'warning' as const
            };
            useTipStore.getState().setActiveTip(plantTip);
            saveTip(plantTip);
        }, 4000);
        onClose();
        Alert.alert("Dev", "Test tip sequence started.");
    };

    const handleScanTips = async () => {
        const found = await checkPlantHealth();
        if (!found) {
            Alert.alert("All Good!", "Your plants look happy and healthy.");
        } else {
            Alert.alert("Scan Complete", "Issues found and tips generated.");
        }
        onClose();
    };

    const handleTestLootbox = () => {
        onClose();
        navigation.navigate('Lootbox', { itemName: 'Test Box' });
    };

    return (
        <Modal
            transparent
            visible={visible}
            animationType="fade"
            onRequestClose={onClose}
        >
            <TouchableWithoutFeedback onPress={onClose}>
                <View style={styles.overlay}>
                    <TouchableWithoutFeedback>
                        <View style={styles.menuContainer}>
                            <Text style={styles.title}>Developer Tools</Text>

                            <TouchableOpacity style={styles.menuItem} onPress={onRunTestSequence}>
                                <FontAwesome6 name="vial" size={20} color="#69F0AE" style={styles.icon} />
                                <Text style={styles.menuText}>Test Tips Sequence</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.menuItem} onPress={handleTestLootbox}>
                                <FontAwesome6 name="gift" size={20} color="#E040FB" style={styles.icon} />
                                <Text style={styles.menuText}>Test Lootbox</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.menuItem} onPress={handleScanTips}>
                                <FontAwesome6 name="magnifying-glass" size={20} color="#448AFF" style={styles.icon} />
                                <Text style={styles.menuText}>Scan for Tips</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.menuItem} onPress={async () => {
                                try {
                                    const { data: { user } } = await db.public.auth.getUser();
                                    if (!user) return;
                                    
                                    const { error } = await db.gamification
                                        .from('User_quests')
                                        .update({ status: 'completed' })
                                        .eq('user_id', user.id);
                                        // Removed .eq('status', 'active') to allow resetting CLAIMED quests back to COMPLETED
                                    
                                    if (error) throw error;
                                    Alert.alert("Success", "ALL quests (active & claimed) marked as completed.");
                                    onClose();
                                } catch (e) {
                                    Alert.alert("Error", "Could not update quests.");
                                    console.log(e);
                                }
                            }}>
                                <FontAwesome6 name="check-double" size={20} color="#FFD700" style={styles.icon} />
                                <Text style={styles.menuText}>Complete All Quests</Text>
                            </TouchableOpacity>
                        </View>
                    </TouchableWithoutFeedback>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.8)', // Dim background behind modal
        justifyContent: 'center',
        alignItems: 'center',
    },
    menuContainer: {
        width: '80%',
        padding: 20,
        borderRadius: 20,
        backgroundColor: 'rgba(30, 30, 35, 0.6)', // Dark transparent background
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 10,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 20,
        textAlign: 'center',
        color: '#FFF', // White text
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.1)', // Subtle separator
    },
    icon: {
        width: 30,
        textAlign: 'center',
        marginRight: 15,
    },
    menuText: {
        fontSize: 16,
        fontWeight: '500',
        color: '#FFF', // White text
    },
});
