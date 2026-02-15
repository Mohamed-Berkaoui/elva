import React from 'react';
import { View, Text, StyleSheet, Dimensions, LayoutChangeEvent } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  Easing,
} from 'react-native-reanimated';
import useTheme from '@/hooks/use-theme';
import { FontSizes, Spacing, BorderRadius } from '@/constants/theme';

const { width: screenWidth } = Dimensions.get('window');

// ===========================================
// Helpers
// ===========================================

/** Format a number for Y-axis: 4200→4.2k, 130→130, 7.2→7.2 */
function fmtAxis(v: number): string {
  if (v >= 10000) return `${(v / 1000).toFixed(0)}k`;
  if (v >= 1000) return `${(v / 1000).toFixed(1)}k`;
  if (Number.isInteger(v)) return `${v}`;
  return v.toFixed(1);
}

// ===========================================
// Bar Chart — Pill bars + Y-axis + value badge
// ===========================================

interface BarChartProps {
  data: { label: string; value: number }[];
  maxValue?: number;
  barColor?: string;
  height?: number;
  unit?: string;
}

export const BarChart: React.FC<BarChartProps> = ({
  data,
  maxValue,
  barColor,
  height = 140,
  unit = '',
}) => {
  const { colors } = useTheme();
  const color = barColor ?? colors.accent;
  const max = maxValue || Math.max(...data.map(d => d.value));
  const min = Math.min(...data.map(d => d.value));
  const [containerWidth, setContainerWidth] = React.useState(0);
  const onLayout = (e: LayoutChangeEvent) => setContainerWidth(e.nativeEvent.layout.width);

  const yAxisW = 32; // space for Y-axis labels
  const effectiveWidth = (containerWidth || (screenWidth - Spacing.lg * 4)) - yAxisW;

  const count = data.length;
  const gapFraction = 0.3;
  const totalBarSpace = effectiveWidth * (1 - gapFraction);
  const totalGapSpace = effectiveWidth * gapFraction;
  const barW = Math.min(Math.max(5, totalBarSpace / count), 22);
  const gapW = count > 1 ? totalGapSpace / (count - 1) : 0;

  const labelEvery = count > 20 ? 7 : count > 12 ? 4 : count > 7 ? 2 : 1;
  const chartH = height - 22;

  // Max bar index for badge
  const maxIdx = data.reduce((mi, d, i, arr) => (d.value > arr[mi].value ? i : mi), 0);

  // Y-axis ticks: 0, mid, max
  const yTicks = [
    { value: max, y: 0 },
    { value: Math.round((max + min) / 2), y: chartH / 2 },
    { value: Math.round(min), y: chartH },
  ];

  return (
    <View style={[styles.barChartContainer, { height: height + 20 }]} onLayout={onLayout}>
      {/* Y-axis labels */}
      <View style={{ width: yAxisW, height: chartH, justifyContent: 'space-between', alignItems: 'flex-end', paddingRight: 6 }}>
        {yTicks.map((tick, i) => (
          <Text key={i} style={{ fontSize: 9, fontWeight: '600', color: colors.textMuted, letterSpacing: -0.2 }}>
            {fmtAxis(tick.value)}
          </Text>
        ))}
      </View>

      {/* Chart area */}
      <View style={{ flex: 1 }}>
        {/* Horizontal grid lines */}
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: chartH }}>
          {[0, 0.5, 1].map(pct => (
            <View
              key={pct}
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                top: pct * chartH,
                height: StyleSheet.hairlineWidth,
                backgroundColor: colors.border + '30',
              }}
            />
          ))}
        </View>

        {/* Bars row — each item has fixed width so labels/badges don't push layout */}
        <View style={[styles.barChartBars, { gap: gapW, height: chartH }]}>
          {data.map((item, index) => {
            const pct = max > 0 ? item.value / max : 0;
            const isHighest = index === maxIdx;
            return (
              <View key={index} style={{ width: barW, alignItems: 'center', justifyContent: 'flex-end', overflow: 'visible' }}>
                {/* Value badge on highest bar — absolutely positioned */}
                {isHighest && (
                  <View style={{
                    position: 'absolute',
                    top: -18,
                    zIndex: 10,
                    backgroundColor: color,
                    borderRadius: 6,
                    paddingHorizontal: 5,
                    paddingVertical: 2,
                    alignSelf: 'center',
                  }}>
                    <Text style={{ fontSize: 8, fontWeight: '800', color: '#fff', letterSpacing: -0.2 }}>
                      {fmtAxis(item.value)}{unit}
                    </Text>
                  </View>
                )}
                <PillBar
                  pct={pct}
                  width={barW}
                  chartHeight={chartH}
                  color={color}
                  delay={index * 25}
                  isHighest={isHighest}
                />
              </View>
            );
          })}
        </View>

        {/* X-axis labels — absolutely positioned so they don't affect bar layout */}
        <View style={{ position: 'relative', height: 18, marginTop: 4 }}>
          {data.map((item, index) => {
            if (index % labelEvery !== 0 && index !== count - 1) return null;
            // Center label on the bar position
            const barCenterX = index * (barW + gapW) + barW / 2;
            return (
              <Text
                key={index}
                style={{
                  position: 'absolute',
                  left: barCenterX - 18,
                  width: 36,
                  textAlign: 'center',
                  fontSize: 9,
                  fontWeight: '500',
                  color: colors.textMuted,
                  letterSpacing: 0.1,
                }}
              >
                {item.label}
              </Text>
            );
          })}
        </View>
      </View>
    </View>
  );
};

const PillBar: React.FC<{
  pct: number; width: number; chartHeight: number; color: string; delay: number; isHighest: boolean;
}> = ({ pct, width, chartHeight, color, delay, isHighest }) => {
  const animH = useSharedValue(0);
  const fillH = Math.max(2, pct * chartHeight);
  const radius = width / 2;

  React.useEffect(() => {
    const t = setTimeout(() => {
      animH.value = withSpring(fillH, { damping: 16, stiffness: 110 });
    }, delay);
    return () => clearTimeout(t);
  }, [pct]);

  const barStyle = useAnimatedStyle(() => ({ height: animH.value }));
  const opacity = isHighest ? 1 : 0.35 + pct * 0.55;

  return (
    <View style={{ width, height: chartHeight, justifyContent: 'flex-end', alignItems: 'center' }}>
      <Animated.View
        style={[
          {
            width,
            borderRadius: radius,
            backgroundColor: color,
            opacity,
            ...(isHighest ? {
              shadowColor: color,
              shadowOffset: { width: 0, height: 3 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 6,
            } : {}),
          },
          barStyle,
        ]}
      />
    </View>
  );
};

// ===========================================
// Line Chart — Smooth lines + area + annotations
// ===========================================

interface LineChartProps {
  data: { label: string; value: number }[];
  height?: number;
  lineColor?: string;
  dotColor?: string;
  unit?: string;
}

export const SimpleLineChart: React.FC<LineChartProps> = ({
  data,
  height = 120,
  lineColor,
  dotColor,
  unit = '',
}) => {
  const { colors } = useTheme();
  const color = lineColor ?? colors.accent;
  const dColor = dotColor ?? color;

  const maxValue = Math.max(...data.map(d => d.value));
  const minValue = Math.min(...data.map(d => d.value));
  const range = maxValue - minValue || 1;

  const [containerWidth, setContainerWidth] = React.useState(0);
  const onLayout = (e: LayoutChangeEvent) => setContainerWidth(e.nativeEvent.layout.width);

  const yAxisW = 32;
  const chartWidth = (containerWidth || (screenWidth - Spacing.lg * 4)) - yAxisW;
  const chartH = height - 4;
  const count = data.length;
  const stepW = count > 1 ? chartWidth / (count - 1) : chartWidth;

  const points = data.map((item, i) => {
    const normY = (item.value - minValue) / range;
    return {
      x: i * stepW,
      y: chartH - normY * (chartH - 12) - 6,
      value: item.value,
    };
  });

  const labelEvery = count > 14 ? Math.ceil(count / 7) : count > 7 ? 2 : 1;

  // Y-axis ticks
  const mid = Math.round((maxValue + minValue) / 2);
  const yTicks = [
    { value: maxValue, y: 6 },
    { value: mid, y: chartH / 2 },
    { value: minValue, y: chartH - 6 },
  ];

  // Max / min indices
  const maxIdx = data.reduce((mi, d, i, arr) => (d.value > arr[mi].value ? i : mi), 0);
  const minIdx = data.reduce((mi, d, i, arr) => (d.value < arr[mi].value ? i : mi), 0);

  return (
    <View style={{ width: '100%', height: height + 26 }} onLayout={onLayout}>
      <View style={{ flexDirection: 'row' }}>
        {/* Y-axis */}
        <View style={{ width: yAxisW, height: chartH, justifyContent: 'space-between', alignItems: 'flex-end', paddingRight: 6 }}>
          {yTicks.map((tick, i) => (
            <Text key={i} style={{ fontSize: 9, fontWeight: '600', color: colors.textMuted, letterSpacing: -0.2 }}>
              {fmtAxis(tick.value)}
            </Text>
          ))}
        </View>

        {/* Chart area */}
        <View style={{ flex: 1, height: chartH, position: 'relative', overflow: 'hidden' }}>

          {/* Horizontal grid */}
          {[0, 0.5, 1].map(pct => (
            <View
              key={pct}
              style={{
                position: 'absolute',
                left: 0, right: 0,
                top: pct * chartH,
                height: StyleSheet.hairlineWidth,
                backgroundColor: colors.border + '25',
              }}
            />
          ))}

          {/* Area fill */}
          {points.map((pt, i) => {
            const colW = i === 0 || i === count - 1 ? stepW / 2 : stepW;
            const left = i === 0 ? 0 : pt.x - stepW / 2;
            return (
              <AreaStrip
                key={`a-${i}`}
                left={left}
                top={pt.y}
                width={colW}
                height={chartH - pt.y}
                color={color}
                delay={i * 20}
              />
            );
          })}

          {/* Line segments */}
          {points.map((pt, i) => {
            if (i === count - 1) return null;
            const next = points[i + 1];
            const dx = next.x - pt.x;
            const dy = next.y - pt.y;
            const length = Math.sqrt(dx * dx + dy * dy);
            const angle = Math.atan2(dy, dx) * (180 / Math.PI);
            return (
              <LineSeg
                key={`l-${i}`}
                left={pt.x}
                top={pt.y}
                width={length}
                angle={angle}
                color={color}
                delay={i * 20}
              />
            );
          })}

          {/* Key dots: first, last, max, min */}
          {points.map((pt, i) => {
            const isFirst = i === 0;
            const isLast = i === count - 1;
            const isMax = i === maxIdx;
            const isMin = i === minIdx && count > 3;
            if (!isFirst && !isLast && !isMax && !isMin) return null;
            return (
              <DotPoint
                key={`d-${i}`}
                x={pt.x}
                y={pt.y}
                color={dColor}
                bgColor={colors.background}
                delay={i * 20 + 200}
                highlight={isMax}
              />
            );
          })}

          {/* Value badge at max point */}
          {points.length > 0 && (
            <View style={{
              position: 'absolute',
              left: Math.max(0, Math.min(points[maxIdx].x - 20, chartWidth - 44)),
              top: Math.max(0, points[maxIdx].y - 22),
              backgroundColor: color,
              borderRadius: 6,
              paddingHorizontal: 5,
              paddingVertical: 2,
            }}>
              <Text style={{ fontSize: 8, fontWeight: '800', color: '#fff', letterSpacing: -0.2 }}>
                {fmtAxis(maxValue)}{unit}
              </Text>
            </View>
          )}

          {/* Value badge at min point (if not too close to max) */}
          {count > 3 && Math.abs(maxIdx - minIdx) > 1 && (
            <View style={{
              position: 'absolute',
              left: Math.max(0, Math.min(points[minIdx].x - 20, chartWidth - 44)),
              top: Math.min(chartH - 16, points[minIdx].y + 10),
              backgroundColor: colors.surfaceSecondary,
              borderRadius: 6,
              paddingHorizontal: 5,
              paddingVertical: 2,
              borderWidth: 0.5,
              borderColor: colors.border,
            }}>
              <Text style={{ fontSize: 8, fontWeight: '700', color: colors.textMuted, letterSpacing: -0.2 }}>
                {fmtAxis(minValue)}{unit}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* X-axis labels */}
      <View style={{ marginLeft: yAxisW, position: 'relative', height: 18, marginTop: 6 }}>
        {data.map((item, i) => {
          if (i % labelEvery !== 0 && i !== count - 1) return null;
          return (
            <Text
              key={i}
              style={{
                position: 'absolute',
                left: Math.max(0, Math.min(points[i].x - 15, chartWidth - 30)),
                fontSize: 9,
                fontWeight: '500',
                color: colors.textMuted,
                width: 30,
                textAlign: 'center',
                letterSpacing: 0.1,
              }}
            >
              {item.label}
            </Text>
          );
        })}
      </View>
    </View>
  );
};

// ── Sub-components ──

const AreaStrip: React.FC<{
  left: number; top: number; width: number; height: number; color: string; delay: number;
}> = ({ left, top, width, height, color, delay }) => {
  const opacity = useSharedValue(0);
  React.useEffect(() => {
    const t = setTimeout(() => {
      opacity.value = withTiming(1, { duration: 500 });
    }, delay);
    return () => clearTimeout(t);
  }, []);
  const anim = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View style={[{ position: 'absolute', left, top, width, height }, anim]}>
      <View style={{ flex: 1, backgroundColor: color, opacity: 0.10 }} />
      <View style={{ flex: 2, backgroundColor: color, opacity: 0.03 }} />
    </Animated.View>
  );
};

const LineSeg: React.FC<{
  left: number; top: number; width: number; angle: number; color: string; delay: number;
}> = ({ left, top, width, angle, color, delay }) => {
  const scaleX = useSharedValue(0);
  React.useEffect(() => {
    const t = setTimeout(() => {
      scaleX.value = withTiming(1, { duration: 400, easing: Easing.out(Easing.ease) });
    }, delay);
    return () => clearTimeout(t);
  }, []);
  const anim = useAnimatedStyle(() => ({
    transform: [{ rotate: `${angle}deg` }, { scaleX: scaleX.value }],
    opacity: scaleX.value,
  }));

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left,
          top: top - 1,
          width,
          height: 2.5,
          backgroundColor: color,
          borderRadius: 1.25,
          transformOrigin: 'left center',
        },
        anim,
      ]}
    />
  );
};

const DotPoint: React.FC<{
  x: number; y: number; color: string; bgColor: string; delay: number; highlight?: boolean;
}> = ({ x, y, color, bgColor, delay, highlight }) => {
  const scale = useSharedValue(0);
  React.useEffect(() => {
    const t = setTimeout(() => {
      scale.value = withSpring(1, { damping: 12, stiffness: 150 });
    }, delay);
    return () => clearTimeout(t);
  }, []);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const size = highlight ? 8 : 6;

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: x - size / 2,
          top: y - size / 2,
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
          borderWidth: 2,
          borderColor: bgColor,
          ...(highlight ? {
            shadowColor: color,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.5,
            shadowRadius: 4,
            elevation: 4,
          } : {}),
        },
        anim,
      ]}
    />
  );
};

// ===========================================
// Circular Progress
// ===========================================

interface CircularProgressProps {
  progress: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  backgroundColor?: string;
  showValue?: boolean;
  label?: string;
}

export const CircularProgress: React.FC<CircularProgressProps> = ({
  progress,
  size = 100,
  strokeWidth = 8,
  color,
  backgroundColor,
  showValue = true,
  label,
}) => {
  const { colors } = useTheme();
  const progressColor = color ?? colors.accent;
  const bgColor = backgroundColor ?? colors.surface;
  const animatedProgress = useSharedValue(0);

  React.useEffect(() => {
    animatedProgress.value = withTiming(progress, { duration: 1000 });
  }, [progress]);

  return (
    <View style={[styles.circularProgressContainer, { width: size, height: size }]}>
      {/* Background circle */}
      <View
        style={[
          styles.circularProgressBg,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: strokeWidth,
            borderColor: bgColor,
          },
        ]}
      />

      {/* Progress indicator */}
      <View
        style={[
          styles.circularProgressFg,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: strokeWidth,
            borderColor: progressColor,
            borderRightColor: 'transparent',
            borderBottomColor: progress > 25 ? progressColor : 'transparent',
            borderLeftColor: progress > 50 ? progressColor : 'transparent',
            borderTopColor: progress > 75 ? progressColor : 'transparent',
            transform: [{ rotate: '-45deg' }],
          },
        ]}
      />

      {/* Center content */}
      <View style={styles.circularProgressContent}>
        {showValue && (
          <Text style={[styles.circularProgressValue, { color: progressColor }]}>
            {Math.round(progress)}%
          </Text>
        )}
        {label && (
          <Text style={[styles.circularProgressLabel, { color: colors.textMuted }]}>{label}</Text>
        )}
      </View>
    </View>
  );
};

// ===========================================
// Styles
// ===========================================

const styles = StyleSheet.create({
  barChartContainer: {
    width: '100%',
    flexDirection: 'row',
  },
  barChartBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
  },
  circularProgressContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  circularProgressBg: {
    position: 'absolute',
  },
  circularProgressFg: {
    position: 'absolute',
  },
  circularProgressContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  circularProgressValue: {
    fontSize: FontSizes.xl,
    fontWeight: '700',
  },
  circularProgressLabel: {
    fontSize: FontSizes.xs,
    marginTop: 2,
  },
});
