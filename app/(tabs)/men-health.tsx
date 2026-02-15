import React from 'react';
import { View, Text, StyleSheet, ScrollView, StatusBar } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Icon } from '@/components/ui/icon';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GlassCard, MetricCard } from '@/components/ui/cards';
import { CircularProgress, BarChart } from '@/components/ui/charts';
import { DynamicBackground } from '@/components/ui/dynamic-background';
import { ElvaLogo } from '@/components/ui/logo';
import { useApp } from '@/context/app-context';
import useTheme from '@/hooks/use-theme';
import { getRecoveryData, getTodayActivity } from '@/data/mock-data';
import { FontSizes, Spacing, BorderRadius, LogoSize, type ThemeColors } from '@/constants/theme';

export default function MenHealthScreen() {
  const insets = useSafeAreaInsets();
  const { latestReading, readinessScore } = useApp();
  const { mode, colors } = useTheme();
  const recovery = getRecoveryData();
  const activity = getTodayActivity();

  const strainLevel = Math.min(100, (activity.caloriesBurned / 500) * 100);
  const recoveryToStrainRatio =
    strainLevel > 0
      ? (recovery.recoveryScore / strainLevel).toFixed(2)
      : recovery.recoveryScore.toFixed(2);

  const stressLevel = latestReading?.stressLevel ?? 30;
  const metabolicEfficiency = Math.round(
    recovery.muscleRecovery * 0.4 + recovery.energyLevel * 0.3 + (100 - stressLevel) * 0.3
  );

  const getWorkoutRecommendation = () => {
    if (recovery.recoveryScore >= 80) {
      return {
        type: 'High Intensity',
        description: 'Your recovery-to-strain ratio is optimal. Conditions aligned for intensity.',
        exercises: ['Compound lifts', 'Sprint intervals', 'Full body workout'],
        color: colors.success,
      };
    } else if (recovery.recoveryScore >= 60) {
      return {
        type: 'Moderate Intensity',
        description: 'Your body is rebuilding. Think of this as a growth phase—focus on technique.',
        exercises: ['Isolation exercises', 'Steady cardio', 'Upper/Lower split'],
        color: colors.warning,
      };
    } else {
      return {
        type: 'Restorative',
        description: 'Your system is prioritizing internal recovery. Like winter, rest precedes spring.',
        exercises: ['Stretching', 'Walking', 'Yoga or mobility work'],
        color: colors.error,
      };
    }
  };

  const workout = getWorkoutRecommendation();

  const weeklyPerformance = [
    { label: 'Mon', value: 85 },
    { label: 'Tue', value: 78 },
    { label: 'Wed', value: 92 },
    { label: 'Thu', value: 70 },
    { label: 'Fri', value: 88 },
    { label: 'Sat', value: 65 },
    { label: 'Sun', value: 72 },
  ];

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
        <View style={styles.pageHeader}>
          <ElvaLogo size={LogoSize.header} heartRate={72} variant="solid" />
        </View>

        {/* Recovery Overview Card */}
        <Animated.View entering={FadeIn.delay(200)}>
          <GlassCard style={styles.recoveryCard}>
            <View style={styles.recoveryHeader}>
              <View style={styles.recoveryInfo}>
                <Text style={[styles.recoveryLabel, { color: colors.text }]}>Readiness Score</Text>
                <Text style={[styles.recoveryDescription, { color: colors.textSecondary }]}>
                  HRV, sleep quality, and strain analysis
                </Text>
              </View>
              <CircularProgress
                progress={recovery.readinessScore}
                size={90}
                strokeWidth={8}
                color={recovery.readinessScore >= 70 ? colors.success : colors.warning}
                showValue
                label="Ready"
              />
            </View>

            <View style={[styles.ratioContainer, { borderTopColor: colors.divider }]}>
              <View style={styles.ratioItem}>
                <Text style={[styles.ratioLabel, { color: colors.textSecondary }]}>
                  Recovery/Strain
                </Text>
                <Text
                  style={[
                    styles.ratioValue,
                    {
                      color:
                        parseFloat(recoveryToStrainRatio) >= 1 ? colors.success : colors.warning,
                    },
                  ]}
                >
                  {recoveryToStrainRatio}x
                </Text>
              </View>
              <View style={[styles.ratioDivider, { backgroundColor: colors.divider }]} />
              <View style={styles.ratioItem}>
                <Text style={[styles.ratioLabel, { color: colors.textSecondary }]}>
                  Metabolic Efficiency
                </Text>
                <Text
                  style={[
                    styles.ratioValue,
                    { color: metabolicEfficiency >= 70 ? colors.success : colors.warning },
                  ]}
                >
                  {metabolicEfficiency}%
                </Text>
              </View>
            </View>
          </GlassCard>
        </Animated.View>

        {/* Key Metrics Grid */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Performance Metrics</Text>
        <View style={styles.metricsGrid}>
          <MetricCard
            title="Muscle Recovery"
            value={recovery.muscleRecovery}
            unit="%"
            color={colors.recovery}
            icon={<Icon name="run" size={18} color={colors.recovery} />}
            delay={300}
            style={styles.metricCardHalf}
          />
          <MetricCard
            title="Energy Level"
            value={recovery.energyLevel}
            unit="%"
            color={colors.warning}
            icon={<Icon name="flash" size={18} color={colors.warning} />}
            delay={400}
            style={styles.metricCardHalf}
          />
        </View>

        {/* Workout Recommendation */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Today's Workout</Text>
        <GlassCard style={styles.workoutCard}>
          <View style={styles.workoutHeader}>
            <View style={[styles.workoutBadge, { backgroundColor: workout.color + '20' }]}>
              <Text style={[styles.workoutBadgeText, { color: workout.color }]}>{workout.type}</Text>
            </View>
          </View>
          <Text style={[styles.workoutDescription, { color: colors.textSecondary }]}>
            {workout.description}
          </Text>
          <Text style={[styles.exercisesTitle, { color: colors.textMuted }]}>Suggested Focus:</Text>
          <View style={styles.exercisesList}>
            {workout.exercises.map((exercise, index) => (
              <View key={index} style={styles.exerciseItem}>
                <View style={[styles.exerciseDot, { backgroundColor: workout.color }]} />
                <Text style={[styles.exerciseText, { color: colors.text }]}>{exercise}</Text>
              </View>
            ))}
          </View>
        </GlassCard>

        {/* Weekly Performance Chart */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Weekly Performance</Text>
        <GlassCard style={styles.chartCard}>
          <BarChart data={weeklyPerformance} barColor={colors.menHealth} height={120} />
          <Text style={[styles.chartCaption, { color: colors.textMuted }]}>
            Recovery scores over the past week
          </Text>
        </GlassCard>

        {/* Strength Goals */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Strength Goals</Text>
        <GlassCard style={styles.goalsCard}>
          <StrengthGoal exercise="Bench Press" current={80} target={100} unit="kg" colors={colors} />
          <StrengthGoal exercise="Squat" current={100} target={140} unit="kg" colors={colors} />
          <StrengthGoal exercise="Deadlift" current={120} target={160} unit="kg" colors={colors} />
        </GlassCard>

        {/* AI Recommendation */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>AI Coach Says</Text>
        <GlassCard style={styles.recommendationCard}>
          <View style={styles.recommendationHeader}>
            <View style={[styles.aiIcon, { backgroundColor: colors.surfaceSecondary }]}>
              <Text style={[styles.aiIconText, { color: colors.text }]}>E</Text>
            </View>
            <Text style={[styles.recommendationTitle, { color: colors.text }]}>
              Personalized Insight
            </Text>
          </View>
          <Text style={[styles.recommendationText, { color: colors.textSecondary }]}>
            {recovery.recoveryScore >= 70
              ? `Your recovery-to-strain ratio of ${recoveryToStrainRatio}x suggests your system is primed for output. HRV at ${latestReading?.hrv || 45}ms supports high-intensity work. Aim for 150g protein to fuel muscle synthesis.`
              : `Your metabolic efficiency is at ${metabolicEfficiency}%—your body is asking for gentler input. Think of this as winter: restorative movement serves you better than force. Prioritize deep sleep and hydration tonight.`}
          </Text>
        </GlassCard>

        <View style={styles.bottomSpacer} />
      </ScrollView>
      </View>
    </DynamicBackground>
  );
}

// ===========================================
// Helper Components
// ===========================================

interface StrengthGoalProps {
  exercise: string;
  current: number;
  target: number;
  unit: string;
  colors: ThemeColors;
}

const StrengthGoal: React.FC<StrengthGoalProps> = ({ exercise, current, target, unit, colors }) => {
  const progress = (current / target) * 100;

  return (
    <View style={styles.goalItem}>
      <View style={styles.goalHeader}>
        <Text style={[styles.goalExercise, { color: colors.text }]}>{exercise}</Text>
        <Text style={[styles.goalValues, { color: colors.textSecondary }]}>
          {current}
          {unit} / {target}
          {unit}
        </Text>
      </View>
      <View style={[styles.goalBar, { backgroundColor: colors.surfaceSecondary }]}>
        <View
          style={[
            styles.goalProgress,
            {
              width: `${Math.min(progress, 100)}%`,
              backgroundColor: progress >= 100 ? colors.success : colors.menHealth,
            },
          ]}
        />
      </View>
    </View>
  );
};

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
    paddingHorizontal: Spacing.lg,
    paddingBottom: 100,
  },
  pageHeader: {
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '600',
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  recoveryCard: {
    marginTop: Spacing.sm,
  },
  recoveryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  recoveryInfo: {
    flex: 1,
    marginRight: Spacing.md,
  },
  recoveryLabel: {
    fontSize: FontSizes.lg,
    fontWeight: '600',
    marginBottom: Spacing.xs,
  },
  recoveryDescription: {
    fontSize: FontSizes.sm,
    lineHeight: 20,
  },
  ratioContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginTop: Spacing.lg,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
  },
  ratioItem: {
    alignItems: 'center',
    flex: 1,
  },
  ratioLabel: {
    fontSize: FontSizes.xs,
    marginBottom: Spacing.xs,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  ratioValue: {
    fontSize: FontSizes.xxl,
    fontWeight: '700',
    letterSpacing: -1,
  },
  ratioDivider: {
    width: 1,
    height: 40,
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  metricCardHalf: {
    flex: 1,
  },
  workoutCard: {
    marginTop: Spacing.xs,
  },
  workoutHeader: {
    marginBottom: Spacing.sm,
  },
  workoutBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    alignSelf: 'flex-start',
  },
  workoutBadgeText: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
  },
  workoutDescription: {
    fontSize: FontSizes.md,
    lineHeight: 22,
    marginBottom: Spacing.md,
  },
  exercisesTitle: {
    fontSize: FontSizes.sm,
    marginBottom: Spacing.sm,
  },
  exercisesList: {
    gap: Spacing.sm,
  },
  exerciseItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  exerciseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: Spacing.sm,
  },
  exerciseText: {
    fontSize: FontSizes.md,
  },
  chartCard: {
    marginTop: Spacing.xs,
    paddingVertical: Spacing.lg,
  },
  chartCaption: {
    fontSize: FontSizes.xs,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
  goalsCard: {
    marginTop: Spacing.xs,
  },
  goalItem: {
    marginBottom: Spacing.md,
  },
  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  goalExercise: {
    fontSize: FontSizes.md,
    fontWeight: '500',
  },
  goalValues: {
    fontSize: FontSizes.sm,
  },
  goalBar: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  goalProgress: {
    height: '100%',
    borderRadius: 3,
  },
  recommendationCard: {
    marginTop: Spacing.xs,
  },
  recommendationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  aiIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  aiIconText: {
    fontSize: 14,
    fontWeight: '300',
  },
  recommendationTitle: {
    fontSize: FontSizes.md,
    fontWeight: '600',
  },
  recommendationText: {
    fontSize: FontSizes.md,
    lineHeight: 22,
  },
  bottomSpacer: {
    height: Spacing.xxl + 80,
  },
});
