import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { FontAwesome6 } from '@expo/vector-icons';

interface MentorBadgeProps {
    size?: 'small' | 'medium' | 'large';
    showLabel?: boolean;
}

/**
 * Badge displayed next to mentor usernames.
 * Shows a seedling icon to indicate mentor status.
 */
export default function MentorBadge({ size = 'small', showLabel = false }: MentorBadgeProps) {
    const iconSize = size === 'large' ? 16 : size === 'medium' ? 14 : 12;
    const fontSize = size === 'large' ? 12 : size === 'medium' ? 11 : 10;

    return (
        <View style={[styles.container, size === 'large' && styles.containerLarge]}>
            <FontAwesome6 name="seedling" size={iconSize} color="#4CAF50" />
            {showLabel && (
                <Text style={[styles.label, { fontSize }]}>Mentor</Text>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(76, 175, 80, 0.15)',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 10,
        marginLeft: 6,
    },
    containerLarge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    label: {
        color: '#4CAF50',
        fontWeight: '600',
        marginLeft: 4,
    },
});
