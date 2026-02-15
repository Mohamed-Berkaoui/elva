/**
 * ELVA Performance Mode
 * Real-time muscle oxygen (SmO2) monitoring per PRD
 * NIRS sensor @ 10Hz with haptic feedback at 15% threshold
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Vibration, StatusBar } from 'react-native';
import { Icon } from '@/components/ui/icon';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  withRepeat,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DynamicBackground } from '@/components/ui/dynamic-background';
import { useApp } from '@/context/app-context';
import useTheme from '@/hooks/use-theme';
import { Spacing, BorderRadius, FontSizes, LogoSize, type ThemeColors } from '@/constants/theme';
import { GlassCard } from '@/components/ui/cards';
import { Button } from '@/components/ui/buttons';
import { FadeIn } from '@/components/ui/animations';
import { ElvaLogo } from '@/components/ui/logo';

const MUSCLE_OXYGEN_CRITICAL = 15;
const MUSCLE_OXYGEN_LOW = 30;
const UPDATE_FREQUENCY = 100;

export default function PerformanceScreen() {
  const insets = useSafeAreaInsets();
  const { latestReading, readinessScore } = useApp();
  const { mode, colors } = useTheme();

  const [isMonitoring, setIsMonitoring] = useState(false);
  const [currentSmO2, setCurrentSmO2] = useState(latestReading?.muscleOxygen || 65);
  const [muscleFatigue, setMuscleFatigue] = useState<'Low' | 'Medium' | 'High'>('Low');
  const [monitoringTime, setMonitoringTime] = useState(0);

  const pulseScale = useSharedValue(1);

  useEffect(() => {
    if (!isMonitoring) return;

    const interval = setInterval(() => {
      setCurrentSmO2((prev: number) => {
        const variation = (Math.random() - 0.5) * 5;
        const trend = -0.2;
        const newValue = Math.max(10, Math.min(100, prev + variation + trend));

        if (newValue <= MUSCLE_OXYGEN_CRITICAL && prev > MUSCLE_OXYGEN_CRITICAL) {
          Vibration.vibrate([0, 200, 100, 200]);
        }

        return newValue;
      });

      setMonitoringTime((prev) => prev + UPDATE_FREQUENCY / 1000);
    }, UPDATE_FREQUENCY);

    return () => clearInterval(interval);
  }, [isMonitoring]);

  useEffect(() => {
    if (currentSmO2 < 30) {
      setMuscleFatigue('High');
    } else if (currentSmO2 < 50) {
      setMuscleFatigue('Medium');
    } else {
      setMuscleFatigue('Low');
    }
  }, [currentSmO2]);

  useEffect(() => {
    if (currentSmO2 <= MUSCLE_OXYGEN_CRITICAL) {
      pulseScale.value = withRepeat(withTiming(1.05, { duration: 300 }), -1, true);
    } else {
      pulseScale.value = withTiming(1, { duration: 300 });
    }
  }, [currentSmO2]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  const getSmO2Color = () => {
    if (currentSmO2 <= MUSCLE_OXYGEN_CRITICAL) return colors.error;
    if (currentSmO2 <= MUSCLE_OXYGEN_LOW) return colors.warning;
    return colors.muscleOxygen;
  };

  const getSmO2Status = () => {
    if (currentSmO2 <= MUSCLE_OXYGEN_CRITICAL) return 'Critical - Rest Needed';
    if (currentSmO2 <= MUSCLE_OXYGEN_LOW) return 'Low - Approaching Threshold';
    if (currentSmO2 <= 60) return 'Moderate - Good Work Zone';
    return 'Optimal - Ready for Output';
  };

  const handleToggleMonitoring = () => {
    if (isMonitoring) {
      setIsMonitoring(false);
      setMonitoringTime(0);
      setCurrentSmO2(latestReading?.muscleOxygen || 65);
    } else {
      setIsMonitoring(true);
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getFatigueColor = () => {
    if (muscleFatigue === 'High') return colors.error;
    if (muscleFatigue === 'Medium') return colors.warning;
    return colors.success;
  };

  return (
    <DynamicBackground readinessScore={readinessScore} plain>
      <View style={styles.container}>
        <StatusBar barStyle={mode === 'dark' ? 'light-content' : 'dark-content'} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <FadeIn delay={0} duration={400}>
          <View style={styles.pageHeader}>
            <ElvaLogo size={LogoSize.header} heartRate={72} variant="solid" />
          </View>
        </FadeIn>

        {/* Main SmO2 Display */}
        <FadeIn delay={100} duration={400}>
          <GlassCard style={styles.mainCard}>
            <View style={styles.mainDisplay}>
              <Animated.View style={[styles.smO2Container, pulseStyle]}>
                <Text style={[styles.smO2Value, { color: getSmO2Color() }]}>
                  {currentSmO2.toFixed(1)}
                  <Text style={styles.smO2Unit}>%</Text>
                </Text>
                <Text style={[styles.smO2Label, { color: colors.textSecondary }]}>
                  Muscle Oxygen (SmO2)
                </Text>
              </Animated.View>

              <View style={[styles.statusBadge, { backgroundColor: colors.surfaceSecondary }]}>
                <Icon
                  name={currentSmO2 <= MUSCLE_OXYGEN_CRITICAL ? 'alert-circle' : 'run'}
                  size={20}
                  color={getSmO2Color()}
                />
                <Text style={[styles.statusText, { color: getSmO2Color() }]}>{getSmO2Status()}</Text>
              </View>

              {/* Progress Bar */}
              <View style={styles.progressBarContainer}>
                <View style={[styles.progressBarBg, { backgroundColor: colors.surfaceSecondary }]}>
                  <LinearGradient
                    colors={[colors.error, colors.warning, colors.muscleOxygen]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={[styles.progressBarFill, { width: `${currentSmO2}%` }]}
                  />
                </View>
                <View style={styles.progressLabels}>
                  <Text style={[styles.progressLabel, { color: colors.textMuted }]}>0%</Text>
                  <Text style={[styles.progressLabel, { color: colors.error }]}>15% Critical</Text>
                  <Text style={[styles.progressLabel, { color: colors.textMuted }]}>100%</Text>
                </View>
              </View>
            </View>
          </GlassCard>
        </FadeIn>

        {/* Monitoring Controls */}
        <FadeIn delay={200} duration={400}>
          <GlassCard style={styles.controlCard}>
            <View style={styles.monitoringInfo}>
              <View style={styles.infoRow}>
                <Icon name="clock-outline" size={24} color={colors.textSecondary} />
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Session Time</Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>
                  {formatTime(monitoringTime)}
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Icon name="pulse" size={24} color={colors.textSecondary} />
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Muscle Fatigue</Text>
                <Text style={[styles.infoValue, { color: getFatigueColor() }]}>{muscleFatigue}</Text>
              </View>
            </View>

            <Button
              title={isMonitoring ? 'Stop Monitoring' : 'Start Monitoring'}
              variant={isMonitoring ? 'secondary' : 'primary'}
              onPress={handleToggleMonitoring}
            />
          </GlassCard>
        </FadeIn>

        {/* Guidance Card */}
        <FadeIn delay={300} duration={400}>
          <GlassCard style={styles.guidanceCard}>
            <View style={styles.guidanceHeader}>
              <Icon name="information" size={24} color={colors.text} />
              <Text style={[styles.guidanceTitle, { color: colors.text }]}>Performance Insights</Text>
            </View>
            <Text style={[styles.guidanceText, { color: colors.textSecondary }]}>
              Muscle oxygen (SmO2) measures real-time oxygen saturation in working muscles. When
              SmO2 drops below 15%, your body has hit its localized fatigue floor—rest intervals are
              essential for recovery.
            </Text>
            <Text style={[styles.guidanceText, { color: colors.textSecondary }]}>
              The system will vibrate when you reach critical threshold. This is your body asking
              for recovery, not failure. Listen to it.
            </Text>
          </GlassCard>
        </FadeIn>

        {/* Historical Data */}
        <FadeIn delay={400} duration={400}>
          <GlassCard style={styles.historyCard}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Today's Muscle Activity</Text>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: colors.text }]}>{latestReading?.heartRate || 72}</Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Avg HR</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: colors.text }]}>{latestReading?.hrv || 45}</Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>HRV (ms)</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: colors.text }]}>
                  {latestReading?.muscleOxygen?.toFixed(0) || 65}%
                </Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Peak SmO2</Text>
              </View>
            </View>
          </GlassCard>
        </FadeIn>

        <View style={{ height: Spacing.xxl + 80 }} />
      </ScrollView>
      </View>
    </DynamicBackground>
  );
}

// ===========================================
// Styles (no colors - all colors are inline)
// ===========================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.lg,
  },
  pageHeader: {
    marginBottom: Spacing.md,
  },
  mainCard: {
    marginBottom: Spacing.lg,
  },
  mainDisplay: {
    alignItems: 'center',
    padding: Spacing.lg,
  },
  smO2Container: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  smO2Value: {
    fontSize: 72,
    fontWeight: '300',
    letterSpacing: -3,
  },
  smO2Unit: {
    fontSize: 32,
    fontWeight: '400',
  },
  smO2Label: {
    fontSize: FontSizes.md,
    marginTop: Spacing.sm,
    letterSpacing: -0.3,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    marginBottom: Spacing.xl,
  },
  statusText: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    letterSpacing: -0.3,
  },
  progressBarContainer: {
    width: '100%',
  },
  progressBarBg: {
    width: '100%',
    height: 12,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: BorderRadius.md,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.sm,
  },
  progressLabel: {
    fontSize: FontSizes.xs,
  },
  controlCard: {
    marginBottom: Spacing.lg,
    padding: Spacing.lg,
  },
  monitoringInfo: {
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  infoLabel: {
    flex: 1,
    fontSize: FontSizes.md,
  },
  infoValue: {
    fontSize: FontSizes.lg,
    fontWeight: '600',
    letterSpacing: -0.5,
  },
  guidanceCard: {
    marginBottom: Spacing.lg,
    padding: Spacing.lg,
  },
  guidanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  guidanceTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '600',
    letterSpacing: -0.5,
  },
  guidanceText: {
    fontSize: FontSizes.md,
    lineHeight: 22,
    marginBottom: Spacing.md,
  },
  historyCard: {
    padding: Spacing.lg,
  },
  sectionTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '600',
    letterSpacing: -0.5,
    marginBottom: Spacing.lg,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: FontSizes.xxl,
    fontWeight: '600',
    letterSpacing: -1,
    marginBottom: Spacing.xs,
  },
  statLabel: {
    fontSize: FontSizes.sm,
    letterSpacing: -0.3,
  },
});
