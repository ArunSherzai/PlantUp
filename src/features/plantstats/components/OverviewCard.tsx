import { View, Text } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { Image as ExpoImage } from 'expo-image';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, interpolateColor } from 'react-native-reanimated';
import { useEffect } from 'react';

export default function OverviewCard({ latest, health }: any) {
  const { theme } = useUnistyles();

  const formattedDate = latest
    ? new Date(latest.created_at).toLocaleString([], {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: 'short',
    })
    : '--';

  // State Logic
  const getHealthState = (h: number | null) => {
    if (h === null) return { gif: null, color: theme.colors.greyedOut, label: 'No Data' };
    if (h <= 10) return { gif: require('../../../../assets/animations/Dead_Sprig.gif'), color: '#ef4444', label: 'Critical' };
    if (h <= 39) return { gif: require('../../../../assets/animations/sad_sprig.gif'), color: '#f97316', label: 'Needs Care' };
    if (h <= 59) return { gif: require('../../../../assets/animations/impatient_sprig.gif'), color: '#eab308', label: 'Okay' };
    return { gif: require('../../../../assets/animations/cool_sprig.gif'), color: '#22c55e', label: 'Great' };
  };

  const { gif, color, label } = getHealthState(health);

  // Animation Styles
  const animatedBorder = useAnimatedStyle(() => ({
    borderColor: withTiming(color, { duration: 500 }),
  }));

  const animatedText = useAnimatedStyle(() => ({
    color: withTiming(color, { duration: 500 }),
  }));

  return (
    <View style={[styles.card, { backgroundColor: theme.colors.background }]}>
      {/* LEFT SIDE: Always Text */}
      <View style={styles.left}>
        <Text style={[styles.title, { color: theme.colors.text }]}>Current health</Text>

        <Animated.Text style={[styles.healthValueLeft, animatedText]}>
          {health != null ? `${health}%` : '--'}
        </Animated.Text>

        <Text style={[styles.subtitle, { color: theme.colors.greyedOut }]}>
          Current Status: <Animated.Text style={[{ fontWeight: 'bold' }, animatedText]}>{label}</Animated.Text>
        </Text>

        <Text style={[styles.timestamp, { color: theme.colors.greyedOut }]}>
          Last snapshot: {formattedDate}
        </Text>
      </View>

      {/* RIGHT SIDE: Always GIF Circle */}
      <Animated.View
        style={[
          styles.circleOuter,
          { backgroundColor: theme.colors.surface },
          animatedBorder,
        ]}>
        <View style={[styles.circleInner, { backgroundColor: theme.colors.background }]}>
          {gif && (
            <ExpoImage
              source={gif}
              style={styles.sprigCircle}
              contentFit="contain"
            />
          )}
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  card: {
    borderRadius: 20,
    padding: 18,
    marginBottom: 22,
    flexDirection: 'row',
    alignItems: 'center',

    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 5,
  },

  left: {
    flex: 1,
    paddingRight: 12,
  },

  title: {
    fontSize: 20,
    fontFamily: theme.fonts.header,
  },

  subtitle: {
    fontSize: 13,
    marginTop: 4,
    marginBottom: 8,
    fontFamily: theme.fonts.regular,
  },

  timestamp: {
    fontSize: 12,
    marginTop: 4,
    fontFamily: theme.fonts.regular,
  },

  /* Circle */
  circleOuter: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },

  circleInner: {
    width: 70,
    height: 70,
    borderRadius: 35,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden', // Clip GIF if needed
  },

  /* New Styles for Layout Shift */
  healthValueLeft: {
    fontSize: 32,
    fontFamily: theme.fonts.header,
    marginTop: 4,
    marginBottom: 0,
  },

  sprigCircle: {
    width: 100,
    height: 100,
    // Adjust positioning to center the sprite perfectly if needed
  },
}));
