import React, { useEffect } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

type BottomSheetProps = {
  children?: React.ReactNode;
  initialHeight?: number; // Z.B. 0.55 für 55% des Screens
  maxHeight?: number; // Z.B. 0.90 für 90% des Screens
};

export default function DraggableBottomSheet({
  children,
  initialHeight = 0.55, // Standardwert: 55%
  maxHeight = 0.9, // Standardwert: 90%
}: BottomSheetProps) {
  // BERECHNUNG DER GRENZEN
  // Wir rechnen in negativen Werten, da wir von unten (SCREEN_HEIGHT) nach oben ziehen.
  // -SCREEN_HEIGHT * 0.55 bedeutet: Das Sheet schiebt sich 55% nach oben.
  const START_Y = -SCREEN_HEIGHT * initialHeight;
  const MAX_Y = -SCREEN_HEIGHT * maxHeight;

  const translateY = useSharedValue(START_Y);
  const context = useSharedValue({ y: 0 });

  // Beim Start (oder wenn sich die Props ändern) zur Startposition fahren
  useEffect(() => {
    translateY.value = withSpring(START_Y, { damping: 50 });
  }, [initialHeight, START_Y]);

  const gesture = Gesture.Pan()
    .onStart(() => {
      context.value = { y: translateY.value };
    })
    .onUpdate((event) => {
      let newY = event.translationY + context.value.y;

      // --- CLAMPING (GRENZEN SETZEN) ---
      // 1. Obergrenze (MAX_Y): Nicht höher als erlaubt
      // (Da wir im Minus sind: Math.max nimmt die "größere" Zahl, also die, die näher an 0 ist, wenn wir positive Logik hätten.
      // Aber hier: -800 (Max) ist kleiner als -400 (Start). Wir wollen nicht kleiner als -800 werden.)
      // Korrektur Logik im Minusbereich:
      // newY darf nicht kleiner sein als MAX_Y (z.B. -800). -> Math.max? Nein.
      // Beispiel: newY ist -900 (zu hoch). MAX_Y ist -800. Wir wollen -800. -> Math.max(-900, -800) = -800. RICHTIG.
      newY = Math.max(newY, MAX_Y);

      // 2. Untergrenze (START_Y): Nicht tiefer als Start
      // Beispiel: newY ist -200 (zu tief). START_Y ist -400. Wir wollen -400. -> Math.min(-200, -400) = -400. RICHTIG.
      newY = Math.min(newY, START_Y);

      translateY.value = newY;
    })
    .onEnd(() => {
      // SNAP LOGIK
      // Wenn wir mehr als die Hälfte der Strecke zum Maximum geschafft haben...
      // Wir berechnen den Mittelpunkt zwischen Start und Max
      const threshold = START_Y + (MAX_Y - START_Y) / 3; // Bei 1/3 Zugstrecke snappen wir schon hoch (fühlt sich snappier an)

      if (translateY.value < threshold) {
        // ...schnapp ganz nach oben
        translateY.value = withSpring(MAX_Y, { damping: 50 });
      } else {
        // ...sonst geh zurück zum Start
        translateY.value = withSpring(START_Y, { damping: 50 });
      }
    });

  const rBottomSheetStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: translateY.value }],
    };
  });

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={[styles.bottomSheetContainer, rBottomSheetStyle]}>
        <View style={styles.lineWrapper}>
          <View style={styles.line} />
        </View>
        <View style={styles.contentContainer}>{children}</View>
      </Animated.View>
    </GestureDetector>
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 10,
  },
  lineWrapper: {
    width: '100%',
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  line: {
    width: 50,
    height: 5,
    backgroundColor: '#ccc',
    borderRadius: 3,
  },
  contentContainer: {
    flex: 1,
  },
});
