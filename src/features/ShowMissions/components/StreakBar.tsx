import React from 'react';
import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';
const StreakBar = ({ index, totalBlocks }: any) => {
  // Calculate the position based on the provided index (in percentage)
  const getPosition = () => {
    return (index / totalBlocks) * 100; // This gives the percentage position along the row
  };

  return (
    <View
      style={[
        styles.streakBar,
        {
          left: `${getPosition()}%`, // Position the bar horizontally based on the index
          marginLeft: `-6%`, // Offset the position to center the bar in the block
        },
      ]}
    />
  );
};

const styles = StyleSheet.create({
  streakBar: {
    width: 10, // Set width of the vertical bar
    backgroundColor: 'rgba(0, 255, 94, 0.4)', // Adjust the color and opacity like the design in Line23
    position: 'absolute',
    top: 0, // Align to the top of the container
    bottom: 0, // Extend to the bottom of the container
    borderRadius: 2,
  },
});

export default StreakBar;
