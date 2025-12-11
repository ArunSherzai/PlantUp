import React from 'react';
import { TouchableOpacity, Image, StyleSheet } from 'react-native';
import { usePlantTipSystem } from '../hooks/usePlantTipSystem';
import TipNotification from './TipNotification';

export default function SpriteComponent() {
    const { triggerManualTip, activeTip, dismissTip } = usePlantTipSystem();

    return (
        <>
            <TipNotification tip={activeTip} onClose={dismissTip} />

        </>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        bottom: 120, // Above tab bar
        right: 20,
        width: 80,
        height: 80,
        zIndex: 1000,
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    sprite: {
        width: '100%',
        height: '100%',
    },
});
