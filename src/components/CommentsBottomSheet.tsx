import React, { useCallback, useImperativeHandle, forwardRef, useEffect } from 'react';
import { View, Dimensions, StyleSheet } from 'react-native';
import { useUnistyles } from 'react-native-unistyles';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, runOnJS } from 'react-native-reanimated';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

type CommentsBottomSheetProps = {
    children?: React.ReactNode;
    // We can simplify props since we know it's 0% or 100% mostly
    initialSnapIndex?: number;
    onClose?: () => void;
};

export type CommentsBottomSheetRef = {
    snapToIndex: (index: number) => void;
    close: () => void;
};

const CommentsBottomSheet = forwardRef<CommentsBottomSheetRef, CommentsBottomSheetProps>(({
    children,
    initialSnapIndex = 0,
    onClose
}, ref) => {
    const { theme } = useUnistyles();
    const sheetHeight = useSharedValue(SCREEN_HEIGHT);
    const translateY = useSharedValue(0);
    const context = useSharedValue({ y: 0 });

    const scrollTo = useCallback((destination: number) => {
        'worklet';
        translateY.value = withSpring(destination, { damping: 20, stiffness: 90 });
    }, []);

    useImperativeHandle(ref, () => ({
        snapToIndex: (index: number) => {
            // Index 0: Closed (0)
            // Index 1: Open (-sheetHeight.value)
            if (index === 0) {
                scrollTo(0);
            } else if (index === 1) {
                scrollTo(-sheetHeight.value);
            }
        },
        close: () => {
            scrollTo(0);
            if (onClose) runOnJS(onClose)();
        }
    }));

    useEffect(() => {
        // Initial Position
        if (initialSnapIndex === 1) {
            scrollTo(-sheetHeight.value);
        } else {
            scrollTo(0);
        }
    }, [initialSnapIndex]);

    const gesture = Gesture.Pan()
        .onStart(() => {
            context.value = { y: translateY.value };
        })
        .onUpdate((event) => {
            let newY = event.translationY + context.value.y;
            const h = sheetHeight.value;

            // Limit Dragging Up past -h (Over-drag resistance)
            if (newY < -h) {
                // Logarithmic resistance
                const diff = -h - newY;
                newY = -h - Math.log(diff + 1) * 10;
            }
            // Limit Dragging Down past 0 (Closing resistance/rubber band)
            if (newY > 0) {
                newY = Math.log(newY + 1) * 10;
            }

            translateY.value = newY;
        })
        .onEnd(() => {
            const currentY = translateY.value;
            const h = sheetHeight.value;
            const threshold = -h * 0.75;

            if (currentY > threshold) {
                scrollTo(0);
                if (onClose) runOnJS(onClose)();
            } else {
                scrollTo(-h);
            }
        });

    const rBottomSheetStyle = useAnimatedStyle(() => {
        return {
            transform: [{ translateY: translateY.value }],
        };
    });

    return (
        <Animated.View
            style={[styles.bottomSheetContainer, { backgroundColor: theme.colors.surface }, rBottomSheetStyle]}
            onLayout={(e) => {
                sheetHeight.value = e.nativeEvent.layout.height;
            }}
        >
            <GestureDetector gesture={gesture}>
                {/* Draggable Handle Area */}
                <View style={styles.dragHandleArea}>
                    <View style={[styles.lineWrapper]}>
                        <View style={[styles.line, { backgroundColor: theme.colors.greyedOut }]} />
                    </View>
                </View>
            </GestureDetector>
            <View style={styles.contentContainer}>
                {children}
            </View>
        </Animated.View>
    );
});

const styles = StyleSheet.create({
    bottomSheetContainer: {
        height: '100%',
        width: '100%',
        position: 'absolute',
        top: '100%', // Starts below the screen
        zIndex: 2000,
    },
    dragHandleArea: {
        width: '100%',
        paddingVertical: 10,
        alignItems: 'center',
        justifyContent: 'center',
        // Add background color here if needed to make handle area distinct
    },
    lineWrapper: {
        width: '100%',
        alignItems: 'center',
        justifyContent: 'center',
    },
    line: {
        width: 40,
        height: 4,
        borderRadius: 2,
    },
    contentContainer: {
        flex: 1,
    },
});

export default CommentsBottomSheet;
