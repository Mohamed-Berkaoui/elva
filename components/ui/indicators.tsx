/**
 * ELVA Health Indicators
 * Real-time health metric indicators with trend visualization,
 * mini sparklines, and status badges for a live-feel dashboard.
 */

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { Icon, type IconName } from '@/components/ui/icon';
import useTheme from '@/hooks/use-theme';
import { FontSizes, Spacing, BorderRadius, type ThemeColors } from '@/constants/theme';

const { width: screenWidth } = Dimensions.get('window');

// ============================================
// Trend Badge - Shows up/down/stable trend
// ============================================

interface TrendBadgeProps {
  trend: 'up' | 'down' | 'stable';
  value?: string; // e.g. "+5%"
  size?: 'sm' | 'md';
}

export const TrendBadge: React.FC<TrendBadgeProps> = ({ trend, value, size = 'sm' }) => {
  const { colors } = useTheme();

  const trendConfig = {
    up: { icon: 'trending-up' as const, color: colors.success, label: 'Improving' },
    down: { icon: 'trending-down' as const, color: colors.error, label: 'Declining' },
    stable: { icon: 'minus' as const, color: colors.textMuted, label: 'Stable' },
  };

  const config = trendConfig[trend];
  const iconSize = size === 'sm' ? 14 : 18;
  const fontSize = size === 'sm' ? FontSizes.xs : FontSizes.sm;

  return (
    <View style={[styles.trendBadge, { backgroundColor: config.color + '15' }]}>
      <Icon name={config.icon} size={iconSize} color={config.color} />
      {value && (
        <Text style={[styles.trendValue, { color: config.color, fontSize }]}>{value}</Text>
      )}
    </View>
  );
};

// ============================================
// Live Pulse Indicator - Animated heartbeat dot
// ============================================

interface LivePulseProps {
  color?: string;
  size?: number;
  active?: boolean;
}

export const LivePulse: React.FC<LivePulseProps> = ({ color, size = 8, active = true }) => {
  const { colors } = useTheme();
  const pulseColor = color || colors.success;

  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  useEffect(() => {
    if (active) {
      scale.value = withRepeat(
        withSequence(
          withTiming(1.5, { duration: 800, easing: Easing.out(Easing.ease) }),
          withTiming(1, { duration: 800, easing: Easing.in(Easing.ease) })
        ),
        -1,
        false
      );
      opacity.value = withRepeat(
        withSequence(
          withTiming(0.4, { duration: 800 }),
          withTiming(1, { duration: 800 })
        ),
        -1,
        false
      );
    }
  }, [active]);

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <View style={[styles.pulseContainer, { width: size * 3, height: size * 3 }]}>
      <Animated.View
        style={[
          styles.pulseRing,
          {
            width: size * 2.5,
            height: size * 2.5,
            borderRadius: size * 1.25,
            borderColor: pulseColor,
          },
          ringStyle,
        ]}
      />
      <View
        style={[
          styles.pulseDot,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: pulseColor,
          },
        ]}
      />
    </View>
  );
};

// ============================================
// Mini Sparkline - Inline trend visualization
// ============================================

interface MiniSparklineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  showDot?: boolean;
}

export const MiniSparkline: React.FC<MiniSparklineProps> = ({
  data,
  width = 60,
  height = 24,
  color,
  showDot = true,
}) => {
  const { colors } = useTheme();
  const lineColor = color || colors.accent;

  if (data.length < 2) return null;

  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const step = width / (data.length - 1);

  const points = data.map((val, i) => ({
    x: i * step,
    y: height - ((val - min) / range) * (height - 4) - 2,
  }));

  return (
    <View style={{ width, height, position: 'relative' }}>
      {/* Line segments */}
      {points.map((point, i) => {
        if (i === points.length - 1) return null;
        const next = points[i + 1];
        const dx = next.x - point.x;
        const dy = next.y - point.y;
        const length = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx) * (180 / Math.PI);

        return (
          <View
            key={i}
            style={{
              position: 'absolute',
              left: point.x,
              top: point.y,
              width: length,
              height: 1.5,
              backgroundColor: lineColor,
              transform: [{ rotate: `${angle}deg` }],
              transformOrigin: 'left center',
              opacity: 0.7,
            }}
          />
        );
      })}

      {/* Last point dot */}
      {showDot && points.length > 0 && (
        <View
          style={{
            position: 'absolute',
            left: points[points.length - 1].x - 3,
            top: points[points.length - 1].y - 3,
            width: 6,
            height: 6,
            borderRadius: 3,
            backgroundColor: lineColor,
          }}
        />
      )}
    </View>
  );
};

// ============================================
// Status Badge - Health status indicator
// ============================================

interface StatusBadgeProps {
  status: 'excellent' | 'good' | 'moderate' | 'low' | 'critical';
  label?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, label }) => {
  const { colors } = useTheme();

  const statusConfig = {
    excellent: { color: colors.success, label: label || 'Excellent', icon: 'check-circle' as const },
    good: { color: colors.success, label: label || 'Good', icon: 'check' as const },
    moderate: { color: colors.warning, label: label || 'Moderate', icon: 'alert' as const },
    low: { color: colors.error, label: label || 'Low', icon: 'alert-circle' as const },
    critical: { color: colors.error, label: label || 'Critical', icon: 'alert' as const },
  };

  const config = statusConfig[status];

  return (
    <View style={[styles.statusBadge, { backgroundColor: config.color + '15' }]}>
      <Icon name={config.icon} size={12} color={config.color} />
      <Text style={[styles.statusText, { color: config.color }]}>{config.label}</Text>
    </View>
  );
};

// ============================================
// Real-Time Metric Display
// ============================================

interface RealTimeMetricProps {
  label: string;
  value: string | number;
  unit?: string;
  icon: IconName;
  color: string;
  trend?: 'up' | 'down' | 'stable';
  trendValue?: string;
  sparklineData?: number[];
  status?: 'excellent' | 'good' | 'moderate' | 'low' | 'critical';
  confidence?: number;
  lastUpdated?: string;
}

export const RealTimeMetric: React.FC<RealTimeMetricProps> = ({
  label,
  value,
  unit,
  icon,
  color,
  trend,
  trendValue,
  sparklineData,
  status,
  confidence,
  lastUpdated,
}) => {
  const { colors } = useTheme();

  return (
    <View style={[styles.rtMetric, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.rtHeader}>
        <View style={styles.rtLabelRow}>
          <View style={[styles.rtIconBg, { backgroundColor: color + '20' }]}>
            <Icon name={icon} size={16} color={color} />
          </View>
          <Text style={[styles.rtLabel, { color: colors.textSecondary }]}>{label}</Text>
        </View>
        <LivePulse color={color} size={5} />
      </View>

      <View style={styles.rtValueRow}>
        <View style={styles.rtValueContainer}>
          <Text style={[styles.rtValue, { color }]}>
            {value}
            {unit && <Text style={[styles.rtUnit, { color: colors.textMuted }]}> {unit}</Text>}
          </Text>
        </View>
        {sparklineData && sparklineData.length > 0 && (
          <MiniSparkline data={sparklineData} color={color} width={50} height={20} />
        )}
      </View>

      <View style={styles.rtFooter}>
        {trend && <TrendBadge trend={trend} value={trendValue} />}
        {status && <StatusBadge status={status} />}
        {confidence !== undefined && (
          <Text style={[styles.rtConfidence, { color: colors.textMuted }]}>
            {confidence}% confidence
          </Text>
        )}
      </View>
    </View>
  );
};

// ============================================
// Readiness Gauge - Semicircular gauge
// ============================================

interface ReadinessGaugeProps {
  score: number;
  label?: string;
  size?: number;
}

export const ReadinessGauge: React.FC<ReadinessGaugeProps> = ({
  score,
  label = 'Readiness',
  size = 140,
}) => {
  const { colors } = useTheme();
  const animatedScore = useSharedValue(0);

  useEffect(() => {
    animatedScore.value = withTiming(score, { duration: 1500 });
  }, [score]);

  const getColor = () => {
    if (score >= 80) return colors.success;
    if (score >= 60) return colors.warning;
    return colors.error;
  };

  const gaugeColor = getColor();

  return (
    <View style={[styles.gaugeContainer, { width: size, height: size / 2 + 30 }]}>
      {/* Gauge background arc */}
      <View
        style={[
          styles.gaugeArc,
          {
            width: size,
            height: size / 2,
            borderTopLeftRadius: size / 2,
            borderTopRightRadius: size / 2,
            borderColor: colors.surfaceSecondary,
            borderBottomWidth: 0,
          },
        ]}
      />
      {/* Gauge fill arc */}
      <View
        style={[
          styles.gaugeArc,
          {
            width: size,
            height: size / 2,
            borderTopLeftRadius: size / 2,
            borderTopRightRadius: size / 2,
            borderColor: gaugeColor,
            borderBottomWidth: 0,
            opacity: 0.8,
          },
        ]}
      />
      {/* Score text */}
      <View style={[styles.gaugeCenter, { top: size / 4 }]}>
        <Text style={[styles.gaugeScore, { color: gaugeColor }]}>{score}</Text>
        <Text style={[styles.gaugeLabel, { color: colors.textMuted }]}>{label}</Text>
      </View>
    </View>
  );
};

// ============================================
// Styles
// ============================================

const styles = StyleSheet.create({
  // Trend Badge
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
    gap: 3,
  },
  trendValue: {
    fontWeight: '600',
  },

  // Live Pulse
  pulseContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseRing: {
    position: 'absolute',
    borderWidth: 1,
  },
  pulseDot: {},

  // Status Badge
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
    gap: 3,
  },
  statusText: {
    fontSize: FontSizes.xs,
    fontWeight: '600',
  },

  // Real-Time Metric
  rtMetric: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    marginBottom: Spacing.sm,
  },
  rtHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  rtLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  rtIconBg: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rtLabel: {
    fontSize: FontSizes.sm,
    fontWeight: '500',
  },
  rtValueRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: Spacing.xs,
  },
  rtValueContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  rtValue: {
    fontSize: FontSizes.xxl,
    fontWeight: '600',
    letterSpacing: -1,
  },
  rtUnit: {
    fontSize: FontSizes.sm,
    fontWeight: '400',
  },
  rtFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  rtConfidence: {
    fontSize: FontSizes.xs,
  },

  // Readiness Gauge
  gaugeContainer: {
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  gaugeArc: {
    position: 'absolute',
    top: 0,
    borderWidth: 8,
  },
  gaugeCenter: {
    position: 'absolute',
    alignItems: 'center',
  },
  gaugeScore: {
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: -1,
  },
  gaugeLabel: {
    fontSize: FontSizes.xs,
    fontWeight: '500',
    marginTop: 2,
  },
});
