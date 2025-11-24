import React, { useEffect } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

type BottomSheetProps = {
  children?: React.ReactNode;
  initialHeight?: number;
  maxHeight?: number; 
  topInset?: number; // Falls du das noch nutzt
};

export default function DraggableBottomSheet({ 
  children, 
  initialHeight = 0.55, 
  maxHeight = 0.9 
}: BottomSheetProps) {

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
    // 1. Der Animated.View ist jetzt GANZ AUSSEN (nicht mehr im GestureDetector)
    <Animated.View style={[styles.bottomSheetContainer, rBottomSheetStyle]}>
      
      {/* 2. Der GestureDetector umschließt NUR den Griff (lineWrapper) */}
      <GestureDetector gesture={gesture}>
        {/* Wir geben dem Wrapper backgroundColor transparent, damit er Events fängt */}
        <View style={styles.lineWrapper}>
          <View style={styles.line} />
        </View>
      </GestureDetector>
      
      {/* 3. Der Inhalt liegt AUSSERHALB des GestureDetectors */}
      {/* Jetzt kann die ScrollView hier drin ungestört arbeiten */}
      <View style={styles.contentContainer}>
        {children}
      </View>

    </Animated.View>
  );
}

const styles = StyleSheet.create({
  bottomSheetContainer: {
    height: SCREEN_HEIGHT,
    width: '100%',
    backgroundColor: '#F2F2F2',
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
    height: 60, // Ich habe es vergrößert (von 40 auf 60), damit man es leichter trifft!
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent', // Wichtig: Damit man "durchklicken" kann zum GestureDetector
  },
  line: {
    width: 50,
    height: 5,
    backgroundColor: '#ccc',
    borderRadius: 3,
  },
  contentContainer: {
    flex: 1,
  }
});