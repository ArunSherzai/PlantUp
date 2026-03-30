import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Feather from '@expo/vector-icons/Feather';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useUnistyles } from '~/lib/unistyles';
import {
  AppDialogRequest,
  AppDialogVariant,
  registerAppDialogHost,
} from '~/services/appDialog';

type QueueItem = {
  id: number;
  request: AppDialogRequest;
  resolve: (value: string | undefined) => void;
};

const ICON_BY_VARIANT: Record<AppDialogVariant, keyof typeof Feather.glyphMap> = {
  info: 'info',
  success: 'check',
  warning: 'alert-triangle',
  error: 'x',
};

export default function AppDialogHost() {
  const { theme } = useUnistyles();
  const insets = useSafeAreaInsets();
  const { width, height, fontScale } = useWindowDimensions();
  const [current, setCurrent] = useState<QueueItem | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const queueRef = useRef<QueueItem[]>([]);
  const currentRef = useRef<QueueItem | null>(null);
  const nextIdRef = useRef(1);
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(18)).current;
  const scale = useRef(new Animated.Value(0.96)).current;

  const showNext = useCallback(() => {
    if (currentRef.current || queueRef.current.length === 0) {
      return;
    }

    const next = queueRef.current.shift() ?? null;
    currentRef.current = next;
    setCurrent(next);
  }, []);

  const animateIn = useCallback(() => {
    opacity.setValue(0);
    translateY.setValue(18);
    scale.setValue(0.96);

    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 220,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 260,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 1,
        duration: 260,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [opacity, scale, translateY]);

  const finishAndAdvance = useCallback(
    (result: string | undefined, buttonIndex?: number) => {
      const active = currentRef.current;
      if (!active) {
        return;
      }

      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 0,
          duration: 180,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: active.request.presentation === 'sheet' ? 18 : 12,
          duration: 180,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 0.98,
          duration: 180,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
      ]).start(() => {
        const completed = currentRef.current;
        currentRef.current = null;
        setCurrent(null);
        completed?.resolve(result);

        if (completed && buttonIndex !== undefined) {
          const button = completed.request.buttons[buttonIndex];
          if (button?.onPress) {
            Promise.resolve(button.onPress()).catch((error) => {
              console.error('[AppDialog] Button action failed:', error);
            });
          }
        }

        showNext();
      });
    },
    [opacity, scale, showNext, translateY]
  );

  useEffect(() => {
    if (current) {
      animateIn();
    }
  }, [animateIn, current]);

  useEffect(() => {
    const present = (request: AppDialogRequest) =>
      new Promise<string | undefined>((resolve) => {
        queueRef.current.push({
          id: nextIdRef.current++,
          request,
          resolve,
        });
        showNext();
      });

    registerAppDialogHost(present);
    setIsMounted(true);

    return () => {
      registerAppDialogHost(null);
      queueRef.current.splice(0).forEach((entry) => entry.resolve(undefined));
      if (currentRef.current) {
        currentRef.current.resolve(undefined);
        currentRef.current = null;
      }
      setIsMounted(false);
    };
  }, [showNext]);

  const variant = current?.request.variant ?? 'info';
  const isSheet = current?.request.presentation === 'sheet';
  const showBackdropDismiss = current?.request.dismissible ?? false;
  const buttonCount = current?.request.buttons.length ?? 0;
  const shouldStackButtons =
    isSheet || buttonCount !== 2 || width < 360 || fontScale > 1.15;
  const horizontalInset = Math.max(16, Math.min(24, width * 0.05));
  const dialogWidth = Math.min(width - horizontalInset * 2, 420);
  const sheetMaxWidth = Math.min(width, 520);
  const maxMessageHeight = Math.min(Math.max(height * 0.22, 120), 260);

  const containerStyle = useMemo(
    () => [
      styles.card,
      isSheet ? styles.sheetCard : styles.dialogCard,
      {
        width: isSheet ? sheetMaxWidth : dialogWidth,
        maxHeight: isSheet ? height - Math.max(insets.top, 24) - 12 : height - (insets.top + insets.bottom + 48),
      },
      {
        backgroundColor: theme.colors.surface,
        paddingBottom: isSheet ? Math.max(insets.bottom, 16) + 12 : 26,
      },
      {
        transform: [{ translateY }, { scale }],
      },
    ],
    [dialogWidth, height, insets.bottom, insets.top, isSheet, scale, sheetMaxWidth, theme.colors.surface, translateY]
  );

  if (!isMounted || !current) {
    return null;
  }

  return (
    <View
      pointerEvents="box-none"
      style={styles.overlay}>
      <Animated.View style={[styles.backdrop, { opacity }]}>
        <Pressable
          style={styles.backdropPressable}
          onPress={() => {
            if (showBackdropDismiss) {
              finishAndAdvance(undefined);
            }
          }}
        />
      </Animated.View>

      <View
        pointerEvents="box-none"
        style={[
          styles.foregroundLayer,
          isSheet ? styles.foregroundBottom : styles.foregroundCentered,
          !isSheet && {
            paddingTop: Math.max(insets.top, 24),
            paddingBottom: Math.max(insets.bottom, 24),
            paddingHorizontal: horizontalInset,
          },
        ]}>
        <Animated.View
          style={[
            containerStyle,
            {
              borderWidth: 1,
              borderColor: `${theme.colors.greyedOut}55`,
            },
          ]}>
          <LinearGradient
            colors={[theme.colors.primary, theme.colors.secondary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroStrip}
          />

          <View style={styles.contentWrap}>
            {isSheet && <View style={[styles.handle, { backgroundColor: theme.colors.greyedOut }]} />}

            <View
              style={[
                styles.iconBadge,
                {
                  backgroundColor:
                    variant === 'error'
                      ? 'rgba(226, 89, 89, 0.14)'
                      : variant === 'warning'
                        ? 'rgba(226, 170, 46, 0.16)'
                        : 'rgba(79, 218, 116, 0.14)',
                },
              ]}>
              <Feather
                name={ICON_BY_VARIANT[variant]}
                size={20}
                color={
                  variant === 'error'
                    ? '#D64545'
                    : variant === 'warning'
                      ? '#C78412'
                      : theme.colors.primary
                }
              />
            </View>

            <Text style={[styles.title, { color: theme.colors.text }]}>{current.request.title}</Text>

            {!!current.request.message && (
              <ScrollView
                style={[styles.messageScroll, { maxHeight: maxMessageHeight }]}
                contentContainerStyle={styles.messageScrollContent}
                showsVerticalScrollIndicator={false}>
                <Text allowFontScaling style={[styles.message, { color: theme.colors.typography }]}>
                  {current.request.message}
                </Text>
              </ScrollView>
            )}

            <View
              style={[
                styles.buttonWrap,
                !shouldStackButtons && styles.buttonRow,
              ]}>
              {current.request.buttons.map((button, index) => {
                const isCancel = button.role === 'cancel';
                const isDestructive = button.role === 'destructive';
                const buttonTextColor = isCancel ? theme.colors.text : '#FFFFFF';
                const buttonStyle = [
                  styles.button,
                  !shouldStackButtons && styles.buttonHalf,
                  isCancel
                    ? {
                        backgroundColor: theme.colors.background,
                        borderColor: theme.colors.greyedOut,
                      }
                    : isDestructive
                      ? { backgroundColor: '#D64545', borderColor: '#D64545' }
                      : { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
                ];

                return (
                  <Pressable
                    key={`${current.id}-${button.key}`}
                    onPress={() => finishAndAdvance(button.key, index)}
                    style={buttonStyle}>
                    <Text
                      allowFontScaling
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      minimumFontScale={0.85}
                      style={[styles.buttonText, { color: buttonTextColor }]}>
                      {button.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    elevation: 9999,
  },
  foregroundLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 2,
    elevation: 2,
  },
  foregroundCentered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  foregroundBottom: {
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10, 14, 18, 0.54)',
    zIndex: 1,
  },
  backdropPressable: {
    flex: 1,
  },
  card: {
    width: '100%',
    overflow: 'hidden',
    shadowColor: '#091017',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.18,
    shadowRadius: 28,
    elevation: 18,
    zIndex: 3,
  },
  dialogCard: {
    borderRadius: 28,
  },
  sheetCard: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  heroStrip: {
    height: 10,
    width: '100%',
  },
  contentWrap: {
    paddingHorizontal: 22,
    paddingTop: 18,
    gap: 14,
  },
  handle: {
    width: 46,
    height: 5,
    borderRadius: 999,
    alignSelf: 'center',
    opacity: 0.8,
  },
  iconBadge: {
    width: 44,
    height: 44,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '800',
  },
  messageScroll: {},
  messageScrollContent: {
    paddingBottom: 4,
  },
  message: {
    fontSize: 15,
    lineHeight: 22,
  },
  buttonWrap: {
    gap: 12,
    marginTop: 4,
  },
  buttonRow: {
    flexDirection: 'row',
  },
  button: {
    minHeight: 52,
    borderRadius: 18,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  buttonHalf: {
    flex: 1,
  },
  buttonText: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '800',
  },
});
