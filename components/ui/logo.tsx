/**
 * ELVA Logo - SVG wordmark from elva.svg
 * Pulses in sync with real-time heart rate.
 * The SVG contains: E (with accent bar) + L + V + A letters in brand purple #7c095f
 */

import React, { useEffect } from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  Easing,
} from 'react-native-reanimated';
import useTheme from '@/hooks/use-theme';

const BRAND_PURPLE = '#7c095f';

// Original SVG viewBox: 0 0 1024 768
// We scale proportionally. Aspect ratio ≈ 1024:768 = 4:3
const SVG_ASPECT = 1024 / 768;

interface ElvaLogoProps {
  /** Height-based sizing — width auto-calculated from aspect ratio */
  size?: number;
  heartRate?: number;
  style?: ViewStyle;
  variant?: 'solid' | 'outline';
  color?: string;
  /** Show only the "E" monogram instead of full wordmark */
  monogram?: boolean;
}

export function ElvaLogo({
  size = 48,
  heartRate = 72,
  style,
  variant = 'solid',
  color,
  monogram = false,
}: ElvaLogoProps) {
  const { colors } = useTheme();
  const opacity = useSharedValue(1);
  const scale = useSharedValue(1);

  const pulseDuration = heartRate > 0 ? (60 / heartRate) * 1000 : 833;

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(0.7, {
        duration: pulseDuration / 2,
        easing: Easing.inOut(Easing.ease),
      }),
      -1,
      true
    );
    scale.value = withRepeat(
      withTiming(1.03, {
        duration: pulseDuration / 2,
        easing: Easing.inOut(Easing.ease),
      }),
      -1,
      true
    );
  }, [heartRate, pulseDuration]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  const fill = color ?? (variant === 'solid' ? BRAND_PURPLE : colors.text);
  const svgWidth = monogram ? size : size * SVG_ASPECT;
  const svgHeight = size;

  if (monogram) {
    // Just the "E" letter with accent bar
    return (
      <Animated.View style={[styles.container, style, animatedStyle]}>
        <Svg width={svgWidth} height={svgHeight} viewBox="140 140 300 300">
          {/* E body */}
          <Path
            d="m 118.83,115.99 v 9.21 H 81.17 V 74.798 h 36.87 v 9.216 H 92.404 v 31.896 z"
            fill={fill}
            transform="matrix(2.5,0,0,2.5,66.466,134.1)"
          />
          {/* E accent bar */}
          <Path
            d="m 99.46,104.61 2.3,-9.219 h 13.83 v 9.219 z"
            fill={fill}
            transform="matrix(2.5,0,0,2.5,66.466,134.1)"
          />
        </Svg>
      </Animated.View>
    );
  }

  // Full ELVA wordmark
  return (
    <Animated.View style={[styles.container, style, animatedStyle]}>
      <Svg width={svgWidth} height={svgHeight} viewBox="0 0 1024 768">
        {/* E body */}
        <Path
          d="m 118.83,115.99 v 9.21 H 81.17 V 74.798 h 36.87 v 9.216 H 92.404 v 31.896 z"
          fill={fill}
          transform="matrix(2.6388,0,0,2.6388,38.211,112.907)"
        />
        {/* E accent bar */}
        <Path
          d="m 99.46,104.61 2.3,-9.219 h 13.83 v 9.219 z"
          fill={fill}
          transform="matrix(2.6388,0,0,2.6388,38.211,112.907)"
        />
        {/* L */}
        <Path
          d="m 485.67,422.44 v 24.663 H 406.1 v -126.01 h 28.262 v 101.17 z"
          fill={fill}
        />
        {/* V */}
        <Path
          d="m 519.31,320.91 46.084,126.01 h -27.35 l -46.09,-126.01 z m 95.229,0 -38.884,105.13 c -17.642,-10.62 -15.84,-26.101 -15.84,-26.101 l 25.92,-79.03 z"
          fill={fill}
        />
        {/* A */}
        <Path
          d="M 126.21,125.2 106.19,74.798 H 94.24 L 73.79,125.2 h 11.521 l 6.768,-18.36 7.777,-20.097 14.334,38.457 z"
          fill={fill}
          transform="matrix(2.5,0,0,2.5,439.09,133.92)"
        />
      </Svg>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
