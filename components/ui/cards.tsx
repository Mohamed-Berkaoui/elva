import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ViewStyle,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import useTheme from '@/hooks/use-theme';
import { BorderRadius, Spacing, FontSizes, type ThemeColors } from '@/constants/theme';

// ===========================================
// GlassCard - Simple themed card container
// ===========================================

interface GlassCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
  animated?: boolean;
  delay?: number;
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  style,
  onPress,
  animated = true,
  delay = 0,
}) => {
  const { colors } = useTheme();
  const opacity = useSharedValue(animated ? 0 : 1);

  useEffect(() => {
    if (animated) {
      const timeout = setTimeout(() => {
        opacity.value = withTiming(1, { duration: 300 });
      }, delay);
      return () => clearTimeout(timeout);
    }
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const cardStyle: ViewStyle = {
    backgroundColor: colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    borderWidth: 0.5,
    borderColor: colors.border,
  };

  const content = <View style={[cardStyle, style]}>{children}</View>;

  if (onPress) {
    return (
      <Animated.View style={animatedStyle}>
        <Pressable onPress={onPress}>{content}</Pressable>
      </Animated.View>
    );
  }

  return <Animated.View style={animatedStyle}>{content}</Animated.View>;
};

// ===========================================
// MetricCard - Health metric display card
// ===========================================

interface MetricCardProps {
  title: string;
  value: string | number;
  unit?: string;
  icon?: React.ReactNode;
  color?: string;
  trend?: 'up' | 'down' | 'stable';
  style?: ViewStyle;
  onPress?: () => void;
  delay?: number;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  unit,
  icon,
  color,
  trend,
  style,
  onPress,
  delay = 0,
}) => {
  const { colors } = useTheme();
  const accentColor = color || colors.text;

  const cardStyle: ViewStyle = {
    padding: Spacing.lg,
    minWidth: 150,
    overflow: 'hidden',
  };

  const getTrendColor = () => {
    if (trend === 'up') return colors.success;
    if (trend === 'down') return colors.error;
    return colors.textMuted;
  };

  const getTrendText = () => {
    if (trend === 'up') return '↑ Increased';
    if (trend === 'down') return '↓ Decreased';
    return '→ Stable';
  };

  return (
    <GlassCard style={{ ...cardStyle, ...style }} onPress={onPress} delay={delay} animated={false}>
      <View style={styles.metricHeader}>
        {icon && (
          <View style={[styles.iconContainer, { backgroundColor: accentColor + '20' }]}>
            {icon}
          </View>
        )}
        <Text style={[styles.metricTitle, { color: colors.textSecondary }]}>{title}</Text>
      </View>
      <View style={styles.metricValueContainer}>
        <Text style={[styles.metricValue, { color: accentColor }]}>{value}</Text>
        {unit && <Text style={[styles.metricUnit, { color: colors.textMuted }]}>{unit}</Text>}
      </View>
      {trend && (
        <Text style={[styles.trendIndicator, { color: getTrendColor() }]}>{getTrendText()}</Text>
      )}
    </GlassCard>
  );
};

// ===========================================
// ProgressRing - Circular progress indicator
// ===========================================

interface ProgressRingProps {
  progress: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  children?: React.ReactNode;
}

export const ProgressRing: React.FC<ProgressRingProps> = ({
  progress,
  size = 120,
  strokeWidth = 10,
  color,
  children,
}) => {
  const { colors } = useTheme();
  const progressColor = color || colors.text;
  const backgroundColor = colors.surface;

  const animatedProgress = useSharedValue(0);

  useEffect(() => {
    animatedProgress.value = withTiming(progress, { duration: 1500 });
  }, [progress]);

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={StyleSheet.absoluteFill}>
        {/* Background circle */}
        <View
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: strokeWidth,
            borderColor: backgroundColor,
            position: 'absolute',
          }}
        />
        {/* Progress indicator */}
        <View
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: strokeWidth,
            borderColor: progressColor,
            borderTopColor: 'transparent',
            borderRightColor: 'transparent',
            position: 'absolute',
          }}
        />
      </View>
      <View style={styles.progressRingContent}>{children}</View>
    </View>
  );
};

// ===========================================
// PulsingDot - Animated status indicator
// ===========================================

interface PulsingDotProps {
  color?: string;
  size?: number;
}

export const PulsingDot: React.FC<PulsingDotProps> = ({ color, size = 8 }) => {
  const { colors } = useTheme();
  const dotColor = color || colors.success;

  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  useEffect(() => {
    const animate = () => {
      scale.value = withTiming(1.5, { duration: 1000 }, () => {
        scale.value = withTiming(1, { duration: 1000 });
      });
      opacity.value = withTiming(0.5, { duration: 1000 }, () => {
        opacity.value = withTiming(1, { duration: 1000 });
      });
    };

    animate();
    const interval = setInterval(animate, 2000);
    return () => clearInterval(interval);
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <View style={styles.pulsingDotContainer}>
      <Animated.View
        style={[
          styles.pulsingDotOuter,
          {
            backgroundColor: dotColor + '40',
            width: size * 2,
            height: size * 2,
            borderRadius: size,
          },
          animatedStyle,
        ]}
      />
      <View
        style={{
          backgroundColor: dotColor,
          width: size,
          height: size,
          borderRadius: size / 2,
        }}
      />
    </View>
  );
};

// ===========================================
// Styles (no colors - all colors are inline)
// ===========================================

const styles = StyleSheet.create({
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  metricTitle: {
    fontSize: FontSizes.sm,
    flex: 1,
  },
  metricValueContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: Spacing.sm,
  },
  metricValue: {
    fontSize: FontSizes.xxxl,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  metricUnit: {
    fontSize: FontSizes.md,
    marginLeft: Spacing.xs,
  },
  trendIndicator: {
    fontSize: FontSizes.xs,
    marginTop: Spacing.xs,
  },
  progressRingContent: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulsingDotContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulsingDotOuter: {
    position: 'absolute',
  },
});
