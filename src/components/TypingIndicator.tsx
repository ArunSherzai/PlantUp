import React from 'react';
import { View, StyleSheet, Image, ImageSourcePropType } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

interface TypingIndicatorProps {
    avatar?: ImageSourcePropType;
    visible: boolean;
}

export const TypingIndicator: React.FC<TypingIndicatorProps> = ({ avatar, visible }) => {
    if (!visible) return null;

    return (
        <Animated.View
            entering={FadeIn.duration(200)}
            exiting={FadeOut.duration(200)}
            style={styles.container}
        >
            {avatar && (
                <Image
                    source={avatar}
                    style={styles.avatar}
                />
            )}
            <Image
                source={require('../../assets/animations/writing.gif')}
                style={styles.gif}
                resizeMode="contain"
            />
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 15,
        paddingVertical: 10,
    },
    avatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        marginRight: 8,
    },
    gif: {
        width: 36,
        height: 36,
    },
});
