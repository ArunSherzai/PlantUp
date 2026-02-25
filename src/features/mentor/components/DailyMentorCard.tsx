// ============================================================
// Task 6 — Daily Mentor Card UI Component
// ============================================================
// Beautiful card that displays cached LLM advice for today.
// Shows headline, summary, risks, actions, and confidence.
// Includes a "Refresh" button (limited to once/day) and
// respects Layer D trigger rules.
// ============================================================

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import Feather from '@expo/vector-icons/Feather';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  FadeIn,
  FadeInDown,
} from 'react-native-reanimated';
import { vw, vh } from '~/features/plantlist/styles/plantStyles';
import {
  fetchMentorAdvice,
  shouldFetchMentor,
  hasAlreadyFetchedToday,
  MentorResponse,
} from '../api/mentorApi';
import type { HealthResult, MentorAdvice } from '../types/mentor.types';

interface Props {
  plantId: string;
  health: HealthResult | null;
}

// ---- sub-components ----

function ConfidenceBadge({ confidence }: { confidence: MentorAdvice['confidence'] }) {
  const { theme } = useUnistyles();
  const colorMap = {
    high: '#22c55e',
    medium: '#eab308',
    low: '#ef4444',
  };
  return (
    <View style={[badgeStyles.badge, { backgroundColor: colorMap[confidence] + '20', borderColor: colorMap[confidence] }]}>
      <Text style={[badgeStyles.text, { color: colorMap[confidence] }]}>
        {confidence.toUpperCase()}
      </Text>
    </View>
  );
}

const badgeStyles = {
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
  } as const,
  text: {
    fontSize: 10,
    fontWeight: '700' as const,
    letterSpacing: 0.5,
  } as const,
};

function BulletList({ items, icon, color }: { items: string[]; icon: string; color: string }) {
  const { theme } = useUnistyles();
  if (!items || items.length === 0) return null;
  return (
    <View style={{ marginTop: 8 }}>
      {items.map((item, i) => (
        <View key={i} style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 4 }}>
          <Feather name={icon as any} size={13} color={color} style={{ marginTop: 2, marginRight: 6 }} />
          <Text style={{ flex: 1, fontSize: 13, color: theme.colors.text, fontFamily: theme.fonts.regular, lineHeight: 18 }}>
            {item}
          </Text>
        </View>
      ))}
    </View>
  );
}

// ---- main component ----

export default function DailyMentorCard({ plantId, health }: Props) {
  const { theme } = useUnistyles();

  const [advice, setAdvice] = useState<MentorAdvice | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [alreadyFetched, setAlreadyFetched] = useState(false);
  const [expanded, setExpanded] = useState(false);

  // Animation
  const cardScale = useSharedValue(1);
  const animatedCard = useAnimatedStyle(() => ({
    transform: [{ scale: cardScale.value }],
  }));

  // Check if we already fetched today on mount
  useEffect(() => {
    let mounted = true;
    (async () => {
      const fetched = await hasAlreadyFetchedToday(plantId);
      if (mounted) setAlreadyFetched(fetched);
    })();
    return () => { mounted = false; };
  }, [plantId]);

  // Auto-fetch on mount if we have cached data (Layer D rules)
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        // Always try to load from local cache first (free)
        const result = await fetchMentorAdvice(plantId);
        if (mounted && result?.advice) {
          setAdvice(result.advice);
          setAlreadyFetched(true);
        }
      } catch {
        // No cache available, that's fine
      }
    })();
    return () => { mounted = false; };
  }, [plantId]);

  const handleRefresh = useCallback(async () => {
    if (loading) return;

    // Animate button press
    cardScale.value = withSpring(0.97, {}, () => {
      cardScale.value = withSpring(1);
    });

    setLoading(true);
    setError(null);

    try {
      const result = await fetchMentorAdvice(plantId);
      setAdvice(result.advice);
      setAlreadyFetched(true);
    } catch (err: any) {
      setError(err.message || 'Failed to load advice');
    } finally {
      setLoading(false);
    }
  }, [plantId, loading]);

  // Determine if the button should show "Ask Mentor" or "Already asked"
  const canRefresh = !alreadyFetched || shouldFetchMentor(health, false);

  return (
    <Animated.View
      entering={FadeInDown.duration(400).delay(200)}
      style={[animatedCard]}
    >
      <View style={[styles.card, { backgroundColor: theme.colors.background }]}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={[styles.iconCircle, { backgroundColor: theme.colors.primary + '20' }]}>
              <Feather name="cpu" size={18} color={theme.colors.primary} />
            </View>
            <View>
              <Text style={[styles.title, { color: theme.colors.text }]}>
                Daily Mentor
              </Text>
              <Text style={[styles.subtitle, { color: theme.colors.greyedOut }]}>
                AI-powered plant insights
              </Text>
            </View>
          </View>

          {advice?.confidence && <ConfidenceBadge confidence={advice.confidence} />}
        </View>

        {/* Content */}
        {advice ? (
          <View>
            {/* Headline */}
            <Text style={[styles.headline, { color: theme.colors.text }]}>
              {advice.headline}
            </Text>

            {/* Summary */}
            <Text style={[styles.summary, { color: theme.colors.greyedOut }]}>
              {advice.summary}
            </Text>

            {/* Expandable sections */}
            <TouchableOpacity
              onPress={() => setExpanded(!expanded)}
              style={styles.expandButton}
              activeOpacity={0.7}
            >
              <Text style={[styles.expandText, { color: theme.colors.primary }]}>
                {expanded ? 'Show less' : 'Show details'}
              </Text>
              <Feather
                name={expanded ? 'chevron-up' : 'chevron-down'}
                size={14}
                color={theme.colors.primary}
              />
            </TouchableOpacity>

            {expanded && (
              <Animated.View entering={FadeIn.duration(250)}>
                {advice.risks.length > 0 && (
                  <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: '#ef4444' }]}>⚠️ Risks</Text>
                    <BulletList items={advice.risks} icon="alert-triangle" color="#ef4444" />
                  </View>
                )}

                {advice.next_actions.length > 0 && (
                  <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: '#22c55e' }]}>✅ Next Actions</Text>
                    <BulletList items={advice.next_actions} icon="check-circle" color="#22c55e" />
                  </View>
                )}

                {advice.watch_out_for.length > 0 && (
                  <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: '#eab308' }]}>👀 Watch Out For</Text>
                    <BulletList items={advice.watch_out_for} icon="eye" color="#eab308" />
                  </View>
                )}
              </Animated.View>
            )}
          </View>
        ) : (
          <View style={styles.emptyState}>
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={theme.colors.primary} />
                <Text style={[styles.loadingText, { color: theme.colors.greyedOut }]}>
                  Consulting your mentor...
                </Text>
              </View>
            ) : (
              <View style={styles.askContainer}>
                <Feather name="message-circle" size={28} color={theme.colors.greyedOut} />
                <Text style={[styles.emptyText, { color: theme.colors.greyedOut }]}>
                  Tap below to get today's advice
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Error */}
        {error && (
          <Text style={styles.errorText}>
            {error}
          </Text>
        )}

        {/* Action Button */}
        <TouchableOpacity
          onPress={handleRefresh}
          disabled={loading || (alreadyFetched && !canRefresh)}
          style={[
            styles.actionButton,
            {
              backgroundColor: loading || (alreadyFetched && !canRefresh)
                ? theme.colors.greyedOut + '30'
                : theme.colors.primary,
            },
          ]}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <View style={styles.buttonContent}>
              <Feather
                name={advice ? 'refresh-cw' : 'zap'}
                size={14}
                color={alreadyFetched && !canRefresh ? theme.colors.greyedOut : 'white'}
              />
              <Text
                style={[
                  styles.buttonText,
                  {
                    color: alreadyFetched && !canRefresh ? theme.colors.greyedOut : 'white',
                  },
                ]}
              >
                {alreadyFetched && !canRefresh
                  ? 'Already asked today'
                  : advice
                    ? 'Refresh advice'
                    : 'Ask Mentor'}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

// ---- styles ----

const styles = StyleSheet.create((theme) => ({
  card: {
    borderRadius: 20,
    padding: 18,
    marginBottom: 22,

    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 5,
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },

  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },

  title: {
    fontSize: 16,
    fontFamily: theme.fonts.header,
  },

  subtitle: {
    fontSize: 11,
    fontFamily: theme.fonts.regular,
    marginTop: 1,
  },

  headline: {
    fontSize: 16,
    fontFamily: theme.fonts.header,
    marginBottom: 6,
    lineHeight: 22,
  },

  summary: {
    fontSize: 13,
    fontFamily: theme.fonts.regular,
    lineHeight: 19,
    marginBottom: 8,
  },

  expandButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
  },

  expandText: {
    fontSize: 13,
    fontFamily: theme.fonts.header,
  },

  section: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: theme.colors.greyedOut + '20',
  },

  sectionTitle: {
    fontSize: 13,
    fontFamily: theme.fonts.header,
    marginBottom: 4,
  },

  emptyState: {
    paddingVertical: 20,
    alignItems: 'center',
  },

  loadingContainer: {
    alignItems: 'center',
    gap: 10,
  },

  loadingText: {
    fontSize: 13,
    fontFamily: theme.fonts.regular,
  },

  askContainer: {
    alignItems: 'center',
    gap: 8,
  },

  emptyText: {
    fontSize: 13,
    fontFamily: theme.fonts.regular,
    textAlign: 'center',
  },

  errorText: {
    color: '#ef4444',
    fontSize: 12,
    fontFamily: theme.fonts.regular,
    textAlign: 'center',
    marginTop: 8,
  },

  actionButton: {
    marginTop: 14,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },

  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  buttonText: {
    fontSize: 14,
    fontFamily: theme.fonts.header,
  },
}));
