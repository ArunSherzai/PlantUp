
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useUnistyles } from '~/lib/unistyles';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import { LinearGradient } from 'expo-linear-gradient';

type SensorData = {
    temperature: number | null;
    humidity: number | null;
    soil_moisture: number | null;
    light: number | null;
    electrical_conductivity: number | null;
};

type Props = {
    data: SensorData;
};

export default function SensorDisplayCard({ data }: Props) {
    const { theme } = useUnistyles();

    // Helper to determine status and percentage
    const getLightStatus = (val: number | null) => {
        const v = val || 0;
        // Assuming light is 0-100 or 0-1000? Let's assume 0-100 for percentage
        // If it's lux, we might need normalization. For now assuming 0-100 relative
        let status = 'Low';
        let label = 'Okay';
        let pct = Math.min(Math.max(v, 0), 100);

        if (v > 30) { status = 'Medium'; label = 'Good'; }
        if (v > 70) { status = 'High'; label = 'Ideal'; }

        return { status, label, pct };
    };

    const getMoistureStatus = (val: number | null) => {
        const v = val || 0;
        let status = 'Dry';
        let label = 'Water me!';
        let pct = Math.min(Math.max(v, 0), 100);

        if (v > 30) { status = 'Moist'; label = 'Good'; }
        if (v > 80) { status = 'Wet'; label = 'Too much'; }

        return { status, label, pct };
    };

    const getTempStatus = (val: number | null) => {
        const v = val || 0;
        // Celsius
        let status = `${v.toFixed(0)}°C`;
        let label = 'Okay';
        // Normalize -10 to 40 for slider? 
        // 0C = 0%, 40C = 100%
        let pct = ((v + 10) / 50) * 100;
        pct = Math.min(Math.max(pct, 0), 100);

        if (v > 18 && v < 28) label = 'Ideal';
        if (v < 10) label = 'Cold';
        if (v > 30) label = 'Hot';

        return { status, label, pct };
    };

    const light = getLightStatus(data.light);
    const moisture = getMoistureStatus(data.soil_moisture);
    const temp = getTempStatus(data.temperature);

    return (
        <View style={styles.card}>
            {/* Light */}
            <View style={styles.row}>
                <View style={styles.header}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                        <FontAwesome6 name="sun" size={14} color="#F5A623" />
                        <Text style={styles.label}>Light</Text>
                    </View>
                </View>
                <View style={styles.statusRow}>
                    <Text style={styles.valueText}>{light.status}</Text>
                    <Text style={[styles.statusLabel, { color: '#4CA771' }]}>{light.label}</Text>
                </View>
                <View style={styles.barBackground}>
                    <LinearGradient
                        colors={['#F5A623', '#F8E71C']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={[styles.barFill, { width: `${light.pct}%` }]}
                    />
                    <View style={[styles.thumb, { left: `${light.pct}%` }]} />
                </View>
            </View>

            {/* Moisture */}
            <View style={styles.row}>
                <View style={styles.header}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                        <FontAwesome6 name="droplet" size={14} color="#4A90E2" />
                        <Text style={styles.label}>Moisture</Text>
                    </View>
                </View>
                <View style={styles.statusRow}>
                    <Text style={styles.valueText}>{moisture.status}</Text>
                    <Text style={[styles.statusLabel, { color: '#4CA771' }]}>{moisture.label}</Text>
                </View>
                <View style={styles.barBackground}>
                    <LinearGradient
                        colors={['#4A90E2', '#50E3C2']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={[styles.barFill, { width: `${moisture.pct}%` }]}
                    />
                    <View style={[styles.thumb, { left: `${moisture.pct}%` }]} />
                </View>
            </View>

            {/* Temperature */}
            <View style={styles.row}>
                <View style={styles.header}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                        <FontAwesome6 name="temperature-half" size={14} color="#E05B5B" />
                        <Text style={styles.label}>Temperature</Text>
                    </View>
                </View>
                <View style={styles.statusRow}>
                    <Text style={styles.valueText}>{temp.status}</Text>
                    <Text style={[styles.statusLabel, { color: '#4CA771' }]}>{temp.label}</Text>
                </View>
                <View style={styles.barBackground}>
                    <LinearGradient
                        colors={['#4CA771', '#81FBB8']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={[styles.barFill, { width: `${temp.pct}%` }]}
                    />
                    <View style={[styles.thumb, { left: `${temp.pct}%` }]} />
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 20,
        width: '100%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 3,
        gap: 20,
    },
    row: {
        gap: 8,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    label: {
        fontSize: 14,
        color: '#8E8E93',
        fontWeight: '500',
    },
    statusRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        marginBottom: 4,
    },
    valueText: {
        fontSize: 18,
        fontWeight: '600',
        color: '#000',
    },
    statusLabel: {
        fontSize: 14,
        fontWeight: '500',
    },
    barBackground: {
        height: 8,
        backgroundColor: '#EFEFEF',
        borderRadius: 4,
        width: '100%',
        position: 'relative', // For thumb absolute pos
        justifyContent: 'center',
    },
    barFill: {
        height: '100%',
        borderRadius: 4,
    },
    thumb: {
        position: 'absolute',
        width: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: 'white',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
        elevation: 2,
        marginLeft: -8, // Center thumb logic roughly
        top: -4,
    },
});
