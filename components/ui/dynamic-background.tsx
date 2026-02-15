/**
 * ELVA Dynamic Background
 * Supports per-page nature photography with dark overlay.
 * Pages can opt out of images (plain mode) or choose a specific image.
 * 
 * Available images:
 *  - sunset: Sunset with river and trees → Sleep
 *  - green-mountains: Green mountains → Activity / Performance
 *  - white-mountain: White mountain with blue sky → Men's / Women's Health
 *  - red-sky: Green mountains with red sky → Analytics
 *  - mist: Original misty landscape (IMG_5588)
 *  - sun: Original sunlit forest (IMG_5589)
 */

import React, { useEffect } from 'react';
import { StyleSheet, View, ViewStyle, ImageBackground } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolate,
} from 'react-native-reanimated';
import useTheme from '@/hooks/use-theme';

// Nature photos from assets
const IMG_MIST = require('@/assets/images/IMG_5588.jpeg');
const IMG_SUN = require('@/assets/images/IMG_5589.jpeg');
const IMG_SUNSET = require('@/assets/images/sun set(down) with rever and some trees.jpeg');
const IMG_GREEN_MOUNTAINS = require('@/assets/images/green mountens .jpeg');
const IMG_WHITE_MOUNTAIN = require('@/assets/images/white mounten with blue sky.jpeg');
const IMG_RED_SKY = require('@/assets/images/green mountens  but with like red sky.jpeg');

export type BackgroundImage = 'sunset' | 'green-mountains' | 'white-mountain' | 'red-sky' | 'mist' | 'sun' | 'none';

const IMAGE_MAP: Record<Exclude<BackgroundImage, 'none'>, any> = {
  sunset: IMG_SUNSET,
  'green-mountains': IMG_GREEN_MOUNTAINS,
  'white-mountain': IMG_WHITE_MOUNTAIN,
  'red-sky': IMG_RED_SKY,
  mist: IMG_MIST,
  sun: IMG_SUN,
};

interface DynamicBackgroundProps {
  readinessScore: number;
  style?: ViewStyle;
  children?: React.ReactNode;
  /** Specific image to show, or 'none' for plain background */
  image?: BackgroundImage;
  /** If true, uses plain theme background with no nature image */
  plain?: boolean;
}

export function DynamicBackground({
  readinessScore,
  style,
  children,
  image,
  plain = false,
}: DynamicBackgroundProps) {
  const { colors, isDark } = useTheme();
  const transition = useSharedValue(0);

  const showImage = !plain && image !== 'none';

  useEffect(() => {
    if (!showImage) return;
    const targetValue = readinessScore >= 70 ? 1 : 0;
    transition.value = withTiming(targetValue, { duration: 2000 });
  }, [readinessScore, showImage]);

  // If plain mode or image='none', render simple background
  if (!showImage) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }, style]}>
        {children && <View style={styles.content}>{children}</View>}
      </View>
    );
  }

  // High overlay for subtle, low-opacity background images
  const overlayGradient: readonly [string, string, ...string[]] = isDark
    ? ['rgba(0,0,0,0.55)', 'rgba(0,0,0,0.45)', 'rgba(0,0,0,0.60)']
    : ['rgba(255,255,255,0.55)', 'rgba(255,255,255,0.45)', 'rgba(255,255,255,0.60)'];

  // If a specific image is requested, show only that
  if (image) {
    const source = IMAGE_MAP[image];
    return (
      <View style={[styles.container, { backgroundColor: colors.background }, style]}>
        <ImageBackground source={source} style={styles.image} resizeMode="cover" />
        <LinearGradient
          colors={overlayGradient}
          style={styles.overlay}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
        />
        {children && <View style={styles.content}>{children}</View>}
      </View>
    );
  }

  // Default: crossfade between mist (low readiness) and sun (high readiness)
  const sunOpacity = useAnimatedStyle(() => ({
    opacity: interpolate(transition.value, [0, 1], [0, 1]),
  }));

  const mistOpacity = useAnimatedStyle(() => ({
    opacity: interpolate(transition.value, [0, 1], [1, 0]),
  }));

  return (
    <View style={[styles.container, { backgroundColor: colors.background }, style]}>
      {/* Mist layer — low readiness */}
      <Animated.View style={[styles.imageLayer, mistOpacity]}>
        <ImageBackground source={IMG_MIST} style={styles.image} resizeMode="cover" />
      </Animated.View>

      {/* Sunlight layer — high readiness */}
      <Animated.View style={[styles.imageLayer, sunOpacity]}>
        <ImageBackground source={IMG_SUN} style={styles.image} resizeMode="cover" />
      </Animated.View>

      {/* Dark overlay for text legibility */}
      <LinearGradient
        colors={overlayGradient}
        style={styles.overlay}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />

      {/* Content */}
      {children && <View style={styles.content}>{children}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  imageLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  image: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  content: {
    flex: 1,
  },
});
