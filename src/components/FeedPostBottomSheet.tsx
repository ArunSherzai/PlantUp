import React, { useEffect } from 'react';
import { View, Dimensions, Text, TouchableOpacity, StyleSheet as RNStyleSheet } from 'react-native';
import { useUnistyles, StyleSheet } from '~/lib/unistyles';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    interpolate,
    Extrapolation,
    interpolateColor,
    runOnJS,
} from 'react-native-reanimated';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// CONFIG
// CONFIG
// Expanded height: almost full screen, leaving some top margin
const EXPANDED_TOP_OFFSET = SCREEN_HEIGHT * 0.15;
const EXPANDED_TRANSLATE_Y = - (SCREEN_HEIGHT - EXPANDED_TOP_OFFSET);
// Removed fixed COLLAPSED_HEIGHT/TRANSLATE_Y in favor of dynamic measurement


type FeedPostBottomSheetProps = {
    children?: React.ReactNode;
    headerComponent: React.ReactNode;
    isVideo?: boolean;
    onExpand?: () => void;
    onCollapse?: () => void;
};

export interface FeedPostBottomSheetRef {
    expand: () => void;
    collapse: () => void;
}

const FeedPostBottomSheet = React.forwardRef<FeedPostBottomSheetRef, FeedPostBottomSheetProps>(({
    children,
    headerComponent,
    isVideo = false,
    onExpand,
    onCollapse,
}, ref) => {
    const { theme } = useUnistyles();

    const translateY = useSharedValue(0); // Start at 0 (hidden) until measured
    const headerHeight = useSharedValue(100); // Default measurement estimate
    const context = useSharedValue({ y: 0 });
    const isExpanded = useSharedValue(false);

    // Initialize position - wait for layout effectively, but we can start somewhere
    // logic moved to onLayout essentially, or we expect onLayout to trigger snap

    React.useImperativeHandle(ref, () => ({
        expand: () => {
            'worklet';
            translateY.value = withSpring(EXPANDED_TRANSLATE_Y, { damping: 50 });
            isExpanded.value = true;
            if (onExpand) runOnJS(onExpand)();
        },
        collapse: () => {
            'worklet';
            const collapsedY = -headerHeight.value;
            translateY.value = withSpring(collapsedY, { damping: 50 });
            isExpanded.value = false;
            if (onCollapse) runOnJS(onCollapse)();
        }
    }));

    const onHeaderLayout = (event: any) => {
        const { height } = event.nativeEvent.layout;
        // console.log("Header Height Measured:", height);
        if (Math.abs(headerHeight.value - height) > 1) {
            headerHeight.value = height;
            // If we are currently collapsed (not expanded), update position immediately
            if (!isExpanded.value) {
                translateY.value = withSpring(-height, { damping: 50 });
            }
        }
    };

    const gesture = Gesture.Pan()
        .onStart(() => {
            context.value = { y: translateY.value };
        })
        .onUpdate((event) => {
            let newY = event.translationY + context.value.y;
            const collapsedY = -headerHeight.value;

            // Clamping:
            // Lowest (visually highest): EXPANDED_TRANSLATE_Y
            // Highest (visually lowest): collapsedY
            newY = Math.max(newY, EXPANDED_TRANSLATE_Y);
            newY = Math.min(newY, collapsedY);
            translateY.value = newY;
        })
        .onEnd(() => {
            const collapsedY = -headerHeight.value;
            // Threshold Logic
            const range = Math.abs(EXPANDED_TRANSLATE_Y - collapsedY);
            const threshold = collapsedY - range / 4; // Trigger earlier when pulling up

            if (translateY.value < threshold) {
                // Go to Expanded
                translateY.value = withSpring(EXPANDED_TRANSLATE_Y, { damping: 50 });
                isExpanded.value = true;
                if (onExpand) runOnJS(onExpand)();
            } else {
                // Go to Collapsed
                translateY.value = withSpring(collapsedY, { damping: 50 });
                isExpanded.value = false;
                if (onCollapse) runOnJS(onCollapse)();
            }
        });

    // Background Animation
    const animatedBackgroundStyle = useAnimatedStyle(() => {
        const collapsedY = -headerHeight.value;
        const backgroundColor = interpolateColor(
            translateY.value,
            [collapsedY, EXPANDED_TRANSLATE_Y],
            [
                isVideo ? 'rgba(0,0,0,0)' : theme.colors.surface, // Start Color (Collapsed)
                theme.colors.surface // End Color (Expanded)
            ]
        );

        return {
            backgroundColor: backgroundColor,
        };
    });

    const rBottomSheetStyle = useAnimatedStyle(() => {
        return {
            transform: [{ translateY: translateY.value }],
        };
    });

    // Hides the "Scroll hint" when expanded to clean up UI
    const rScrollHintStyle = useAnimatedStyle(() => {
        const collapsedY = -headerHeight.value;
        const opacity = interpolate(
            translateY.value,
            [collapsedY, collapsedY - 50],
            [1, 0],
            Extrapolation.CLAMP
        );
        return { opacity };
    });

    return (
        <Animated.View style={[styles.bottomSheetContainer, rBottomSheetStyle]}>
            {/* Animated Background Layer */}
            <Animated.View style={[styles.absoluteFill, styles.backgroundFill, animatedBackgroundStyle]} />

            <GestureDetector gesture={gesture}>
                <View
                    style={styles.headerWrapper}
                    onLayout={onHeaderLayout}
                >
                    {headerComponent}


                </View>
            </GestureDetector>

            {/* Content Area */}
            <View style={styles.contentContainer}>
                {children}
            </View>
        </Animated.View>
    );
});

const styles = StyleSheet.create((theme) => ({
    bottomSheetContainer: {
        height: SCREEN_HEIGHT, // Height extended well below screen
        width: '100%',
        position: 'absolute',
        top: SCREEN_HEIGHT, // Starts just below visible area, translated up
        zIndex: 100,
    },
    backgroundFill: {
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        // Elevation/Shadow
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 10,

        // Note: overflow: hidden might clip shadow on iOS if they are on same view. 
        // For accurate shadow with rounded corners on iOS, usually requires separate views.
        // But let's try this for now, Android elevation works fine.
        overflow: 'hidden',
    },
    headerWrapper: {
        // paddingBottom removed to reduce height
        // Ensure gesture handler catches touches
        backgroundColor: 'transparent',
    },
    scrollHint: {
        width: '100%',
        alignItems: 'center',
        gap: 4,
        marginTop: 10,
        marginBottom: 5,
    },
    scrollHintText: {
        fontSize: 12,
    },
    contentContainer: {
        flex: 1,
        backgroundColor: theme.colors.surface, // Content always solid background
    },
    absoluteFill: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    }
}));

export default FeedPostBottomSheet;
