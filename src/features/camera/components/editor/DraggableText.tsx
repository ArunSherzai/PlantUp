import React, { useRef } from 'react';
import { Text, PanResponder, Animated } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';
import type { TextOverlay } from '../../types';

type Props = {
  overlay: TextOverlay;
  onPositionChange: (id: string, x: number, y: number) => void;
};

/**
 * A text element that can be dragged around on the image preview.
 * Uses PanResponder for touch-based drag.
 */
export default function DraggableText({ overlay, onPositionChange }: Props) {
  const pan = useRef(new Animated.ValueXY({ x: overlay.x, y: overlay.y })).current;
  const lastOffset = useRef({ x: overlay.x, y: overlay.y });

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        // Set the offset to current position when drag starts
        pan.setOffset({
          x: lastOffset.current.x,
          y: lastOffset.current.y,
        });
        pan.setValue({ x: 0, y: 0 });
      },
      onPanResponderMove: Animated.event(
        [null, { dx: pan.x, dy: pan.y }],
        { useNativeDriver: false }
      ),
      onPanResponderRelease: (_, gestureState) => {
        // Flatten the offset + value into the offset
        const newX = lastOffset.current.x + gestureState.dx;
        const newY = lastOffset.current.y + gestureState.dy;
        lastOffset.current = { x: newX, y: newY };
        pan.flattenOffset();
        // Report the new position back to the editor
        onPositionChange(overlay.id, newX, newY);
      },
    })
  ).current;

  return (
    <Animated.View
      {...panResponder.panHandlers}
      style={[
        styles.draggableContainer,
        {
          transform: [
            { translateX: pan.x },
            { translateY: pan.y },
          ],
        },
      ]}
    >
      <Text
        style={[
          styles.draggableText,
          {
            fontSize: overlay.fontSize,
            color: overlay.color,
            fontWeight: overlay.fontWeight,
          },
        ]}
      >
        {overlay.text}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  draggableContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 10,
  },
  draggableText: {
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 4,
    padding: 4,
  },
});
