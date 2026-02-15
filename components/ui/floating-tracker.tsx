/**
 * FloatingTracker — persistent floating pill that appears when
 * a sleep or sport tracking session is active. Tap to navigate
 * back to the tracking screen.
 */

import React, { useEffect } from 'react';
import { Text, Pressable, StyleSheet, View } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSpring,
  Easing,
} from 'react-native-reanimated';
import { Icon } from '@/components/ui/icon';
import { useApp } from '@/context/app-context';
import useTheme from '@/hooks/use-theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function FloatingTracker() {
  const { activeTracking, trackingElapsed } = useApp();
  const { colors } = useTheme();
  const router = useRouter();
  const pathname = usePathname();

  // Pulse animation for the dot
  const dotScale = useSharedValue(1);
  useEffect(() => {
    if (activeTracking) {
      dotScale.value = withRepeat(
        withTiming(1.6, { duration: 900, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
      );
    } else {
      dotScale.value = 1;
    }
  }, [activeTracking]);

  const dotStyle = useAnimatedStyle(() => ({
    transform: [{ scale: dotScale.value }],
    opacity: 2 - dotScale.value, // fades as it expands
  }));

  if (!activeTracking) return null;

  // Hide on the screen that's already showing the tracker
  const targetPath = activeTracking.type === 'sleep' ? '/details/sleep' : '/details/sport';
  if (pathname === targetPath) return null;

  const isSleep = activeTracking.type === 'sleep';
  const accentColor = isSleep ? '#7E57C2' : '#FF7043';
  const iconName = isSleep ? 'moon-waning-crescent' : 'run';
  const label = isSleep ? 'Sleep' : 'Workout';

  // Format elapsed
  const h = Math.floor(trackingElapsed / 3600);
  const m = Math.floor((trackingElapsed % 3600) / 60);
  const s = trackingElapsed % 60;
  const time =
    h > 0
      ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
      : `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;

  const handlePress = () => {
    router.push(targetPath as any);
  };

  return (
    <Pressable
      style={[styles.pill, { backgroundColor: accentColor }]}
      onPress={handlePress}
    >
      <Icon name={iconName as any} size={16} color="#fff" />
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.time}>{time}</Text>
      <Animated.View style={[styles.dot, dotStyle]} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    position: 'absolute',
    bottom: 100,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 28,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    zIndex: 999,
  },
  label: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  time: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#fff',
    marginLeft: 2,
  },
});
