
import React from 'react';
import { Text, TextStyle, StyleProp } from 'react-native';
import MaskedView from '@react-native-masked-view/masked-view';
import { LinearGradient } from 'expo-linear-gradient';
import { useUnistyles } from 'react-native-unistyles';

interface GradientTextProps {
    text: string | number;
    style?: StyleProp<TextStyle>;
}

export default function GradientText({ text, style }: GradientTextProps) {
    const { theme } = useUnistyles();

    return (
        <MaskedView
            maskElement={
                <Text style={[style, { backgroundColor: 'transparent' }]}>
                    {text}
                </Text>
            }
        >
            <LinearGradient
                colors={theme.colors.gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            >
                <Text style={[style, { opacity: 0 }]}>
                    {text}
                </Text>
            </LinearGradient>
        </MaskedView>
    );
}
