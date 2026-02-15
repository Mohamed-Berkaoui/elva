/**
 * Recovery Detail Page
 * Deep-dive into recovery status, strain analysis,
 * injury prevention, and recovery recommendations.
 */

import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions, Pressable } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Icon, type IconName } from '@/components/ui/icon';
import { NatureHeader } from '@/components/ui/nature-header';
import { GlassCard } from '@/components/ui/cards';
import { CircularProgress } from '@/components/ui/charts';
import { useApp } from '@/context/app-context';
import useTheme from '@/hooks/use-theme';
import { FontSizes, Spacing, type ThemeColors } from '@/constants/theme';
import { getRecoveryData, getTodayActivity } from '@/data/mock-data';

const { width } = Dimensions.get('window');

export default function RecoveryDetailScreen() {
  const { latestReading, readinessScore } = useApp();
  const { colors } = useTheme();
  const params = useLocalSearchParams<{ date?: string }>();
  const recovery = getRecoveryData();
  const activity = getTodayActivity();

  // ── Date navigation ──
  const [selectedDate, setSelectedDate] = useState(() => {
    if (params.date) { try { return new Date(params.date); } catch {} }
    return new Date();
  });
  const shiftDate = useCallback((dir: number) => {
    setSelectedDate(prev => {
      const d = new Date(prev);
      d.setDate(d.getDate() + dir);
      if (d > new Date()) return prev;
      return d;
    });
  }, []);
  const fmtDate = (d: Date) => {
    const now = new Date();
    if (d.toDateString() === now.toDateString()) return 'Today';
    const y = new Date(now); y.setDate(y.getDate() - 1);
    if (d.toDateString() === y.toDateString()) return 'Yesterday';
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };
  const isToday = selectedDate.toDateString() === new Date().toDateString();

  // Date-based data variance
  const dayOffset = Math.floor((new Date().getTime() - selectedDate.getTime()) / 86400000);
  const seed = (selectedDate.getDay() + 1) * 17 + dayOffset * 11;
  const jitter = (base: number, range: number) => Math.round(base + ((seed % (range * 2 + 1)) - range));

  const hr = jitter(latestReading?.heartRate || 68, 5);
  const hrv = jitter(latestReading?.hrv || 48, 8);
  const stress = jitter(latestReading?.stressLevel || 30, 10);
  const smo2 = jitter(latestReading?.muscleOxygen || 65, 6);
  const hydration = jitter(latestReading?.hydrationLevel || 85, 8);
  const trainingLoad = jitter(latestReading?.trainingLoad || 0, 10);
  const recoveryTime = jitter(latestReading?.recoveryTimeMin || 0, 20);
  const fatigue = (() => {
    const f = latestReading?.muscleFatigue || 'Low';
    return jitter(recovery.recoveryScore, 10) >= 70 ? 'Low' : jitter(recovery.recoveryScore, 10) >= 50 ? 'Medium' : 'High';
  })();

  const strainLevel = Math.min(100, (activity.caloriesBurned / 500) * 100);
  const recoveryToStrainRatio =
    strainLevel > 0
      ? parseFloat((recovery.recoveryScore / strainLevel).toFixed(2))
      : recovery.recoveryScore;

  const fatigueNum = fatigue === 'Low' ? 20 : fatigue === 'Medium' ? 50 : 80;
  const muscleScore = Math.round(smo2);
  const recoveryPct = jitter(recovery.recoveryScore, 10);

  const getScoreColor = (score: number) => {
    if (score >= 80) return '#4CAF50';
    if (score >= 60) return '#FF9800';
    return '#F44336';
  };

  const getRecoveryStatus = () => {
    if (recoveryPct >= 85) return { label: 'Fully Recovered', desc: 'Your body is fully recovered. Training at high intensity is safe.', color: '#4CAF50' };
    if (recoveryPct >= 70) return { label: 'Well Recovered', desc: 'Good recovery. Moderate to high intensity is fine.', color: '#66BB6A' };
    if (recoveryPct >= 50) return { label: 'Partial Recovery', desc: 'Still recovering. Light activity recommended.', color: '#FF9800' };
    return { label: 'Needs Rest', desc: 'Your body needs rest. Focus on sleep and nutrition.', color: '#F44336' };
  };

  const status = getRecoveryStatus();

  // Injury risk factors
  const injuryRisk = (() => {
    let risk = 0;
    if (fatigueNum > 60) risk += 30;
    else if (fatigueNum > 40) risk += 15;
    if (trainingLoad > 70) risk += 25;
    else if (trainingLoad > 40) risk += 10;
    if (hrv < 35) risk += 20;
    else if (hrv < 50) risk += 10;
    if (hydration < 60) risk += 15;
    else if (hydration < 75) risk += 5;
    if (stress > 60) risk += 10;
    return Math.min(100, risk);
  })();

  const getInjuryRiskLabel = () => {
    if (injuryRisk < 25) return { label: 'Low Risk', color: '#4CAF50' };
    if (injuryRisk < 50) return { label: 'Moderate Risk', color: '#FF9800' };
    return { label: 'High Risk', color: '#F44336' };
  };

  const injuryLabel = getInjuryRiskLabel();

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <ScrollView bounces={false} showsVerticalScrollIndicator={false}>
        <NatureHeader
          title="Recovery"
          subtitle="Strain analysis & injury prevention"
          variant="recovery"
          icon="heart-pulse"
        />

        <View style={styles.content}>
          {/* ═══ Date Navigation ═══ */}
          <View style={[styles.dateBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Pressable onPress={() => shiftDate(-1)} hitSlop={12}>
              <Icon name="chevron-left" size={22} color={colors.textMuted} />
            </Pressable>
            <View style={styles.dateCenter}>
              <Text style={[styles.dateText, { color: colors.text }]}>{fmtDate(selectedDate)}</Text>
              <Text style={[styles.dateSub, { color: colors.textMuted }]}>
                {selectedDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </Text>
            </View>
            <Pressable onPress={() => shiftDate(1)} hitSlop={12} style={{ opacity: isToday ? 0.25 : 1 }} disabled={isToday}>
              <Icon name="chevron-right" size={22} color={colors.textMuted} />
            </Pressable>
          </View>

          {/* Recovery Score Hero */}
          <GlassCard style={styles.heroCard}>
            <View style={styles.heroRow}>
              <View style={styles.heroLeft}>
                <Text style={[styles.heroLabel, { color: colors.textSecondary }]}>Recovery Score</Text>
                <Text style={[styles.heroValue, { color: getScoreColor(recoveryPct) }]}>
                  {recoveryPct}
                  <Text style={styles.heroUnit}>%</Text>
                </Text>
                <View style={[styles.statusBadge, { backgroundColor: status.color + '20' }]}>
                  <Text style={[styles.statusBadgeText, { color: status.color }]}>{status.label}</Text>
                </View>
              </View>
              <CircularProgress
                progress={recoveryPct}
                size={110}
                strokeWidth={10}
                color={getScoreColor(recoveryPct)}
                showValue={true}
              />
            </View>
            <Text style={[styles.statusDesc, { color: colors.textSecondary }]}>{status.desc}</Text>
          </GlassCard>

          {/* Strain Analysis */}
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Strain Analysis</Text>
          <GlassCard style={styles.strainCard}>
            <View style={styles.strainRow}>
              <StrainMetric
                label="Daily Strain"
                value={Math.round(strainLevel)}
                unit="%"
                color={strainLevel > 70 ? '#F44336' : strainLevel > 40 ? '#FF9800' : '#4CAF50'}
                colors={colors}
              />
              <StrainMetric
                label="Training Load"
                value={Math.round(trainingLoad)}
                unit="a.u."
                color={trainingLoad > 70 ? '#F44336' : trainingLoad > 30 ? '#FF9800' : '#4CAF50'}
                colors={colors}
              />
              <StrainMetric
                label="Ratio"
                value={recoveryToStrainRatio}
                unit="R/S"
                color={recoveryToStrainRatio >= 1 ? '#4CAF50' : '#FF9800'}
                colors={colors}
              />
            </View>

            <View style={[styles.strainBar, { backgroundColor: colors.surfaceSecondary }]}>
              <View style={[styles.strainBarFill, { width: `${Math.min(100, strainLevel)}%`, backgroundColor: strainLevel > 70 ? '#F44336' : strainLevel > 40 ? '#FF9800' : '#4CAF50' }]} />
            </View>
            <View style={styles.strainLabels}>
              <Text style={[styles.strainLabelText, { color: colors.textMuted }]}>Low Strain</Text>
              <Text style={[styles.strainLabelText, { color: colors.textMuted }]}>High Strain</Text>
            </View>
          </GlassCard>

          {/* Recovery Metrics */}
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Recovery Metrics</Text>
          <GlassCard style={styles.metricsCard}>
            <RecoveryRow label="Muscle Recovery" value={`${recovery.muscleRecovery}%`} icon="run" color={getScoreColor(recovery.muscleRecovery)} colors={colors} />
            <RecoveryRow label="Energy Level" value={`${recovery.energyLevel}%`} icon="flash" color={getScoreColor(recovery.energyLevel)} colors={colors} />
            <RecoveryRow label="HRV Recovery" value={`${hrv} ms`} icon="pulse" color={hrv >= 45 ? '#4CAF50' : '#FF9800'} colors={colors} />
            <RecoveryRow label="Resting HR" value={`${hr} bpm`} icon="heart" color={hr <= 65 ? '#4CAF50' : '#FF9800'} colors={colors} />
            <RecoveryRow label="Hydration" value={`${Math.round(hydration)}%`} icon="water-outline" color={hydration >= 70 ? '#4CAF50' : '#FF9800'} colors={colors} />
            <RecoveryRow label="Muscle Fatigue" value={fatigue} icon="dumbbell" color={fatigueNum <= 30 ? '#4CAF50' : fatigueNum <= 60 ? '#FF9800' : '#F44336'} colors={colors} />
          </GlassCard>

          {/* Injury Prevention */}
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Injury Prevention</Text>
          <GlassCard style={styles.injuryCard}>
            <View style={styles.injuryHeader}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.injuryLabel, { color: colors.textSecondary }]}>Injury Risk Score</Text>
                <Text style={[styles.injuryValue, { color: injuryLabel.color }]}>{injuryRisk}%</Text>
                <View style={[styles.injuryBadge, { backgroundColor: injuryLabel.color + '20' }]}>
                  <Text style={[styles.injuryBadgeText, { color: injuryLabel.color }]}>{injuryLabel.label}</Text>
                </View>
              </View>
              <CircularProgress
                progress={100 - injuryRisk}
                size={80}
                strokeWidth={8}
                color={injuryLabel.color}
                showValue={true}
              />
            </View>

            <View style={[styles.riskFactors, { borderTopColor: colors.divider }]}>
              <Text style={[styles.riskTitle, { color: colors.text }]}>Risk Factors</Text>
              <RiskFactor label="Muscle Fatigue" level={fatigueNum > 60 ? 'high' : fatigueNum > 40 ? 'moderate' : 'low'} colors={colors} />
              <RiskFactor label="Training Load" level={trainingLoad > 70 ? 'high' : trainingLoad > 40 ? 'moderate' : 'low'} colors={colors} />
              <RiskFactor label="HRV Status" level={hrv < 35 ? 'high' : hrv < 50 ? 'moderate' : 'low'} colors={colors} />
              <RiskFactor label="Hydration" level={hydration < 60 ? 'high' : hydration < 75 ? 'moderate' : 'low'} colors={colors} />
              <RiskFactor label="Stress Impact" level={stress > 60 ? 'high' : stress > 40 ? 'moderate' : 'low'} colors={colors} />
            </View>
          </GlassCard>

          {/* Recommendations */}
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Recommendations</Text>
          <GlassCard style={styles.recsCard}>
            {recoveryPct >= 70 ? (
              <>
                <RecItem icon="check-circle" text="Recovery looks good — moderate-to-high activity is safe" color="#4CAF50" colors={colors} />
                <RecItem icon="water-outline" text={`Hydration at ${Math.round(hydration)}% — ${hydration > 80 ? 'optimal' : 'keep drinking'}`} color="#42A5F5" colors={colors} />
                <RecItem icon="run" text="Muscle oxygen supports training output" color="#66BB6A" colors={colors} />
              </>
            ) : recoveryPct >= 50 ? (
              <>
                <RecItem icon="alert-circle" text="Partial recovery — prioritize light activity" color="#FF9800" colors={colors} />
                <RecItem icon="bed-outline" text="Aim for 7-8 hours of quality sleep tonight" color="#7986CB" colors={colors} />
                <RecItem icon="leaf" text="Stretching, yoga, or foam rolling recommended" color="#66BB6A" colors={colors} />
              </>
            ) : (
              <>
                <RecItem icon="close-circle" text="Recovery is low — rest is your priority" color="#F44336" colors={colors} />
                <RecItem icon="nutrition" text="Focus on protein-rich nutrition and hydration" color="#42A5F5" colors={colors} />
                <RecItem icon="bed-outline" text="Extended sleep critical for muscle repair" color="#7986CB" colors={colors} />
              </>
            )}
          </GlassCard>

          {/* Recovery Timeline */}
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Estimated Recovery</Text>
          <GlassCard style={styles.timelineCard}>
            <View style={styles.timelineRow}>
              <Icon name="clock-outline" size={22} color={colors.textSecondary} />
              <View style={styles.timelineInfo}>
                <Text style={[styles.timelineValue, { color: colors.text }]}>
                  {recoveryTime > 120 ? `${Math.round(recoveryTime / 60)}h ${recoveryTime % 60}m` : `${Math.round(recoveryTime)} min`}
                </Text>
                <Text style={[styles.timelineLabel, { color: colors.textMuted }]}>Until full recovery</Text>
              </View>
              <View style={[styles.timelineBadge, { backgroundColor: recoveryTime > 120 ? '#FF9800' + '20' : '#4CAF50' + '20' }]}>
                <Text style={[styles.timelineBadgeText, { color: recoveryTime > 120 ? '#FF9800' : '#4CAF50' }]}>
                  {recoveryTime > 120 ? 'Extended' : 'Normal'}
                </Text>
              </View>
            </View>
          </GlassCard>

          <View style={{ height: 40 }} />
        </View>
      </ScrollView>
    </View>
  );
}

// ── Sub-components ──

const StrainMetric = ({ label, value, unit, color, colors }: { label: string; value: number; unit: string; color: string; colors: ThemeColors }) => (
  <View style={styles.strainMetric}>
    <Text style={[styles.strainMetricValue, { color }]}>{value}<Text style={[styles.strainMetricUnit, { color: colors.textMuted }]}> {unit}</Text></Text>
    <Text style={[styles.strainMetricLabel, { color: colors.textMuted }]}>{label}</Text>
  </View>
);

const RecoveryRow = ({ label, value, icon, color, colors }: { label: string; value: string; icon: IconName; color: string; colors: ThemeColors }) => (
  <View style={styles.recoveryRow}>
    <View style={[styles.recoveryIcon, { backgroundColor: color + '15' }]}>
      <Icon name={icon} size={16} color={color} />
    </View>
    <Text style={[styles.recoveryLabel, { color: colors.text }]}>{label}</Text>
    <Text style={[styles.recoveryValue, { color }]}>{value}</Text>
  </View>
);

const RiskFactor = ({ label, level, colors }: { label: string; level: 'low' | 'moderate' | 'high'; colors: ThemeColors }) => {
  const color = level === 'low' ? '#4CAF50' : level === 'moderate' ? '#FF9800' : '#F44336';
  return (
    <View style={styles.riskRow}>
      <View style={[styles.riskDot, { backgroundColor: color }]} />
      <Text style={[styles.riskLabel, { color: colors.text }]}>{label}</Text>
      <View style={[styles.riskBadge, { backgroundColor: color + '20' }]}>
        <Text style={[styles.riskBadgeText, { color }]}>{level.charAt(0).toUpperCase() + level.slice(1)}</Text>
      </View>
    </View>
  );
};

const RecItem = ({ icon, text, color, colors }: { icon: IconName; text: string; color: string; colors: ThemeColors }) => (
  <View style={styles.recRow}>
    <Icon name={icon} size={20} color={color} />
    <Text style={[styles.recText, { color: colors.text }]}>{text}</Text>
  </View>
);

// ── Styles ──

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg },

  // Date navigation bar
  dateBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 16, borderWidth: 1, marginBottom: Spacing.md },
  dateCenter: { alignItems: 'center' },
  dateText: { fontSize: FontSizes.md, fontWeight: '700' },
  dateSub: { fontSize: 11, marginTop: 2 },

  heroCard: { marginBottom: Spacing.md },
  heroRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  heroLeft: {},
  heroLabel: { fontSize: FontSizes.sm, marginBottom: 4 },
  heroValue: { fontSize: 52, fontWeight: '300', letterSpacing: -2 },
  heroUnit: { fontSize: 22, fontWeight: '400' },
  statusBadge: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, marginTop: 8, alignSelf: 'flex-start' },
  statusBadgeText: { fontSize: FontSizes.sm, fontWeight: '600' },
  statusDesc: { fontSize: FontSizes.sm, marginTop: Spacing.md, lineHeight: 20 },

  sectionTitle: { fontSize: FontSizes.lg, fontWeight: '700', marginBottom: Spacing.md, marginTop: Spacing.lg, letterSpacing: -0.3 },

  strainCard: { marginBottom: Spacing.md },
  strainRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: Spacing.lg },
  strainMetric: { alignItems: 'center' },
  strainMetricValue: { fontSize: 24, fontWeight: '600' },
  strainMetricUnit: { fontSize: FontSizes.sm },
  strainMetricLabel: { fontSize: 11, marginTop: 4 },
  strainBar: { height: 10, borderRadius: 6, overflow: 'hidden', marginBottom: 4 },
  strainBarFill: { height: '100%', borderRadius: 6 },
  strainLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  strainLabelText: { fontSize: 10 },

  metricsCard: { marginBottom: Spacing.md, gap: 14 },
  recoveryRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  recoveryIcon: { width: 32, height: 32, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  recoveryLabel: { flex: 1, fontSize: FontSizes.md, fontWeight: '500' },
  recoveryValue: { fontSize: FontSizes.md, fontWeight: '700' },

  injuryCard: { marginBottom: Spacing.md },
  injuryHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.md },
  injuryLabel: { fontSize: FontSizes.sm, marginBottom: 4 },
  injuryValue: { fontSize: 36, fontWeight: '300', letterSpacing: -1 },
  injuryBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 14, marginTop: 6, alignSelf: 'flex-start' },
  injuryBadgeText: { fontSize: 12, fontWeight: '600' },
  riskFactors: { borderTopWidth: 1, paddingTop: Spacing.md, gap: 10 },
  riskTitle: { fontSize: FontSizes.md, fontWeight: '600', marginBottom: 4 },
  riskRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  riskDot: { width: 8, height: 8, borderRadius: 4 },
  riskLabel: { flex: 1, fontSize: FontSizes.md },
  riskBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  riskBadgeText: { fontSize: 11, fontWeight: '600' },

  recsCard: { marginBottom: Spacing.md, gap: 14 },
  recRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  recText: { flex: 1, fontSize: FontSizes.md, lineHeight: 20 },

  timelineCard: { marginBottom: Spacing.md },
  timelineRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  timelineInfo: { flex: 1 },
  timelineValue: { fontSize: FontSizes.xl, fontWeight: '600' },
  timelineLabel: { fontSize: 12, marginTop: 2 },
  timelineBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 14 },
  timelineBadgeText: { fontSize: 12, fontWeight: '600' },
});
