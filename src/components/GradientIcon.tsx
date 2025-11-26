
import React from 'react';
import { View } from 'react-native';
import MaskedView from '@react-native-masked-view/masked-view';
import { LinearGradient } from 'expo-linear-gradient';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import { useUnistyles } from 'react-native-unistyles';

interface GradientIconProps {
    name: string;
    size: number;
    style?: any;
}

export default function GradientIcon({ name, size, style }: GradientIconProps) {
    const { theme } = useUnistyles();

    return (
        <MaskedView
            style={[{ width: size, height: size }, style]}
            maskElement={
                <View style={{ backgroundColor: 'transparent', justifyContent: 'center', alignItems: 'center' }}>
                    <FontAwesome6 name={name} size={size} color="black" />
                </View>
            }
        >
            <LinearGradient
                colors={theme.colors.gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ flex: 1 }}
            />
        </MaskedView>
    );
}
