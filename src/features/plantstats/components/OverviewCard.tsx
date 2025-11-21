import { View, Text } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

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

  return (
    <View style={[styles.card, { backgroundColor: theme.colors.background }]}>
      {/* LEFT SIDE */}
      <View style={styles.left}>
        <Text style={[styles.title, { color: theme.colors.text }]}>Current health</Text>

        <Text style={[styles.subtitle, { color: theme.colors.greyedOut }]}>
          {latest ? 'Based on your most recent sensor snapshot' : 'No sensor data yet'}
        </Text>

        <Text style={[styles.timestamp, { color: theme.colors.greyedOut }]}>
          Last snapshot: {formattedDate}
        </Text>
      </View>

      {/* HEALTH CIRCLE */}
      <View
        style={[
          styles.circleOuter,
          {
            borderColor: theme.colors.primary,
            backgroundColor: theme.colors.surface,
          },
        ]}>
        <View style={[styles.circleInner, { backgroundColor: theme.colors.background }]}>
          <Text style={[styles.healthValue, { color: theme.colors.text }]}>
            {health != null ? `${health}%` : '--'}
          </Text>
          <Text style={[styles.healthLabel, { color: theme.colors.greyedOut }]}>HEALTH</Text>
        </View>
      </View>
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
  },

  healthValue: {
    fontSize: 22,
    fontFamily: theme.fonts.header,
  },

  healthLabel: {
    fontSize: 10,
    marginTop: 2,
    letterSpacing: 0.7,
    fontFamily: theme.fonts.regular,
  },
}));
