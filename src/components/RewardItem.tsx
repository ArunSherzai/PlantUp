import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';

type RewardItemProps = {
    title: string;
    description: string;
    isUnlocked: boolean;
};

export default function RewardItem({ title, description, isUnlocked }: RewardItemProps) {
    return (
        <View style={[styles.container, !isUnlocked && styles.lockedContainer]}>
            <View style={styles.iconContainer}>
                <LinearGradient
                    colors={isUnlocked ? ['#4CAF50', '#81C784'] : ['#BDBDBD', '#E0E0E0']}
                    style={styles.iconBg}
                >
                    <FontAwesome6 name={isUnlocked ? "gift" : "lock"} size={20} color="white" />
                </LinearGradient>
            </View>
            <View style={styles.textContainer}>
                <Text style={styles.title}>{title}</Text>
                <Text style={styles.description} numberOfLines={2}>{description}</Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 12,
        marginBottom: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
        marginRight: 10,
        width: 200, // Fixed width for horizontal scroll
    },
    lockedContainer: {
        opacity: 0.7,
    },
    iconContainer: {
        marginRight: 12,
    },
    iconBg: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    textContainer: {
        flex: 1,
    },
    title: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 2,
    },
    description: {
        fontSize: 11,
        color: '#757575',
    },
});
