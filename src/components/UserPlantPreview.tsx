import React, { useEffect } from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import PlantPotPreview from './PlantPotPreview';
import { useVirtualPlant } from '../hooks/useVirtualPlant';

type Props = {
    userId?: string; // Optional - defaults to current user
    style?: any;
};

/**
 * Renders the user's virtual plant from the database.
 * - Fetches seed and pot_type from gamification.virtual_plants
 * - Uses user's level as growth (0-100)
 * - Auto-creates plant if user doesn't have one
 */
export default function UserPlantPreview({ userId, style }: Props) {
    const { plant, growth, loading, error, createPlant } = useVirtualPlant(userId);

    // Auto-create plant if user doesn't have one
    useEffect(() => {
        if (!loading && !plant && !error) {
            createPlant();
        }
    }, [loading, plant, error, createPlant]);

    if (loading) {
        return (
            <View style={[styles.container, style]}>
                <ActivityIndicator size="large" color="#4CAF50" />
            </View>
        );
    }

    if (error) {
        return (
            <View style={[styles.container, style]}>
                <Text style={styles.errorText}>Failed to load plant</Text>
            </View>
        );
    }

    if (!plant) {
        return (
            <View style={[styles.container, style]}>
                <ActivityIndicator size="small" color="#4CAF50" />
                <Text style={styles.loadingText}>Growing your plant...</Text>
            </View>
        );
    }

    return (
        <View style={[styles.container, style]}>
            <PlantPotPreview
                seed={plant.seed}
                growth={growth}
                mode="lsystem"
                potType={plant.pot_type}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#1a1a2e',
        borderRadius: 16,
        overflow: 'hidden',
    },
    errorText: {
        color: '#ff6b6b',
        fontSize: 14,
    },
    loadingText: {
        color: '#aaa',
        fontSize: 12,
        marginTop: 8,
    },
});
