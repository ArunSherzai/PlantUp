import React, { useCallback, useImperativeHandle, forwardRef, useEffect } from 'react';
import { View, Dimensions, StyleSheet } from 'react-native';
import { useUnistyles } from 'react-native-unistyles';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, runOnJS } from 'react-native-reanimated';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

type FeedBottomSheetProps = {
    children?: React.ReactNode;
    snapPoints: string[]; // e.g. ['15%', '90%']
    initialSnapIndex?: number;
    enablePanDownToClose?: boolean;
    onClose?: () => void;
};

export type FeedBottomSheetRef = {
    snapToIndex: (index: number) => void;
    close: () => void;
};

const FeedBottomSheet = forwardRef<FeedBottomSheetRef, FeedBottomSheetProps>(({
    children,
    snapPoints,
    initialSnapIndex = 0,
    enablePanDownToClose = false,
    onClose
}, ref) => {
    const { theme } = useUnistyles();

    // Helper to convert percentage string to number (Y offset from top)
    // 15% height means the sheet TOP is at 85% of screen height (or similiar logic)
    // Actually typically snap points are "height of the sheet".
    // So '90%' means height is 0.9 * SCREEN_HEIGHT.
    // The translateY should be -height (if we start from bottom) or SCREEN_HEIGHT - height (if we start from top).
    // DraggableBottomSheet used `top: SCREEN_HEIGHT` and negative translateY.
    // Let's stick to that: Base position is just below screen. translateY moves it up.
    // Snap Point '90%' -> height = 0.9*H -> translateY = -0.9*H.

    const parseSnapPoint = (point: string) => {
        const pct = parseFloat(point.replace('%', ''));
        return -PlatformHeight * (pct / 100);
    };

    // We need SCREEN_HEIGHT to be constant-ish
    const PlatformHeight = SCREEN_HEIGHT;

    const snapValues = snapPoints.map(parseSnapPoint); // e.g. [-100, -800]
    // Values are negative. bigger height = more negative value.

    // Calculate max and min Y (clamping)
    const MAX_UP = Math.min(...snapValues); // Highest point (most negative)
    const MAX_DOWN = enablePanDownToClose ? 0 : Math.max(...snapValues); // Lowest point (least negative)

    const translateY = useSharedValue(0);
    const context = useSharedValue({ y: 0 });

    const scrollTo = useCallback((destination: number) => {
        'worklet';
        translateY.value = withSpring(destination, { damping: 50 });
    }, []);

    useImperativeHandle(ref, () => ({
        snapToIndex: (index: number) => {
            if (index >= 0 && index < snapValues.length) {
                scrollTo(snapValues[index]);
            }
        },
        close: () => {
            scrollTo(0);
            if (onClose) runOnJS(onClose)();
        }
    }));

    useEffect(() => {
        if (initialSnapIndex >= 0 && initialSnapIndex < snapValues.length) {
            scrollTo(snapValues[initialSnapIndex]);
        } else if (initialSnapIndex === -1) {
            // Start closed
            translateY.value = 0;
        }
    }, [initialSnapIndex]); // Run once on mount mostly

    const gesture = Gesture.Pan()
        .onStart(() => {
            context.value = { y: translateY.value };
        })
        .onUpdate((event) => {
            let newY = event.translationY + context.value.y;
            // Resistance handling could go here
            if (!enablePanDownToClose && newY > MAX_DOWN) {
                newY = MAX_DOWN + (newY - MAX_DOWN) * 0.5;
            }
            // Don't drag past max up
            if (newY < MAX_UP) {
                newY = MAX_UP + (newY - MAX_UP) * 0.5;
            }
            translateY.value = newY;
        })
        .onEnd(() => {
            // Find closest snap point
            // If enablePanDownToClose is true, 0 is also a candidate
            let candidates = [...snapValues];
            if (enablePanDownToClose) candidates.push(0);

            let closest = candidates[0];
            let minDiff = Math.abs(translateY.value - closest);

            for (let i = 1; i < candidates.length; i++) {
                const diff = Math.abs(translateY.value - candidates[i]);
                if (diff < minDiff) {
                    minDiff = diff;
                    closest = candidates[i];
                }
            }

            // Snap to closest
            scrollTo(closest);

            if (closest === 0 && enablePanDownToClose && onClose) {
                runOnJS(onClose)();
            }
        });

    const rBottomSheetStyle = useAnimatedStyle(() => {
        return {
            transform: [{ translateY: translateY.value }],
        };
    });

    return (
        <Animated.View style={[styles.bottomSheetContainer, { backgroundColor: theme.colors.surface }, rBottomSheetStyle]}>
            <GestureDetector gesture={gesture}>
                <View style={styles.lineWrapper}>
                    <View style={[styles.line, { backgroundColor: theme.colors.greyedOut }]} />
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
        height: SCREEN_HEIGHT,
        width: '100%',
        position: 'absolute',
        top: SCREEN_HEIGHT,
        borderTopLeftRadius: 25,
        borderTopRightRadius: 25,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 5,
        elevation: 10,
        zIndex: 1000,
    },
    lineWrapper: {
        width: '100%',
        height: 30,
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

export default FeedBottomSheet;
