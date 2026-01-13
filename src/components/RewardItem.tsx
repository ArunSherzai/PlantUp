import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { LinearGradient } from 'expo-linear-gradient';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';

type RewardItemProps = {
    title: string;
    description: string;
    isUnlocked: boolean;
    isClaimed?: boolean;
    onClaim?: () => void;
};

export default function RewardItem({ title, description, isUnlocked, isClaimed, onClaim }: RewardItemProps) {
    const { theme } = useUnistyles();
    // Always clickable to allow viewing details/animation or "Locked" info
    const Container = TouchableOpacity;

    return (
        <Container
            style={[styles.container, !isUnlocked && styles.lockedContainer, isClaimed && styles.claimedContainer]}
            onPress={onClaim}
            activeOpacity={0.7}
        >
            <View style={styles.iconContainer}>
                <LinearGradient
                    colors={isClaimed 
                        ? [theme.colors.secondary, theme.colors.secondary] 
                        : (isUnlocked ? ['#4CAF50', '#81C784'] : ['#BDBDBD', '#E0E0E0'])
                    }
                    style={styles.iconBg}
                >
                    <FontAwesome6 
                        name={isClaimed ? "check" : (isUnlocked ? "gift" : "lock")} 
                        size={20} 
                        color="white" 
                    />
                </LinearGradient>
            </View>
            <View style={styles.textContainer}>
                <Text style={styles.title}>{title}</Text>
                <Text style={styles.description} numberOfLines={2}>
                    {isClaimed ? "Claimed" : description}
                </Text>
            </View>
        </Container>
    );
}

const styles = StyleSheet.create((theme) => ({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.surface,
        borderRadius: 12,
        padding: 12,
        marginBottom: 10,
        shadowColor: theme.colors.text,
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
    claimedContainer: {
        opacity: 0.5,
        backgroundColor: theme.colors.greyedOut || '#eee',
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
        color: theme.colors.text,
        marginBottom: 2,
    },
    description: {
        fontSize: 11,
        color: theme.colors.typography,
    },
}));
