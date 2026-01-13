import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';

interface TypingIndicatorProps {
    userName?: string;
    visible: boolean;
}

export const TypingIndicator: React.FC<TypingIndicatorProps> = ({ userName, visible }) => {
    if (!visible) return null;

    return (
        <Animated.View
            entering={FadeInDown.duration(200)}
            exiting={FadeOutDown.duration(200)}
            style={styles.container}
        >
            <Image
                source={require('../../assets/animations/writing.gif')}
                style={styles.gif}
                resizeMode="contain"
            />
            <Text style={styles.text}>
                {userName ? `${userName} is typing...` : 'Typing...'}
            </Text>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 15,
        paddingVertical: 8,
        backgroundColor: '#F5F5F5',
        borderTopWidth: 1,
        borderTopColor: '#E0E0E0',
    },
    gif: {
        width: 24,
        height: 24,
        marginRight: 8,
    },
    text: {
        fontSize: 14,
        color: '#666',
        fontStyle: 'italic',
    },
});
