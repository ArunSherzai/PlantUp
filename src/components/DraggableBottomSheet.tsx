import React, { useEffect } from 'react';
import { View, Dimensions } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

type BottomSheetProps = {
  children?: React.ReactNode;
  initialHeight?: number; // Z.B. 0.55 (55% des Screens)
  maxHeight?: number;     // Z.B. 0.90 (90% des Screens)
};

export default function DraggableBottomSheet({
  children,
  initialHeight = 0.55,
  maxHeight = 0.9,
}: BottomSheetProps) {
  const { theme } = useUnistyles();
  // BERECHNUNG DER GRENZEN (Prozentual)
  const START_Y = -SCREEN_HEIGHT * initialHeight;
  const MAX_Y = -SCREEN_HEIGHT * maxHeight;

  const translateY = useSharedValue(START_Y);
  const context = useSharedValue({ y: 0 });

  useEffect(() => {
    translateY.value = withSpring(START_Y, { damping: 50 });
  }, [initialHeight, START_Y]);

  const gesture = Gesture.Pan()
    .onStart(() => {
      context.value = { y: translateY.value };
    })
    .onUpdate((event) => {
      let newY = event.translationY + context.value.y;
      // Clamping: Nicht höher als MAX und nicht tiefer als START
      newY = Math.max(newY, MAX_Y);
      newY = Math.min(newY, START_Y);
      translateY.value = newY;
    })
    .onEnd(() => {
      const threshold = START_Y + (MAX_Y - START_Y) / 3;
      if (translateY.value < threshold) {
        translateY.value = withSpring(MAX_Y, { damping: 50 });
      } else {
        translateY.value = withSpring(START_Y, { damping: 50 });
      }
    });

  const rBottomSheetStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: translateY.value }],
    };
  });

  return (
    <Animated.View style={[styles.bottomSheetContainer, rBottomSheetStyle]}>
      {/* 1. Der Griff (GestureDetector) */}
      <GestureDetector gesture={gesture}>
        <View style={styles.lineWrapper}>
          <View style={styles.line} />
        </View>
      </GestureDetector>

      {/* 2. Der Inhalt (Frei für ScrollView) */}
      <View style={styles.contentContainer}>
        {children}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create((theme) => ({
  bottomSheetContainer: {
    height: SCREEN_HEIGHT,
    width: '100%',
    backgroundColor: theme.colors.surface,
    position: 'absolute',
    top: SCREEN_HEIGHT,
    borderRadius: 30,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 10,
  },
  lineWrapper: {
    width: '100%',
    height: 60, // Große Touch-Area
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  line: {
    width: 50,
    height: 5,
    backgroundColor: theme.colors.greyedOut,
    borderRadius: 3,
  },
  contentContainer: {
    flex: 1,
    marginBottom: 100,
  }
}));