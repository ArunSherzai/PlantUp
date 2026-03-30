import React from 'react';
import { View, Text } from 'react-native';
import { StyleSheet } from '~/lib/unistyles';
const TimeLeft = () => {
  return (
    <View style={styles.timeleftContainer}>
      <Text style={styles.timeLeftText}> time left: 23:23:32</Text>
    </View>
  );
};

const styles = StyleSheet.create((theme) => ({
  timeleftContainer: {
    marginLeft: 13,
    paddingVertical: 5,
    height: 25,
    width: '40%',
    backgroundColor: theme.colors.accent,
    borderRadius: 13,
    justifyContent: 'center',
    alignContent: 'center',
  },
  timeLeftText: {
    color: theme.colors.textDark, // Use the text color from the theme
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
  },
}));

export default TimeLeft;
