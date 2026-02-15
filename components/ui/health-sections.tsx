/**
 * Health Sections — Physical Recovery, Mental Recovery, Stress Monitor, Health Span
 * Color-coded: green = good, amber = moderate, red = bad/high
 * Enhanced with extended bracelet simulator channels.
 */

import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Icon, type IconName } from '@/components/ui/icon';
import useTheme from '@/hooks/use-theme';
import { GlassCard } from './cards';

// ─── Helpers ───────────────────────────────────────

type HealthLevel = 'excellent' | 'good' | 'moderate' | 'low' | 'critical';

function getLevel(score: number): HealthLevel {
  if (score >= 85) return 'excellent';
  if (score >= 70) return 'good';
  if (score >= 50) return 'moderate';
  if (score >= 30) return 'low';
  return 'critical';
}

function getLevelColor(level: HealthLevel, colors: any): string {
  switch (level) {
    case 'excellent': return '#4CAF50';   // strong green
    case 'good':      return '#66BB6A';   // green
    case 'moderate':  return '#FF9800';   // amber
    case 'low':       return '#F44336';   // red
    case 'critical':  return '#D32F2F';   // darker red
    default:          return colors.textMuted;
  }
}

function getLevelLabel(level: HealthLevel): string {
  switch (level) {
    case 'excellent': return 'Excellent';
    case 'good':      return 'Good';
    case 'moderate':  return 'Moderate';
    case 'low':       return 'Low';
    case 'critical':  return 'Critical';
  }
}

/** High stress → red, low stress → green (inverted logic) */
function getStressLevel(stress: number): HealthLevel {
  if (stress <= 20) return 'excellent';
  if (stress <= 40) return 'good';
  if (stress <= 60) return 'moderate';
  if (stress <= 80) return 'low';
  return 'critical';
}

// ─── Animated score bar ────────────────────────────

interface ScoreBarProps {
  score: number;          // 0-100
  color: string;
  height?: number;
}

function ScoreBar({ score, color, height = 6 }: ScoreBarProps) {
  const { colors } = useTheme();
  const pct = Math.max(0, Math.min(100, score));

  return (
    <View style={[styles.barTrack, { height, backgroundColor: colors.surfaceSecondary }]}>
      <View
        style={[
          styles.barFill,
          {
            width: `${pct}%` as any,
            backgroundColor: color,
            height,
          },
        ]}
      />
    </View>
  );
}

// ─── Score Row ─────────────────────────────────────

interface ScoreRowProps {
  label: string;
  value: string | number;
  unit?: string;
  score: number;           // 0-100 for the bar
  color: string;
}

function ScoreRow({ label, value, unit, score, color }: ScoreRowProps) {
  const { colors } = useTheme();
  return (
    <View style={styles.scoreRow}>
      <View style={styles.scoreRowHeader}>
        <Text style={[styles.scoreLabel, { color: colors.textSecondary }]}>{label}</Text>
        <View style={styles.scoreValueRow}>
          <Text style={[styles.scoreValue, { color }]}>{value}</Text>
          {unit && <Text style={[styles.scoreUnit, { color: colors.textMuted }]}> {unit}</Text>}
        </View>
      </View>
      <ScoreBar score={score} color={color} />
    </View>
  );
}

// ─── Inline Metric ─────────────────────────────────

interface InlineMetricProps {
  icon: IconName;
  label: string;
  value: string | number;
  unit?: string;
  color: string;
}

function InlineMetric({ icon, label, value, unit, color }: InlineMetricProps) {
  const { colors } = useTheme();
  return (
    <View style={styles.inlineMetric}>
      <Icon name={icon} size={14} color={color} />
      <Text style={[styles.inlineLabel, { color: colors.textMuted }]}>{label}</Text>
      <Text style={[styles.inlineValue, { color }]}>{value}</Text>
      {unit && <Text style={[styles.inlineUnit, { color: colors.textMuted }]}>{unit}</Text>}
    </View>
  );
}

// ─── Section Header ────────────────────────────────

interface SectionHeaderProps {
  icon: IconName;
  title: string;
  score: number;
  accentColor: string;
}

function SectionHeader({ icon, title, score, accentColor }: SectionHeaderProps) {
  const { colors } = useTheme();
  const level = getLevel(score);
  const statusColor = getLevelColor(level, colors);

  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionTitleRow}>
        <Icon name={icon} size={20} color={accentColor} />
        <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
      </View>
      <View style={[styles.statusChip, { backgroundColor: statusColor + '20' }]}>
        <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
        <Text style={[styles.statusText, { color: statusColor }]}>
          {getLevelLabel(level)}
        </Text>
      </View>
    </View>
  );
}

// ─── Stress Section Header (inverted) ──────────────

function StressSectionHeader({ icon, title, stressLevel, accentColor }: {
  icon: IconName;
  title: string;
  stressLevel: number;
  accentColor: string;
}) {
  const { colors } = useTheme();
  const level = getStressLevel(stressLevel);
  const statusColor = getLevelColor(level, colors);

  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionTitleRow}>
        <Icon name={icon} size={20} color={accentColor} />
        <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
      </View>
      <View style={[styles.statusChip, { backgroundColor: statusColor + '20' }]}>
        <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
        <Text style={[styles.statusText, { color: statusColor }]}>
          {stressLevel <= 40 ? 'Low' : stressLevel <= 60 ? 'Moderate' : 'High'}
        </Text>
      </View>
    </View>
  );
}

// ─── Main Section Components ───────────────────────

export interface RecoveryData {
  hrv: number;
  restingHR: number;
  muscleOxygen: number;
  muscleFatigue: number;
  sleepScore: number;
  recoveryScore: number;
  // Extended from simulator
  respiratoryRate?: number;
  vo2Estimate?: number;
  hydrationLevel?: number;
  recoveryTimeMin?: number;
  trainingLoad?: number;
}

export function PhysicalRecoverySection({ data }: { data: RecoveryData }) {
  const { colors } = useTheme();
  const score = data.recoveryScore;
  const level = getLevel(score);
  const barColor = getLevelColor(level, colors);

  // Sub-scores with their own thresholds
  const hrvLevel = getLevel(Math.min(100, (data.hrv / 80) * 100));
  const muscleLevel = getLevel(data.muscleOxygen);
  const fatigueLevel = getStressLevel(data.muscleFatigue); // lower fatigue = better
  const sleepLevel = getLevel(data.sleepScore);

  // Extended data color coding
  const hydrationPct = data.hydrationLevel ?? 90;
  const hydrationLevel = getLevel(hydrationPct);
  const rrVal = data.respiratoryRate ?? 14;
  // RR 12-20 is normal → green; >25 → red
  const rrLevel: HealthLevel = rrVal <= 20 ? 'good' : rrVal <= 28 ? 'moderate' : 'low';
  const vo2Val = data.vo2Estimate ?? 4;
  // Contextual: higher VO2 during rest is odd, but we display raw
  const recoveryMin = data.recoveryTimeMin ?? 0;
  const trainingLoad = data.trainingLoad ?? 0;
  const loadLevel: HealthLevel = trainingLoad <= 30 ? 'good' : trainingLoad <= 60 ? 'moderate' : 'low';

  return (
    <GlassCard>
      <SectionHeader
        icon="human"
        title="Physical Recovery"
        score={score}
        accentColor={colors.physicalRecovery}
      />

      <View style={styles.overallRow}>
        <Text style={[styles.bigScore, { color: barColor }]}>{Math.round(score)}</Text>
        <Text style={[styles.bigScoreMax, { color: colors.textMuted }]}>/100</Text>
      </View>
      <ScoreBar score={score} color={barColor} height={8} />

      <View style={styles.breakdownGrid}>
        <ScoreRow
          label="HRV"
          value={Math.round(data.hrv)}
          unit="ms"
          score={Math.min(100, (data.hrv / 80) * 100)}
          color={getLevelColor(hrvLevel, colors)}
        />
        <ScoreRow
          label="Muscle O₂"
          value={Math.round(data.muscleOxygen)}
          unit="%"
          score={data.muscleOxygen}
          color={getLevelColor(muscleLevel, colors)}
        />
        <ScoreRow
          label="Muscle Fatigue"
          value={Math.round(data.muscleFatigue)}
          unit="%"
          score={100 - data.muscleFatigue}
          color={getLevelColor(fatigueLevel, colors)}
        />
        <ScoreRow
          label="Sleep Recovery"
          value={Math.round(data.sleepScore)}
          unit="%"
          score={data.sleepScore}
          color={getLevelColor(sleepLevel, colors)}
        />
        <ScoreRow
          label="Hydration"
          value={Math.round(hydrationPct)}
          unit="%"
          score={hydrationPct}
          color={getLevelColor(hydrationLevel, colors)}
        />
      </View>

      {/* Inline extended metrics */}
      <View style={[styles.inlineRow, { borderTopColor: colors.divider }]}>
        <InlineMetric icon="swap-vertical" label="RR" value={rrVal} unit="bpm" color={getLevelColor(rrLevel, colors)} />
        <InlineMetric icon="speedometer" label="VO₂" value={vo2Val.toFixed(1)} unit="ml/kg" color={colors.textSecondary} />
        <InlineMetric icon="dumbbell" label="Load" value={trainingLoad} unit="" color={getLevelColor(loadLevel, colors)} />
        {recoveryMin > 0 && <InlineMetric icon="clock" label="Recover" value={recoveryMin} unit="min" color={colors.textSecondary} />}
      </View>
    </GlassCard>
  );
}


export interface MentalRecoveryData {
  stressLevel: number;          // 0-100
  hrv: number;
  sleepQuality: number;         // 0-100  
  mentalScore: number;          // computed 0-100
  // Extended
  respiratoryRate?: number;
}

export function MentalRecoverySection({ data }: { data: MentalRecoveryData }) {
  const { colors } = useTheme();
  const score = data.mentalScore;
  const level = getLevel(score);
  const barColor = getLevelColor(level, colors);

  const stressInv = 100 - data.stressLevel;
  const stressVis = getStressLevel(data.stressLevel);
  const hrvLevel = getLevel(Math.min(100, (data.hrv / 80) * 100));
  const sleepLevel = getLevel(data.sleepQuality);
  const rrVal = data.respiratoryRate ?? 14;
  const rrLevel: HealthLevel = rrVal <= 20 ? 'good' : rrVal <= 28 ? 'moderate' : 'low';

  return (
    <GlassCard>
      <SectionHeader
        icon="leaf"
        title="Mental Recovery"
        score={score}
        accentColor={colors.mentalRecovery}
      />

      <View style={styles.overallRow}>
        <Text style={[styles.bigScore, { color: barColor }]}>{Math.round(score)}</Text>
        <Text style={[styles.bigScoreMax, { color: colors.textMuted }]}>/100</Text>
      </View>
      <ScoreBar score={score} color={barColor} height={8} />

      <View style={styles.breakdownGrid}>
        <ScoreRow
          label="Calm (inv. stress)"
          value={Math.round(stressInv)}
          unit="%"
          score={stressInv}
          color={getLevelColor(stressVis, colors)}
        />
        <ScoreRow
          label="HRV Balance"
          value={Math.round(data.hrv)}
          unit="ms"
          score={Math.min(100, (data.hrv / 80) * 100)}
          color={getLevelColor(hrvLevel, colors)}
        />
        <ScoreRow
          label="Sleep Quality"
          value={Math.round(data.sleepQuality)}
          unit="%"
          score={data.sleepQuality}
          color={getLevelColor(sleepLevel, colors)}
        />
      </View>

      <View style={[styles.inlineRow, { borderTopColor: colors.divider }]}>
        <InlineMetric icon="swap-vertical" label="Breath" value={rrVal} unit="bpm" color={getLevelColor(rrLevel, colors)} />
      </View>
    </GlassCard>
  );
}


export interface StressMonitorData {
  currentStress: number;        // 0-100
  avgStress: number;            // 0-100
  peakStress: number;           // 0-100
  hrv: number;
  heartRate: number;
  // Extended
  respiratoryRate?: number;
  skinTemperature?: number;
}

export function StressMonitorSection({ data }: { data: StressMonitorData }) {
  const { colors } = useTheme();
  const stressLvl = getStressLevel(data.currentStress);
  const stressColor = getLevelColor(stressLvl, colors);

  const avgLvl = getStressLevel(data.avgStress);
  const peakLvl = getStressLevel(data.peakStress);
  const rrVal = data.respiratoryRate ?? 14;
  const tempVal = data.skinTemperature ?? 36.5;

  return (
    <GlassCard>
      <StressSectionHeader
        icon="heart-pulse"
        title="Stress Monitor"
        stressLevel={data.currentStress}
        accentColor={colors.stressMonitor}
      />

      <View style={styles.overallRow}>
        <Text style={[styles.bigScore, { color: stressColor }]}>
          {Math.round(data.currentStress)}
        </Text>
        <Text style={[styles.bigScoreMax, { color: colors.textMuted }]}>/100</Text>
      </View>
      <ScoreBar score={data.currentStress} color={stressColor} height={8} />

      <View style={styles.stressGrid}>
        <View style={styles.stressItem}>
          <Text style={[styles.stressLabel, { color: colors.textMuted }]}>Average</Text>
          <Text style={[styles.stressValue, { color: getLevelColor(avgLvl, colors) }]}>
            {Math.round(data.avgStress)}
          </Text>
        </View>
        <View style={[styles.stressItem, styles.stressDivider, { borderColor: colors.divider }]}>
          <Text style={[styles.stressLabel, { color: colors.textMuted }]}>Peak</Text>
          <Text style={[styles.stressValue, { color: getLevelColor(peakLvl, colors) }]}>
            {Math.round(data.peakStress)}
          </Text>
        </View>
        <View style={styles.stressItem}>
          <Text style={[styles.stressLabel, { color: colors.textMuted }]}>HR</Text>
          <Text style={[styles.stressValue, { color: colors.heartRate }]}>
            {Math.round(data.heartRate)}
          </Text>
        </View>
        <View style={[styles.stressItem, styles.stressDivider, { borderColor: colors.divider }]}>
          <Text style={[styles.stressLabel, { color: colors.textMuted }]}>HRV</Text>
          <Text style={[styles.stressValue, { color: colors.hrv }]}>
            {Math.round(data.hrv)}
          </Text>
        </View>
      </View>

      {/* Extra vitals row */}
      <View style={[styles.inlineRow, { borderTopColor: colors.divider }]}>
        <InlineMetric icon="swap-vertical" label="RR" value={rrVal} unit="bpm" color={colors.textSecondary} />
        <InlineMetric icon="thermometer" label="Temp" value={tempVal.toFixed(1)} unit="°C" color={colors.textSecondary} />
      </View>
    </GlassCard>
  );
}


export interface HealthSpanData {
  overallScore: number;       // composite 0-100
  cardiovascular: number;     // 0-100
  musculoskeletal: number;    // 0-100
  metabolic: number;          // 0-100
  neurological: number;       // 0-100
  // Extended
  vo2Estimate?: number;
  lactateEstimate?: number;
  hydrationLevel?: number;
}

export function HealthSpanSection({ data }: { data: HealthSpanData }) {
  const { colors } = useTheme();
  const score = data.overallScore;
  const level = getLevel(score);
  const barColor = getLevelColor(level, colors);

  const pillars = [
    { label: 'Cardiovascular', value: data.cardiovascular, icon: 'heart' as const },
    { label: 'Musculoskeletal', value: data.musculoskeletal, icon: 'run' as const },
    { label: 'Metabolic', value: data.metabolic, icon: 'fire' as const },
    { label: 'Neurological', value: data.neurological, icon: 'lightbulb' as const },
  ];

  const vo2 = data.vo2Estimate ?? 0;
  const lactate = data.lactateEstimate ?? 0.8;
  // Lactate > 4 → red zone
  const lactateLvl: HealthLevel = lactate <= 2 ? 'good' : lactate <= 4 ? 'moderate' : 'low';
  const hydration = data.hydrationLevel ?? 90;
  const hydLvl = getLevel(hydration);

  return (
    <GlassCard>
      <SectionHeader
        icon="shimmer"
        title="Health Span"
        score={score}
        accentColor={colors.healthSpan}
      />

      <View style={styles.overallRow}>
        <Text style={[styles.bigScore, { color: barColor }]}>{Math.round(score)}</Text>
        <Text style={[styles.bigScoreMax, { color: colors.textMuted }]}>/100</Text>
      </View>
      <ScoreBar score={score} color={barColor} height={8} />

      <View style={styles.pillarGrid}>
        {pillars.map((p) => {
          const pLevel = getLevel(p.value);
          const pColor = getLevelColor(pLevel, colors);
          return (
            <View key={p.label} style={styles.pillarItem}>
              <View style={styles.pillarHeader}>
                <Icon name={p.icon} size={14} color={pColor} />
                <Text style={[styles.pillarLabel, { color: colors.textSecondary }]}>
                  {p.label}
                </Text>
              </View>
              <Text style={[styles.pillarValue, { color: pColor }]}>{Math.round(p.value)}</Text>
              <ScoreBar score={p.value} color={pColor} height={4} />
            </View>
          );
        })}
      </View>

      {/* Extended bio-markers */}
      <View style={[styles.inlineRow, { borderTopColor: colors.divider }]}>
        {vo2 > 0 && <InlineMetric icon="speedometer" label="VO₂" value={vo2.toFixed(1)} unit="ml/kg" color={colors.textSecondary} />}
        <InlineMetric icon="water-outline" label="Lactate" value={lactate.toFixed(1)} unit="mmol" color={getLevelColor(lactateLvl, colors)} />
        <InlineMetric icon="beaker-outline" label="Hydration" value={Math.round(hydration)} unit="%" color={getLevelColor(hydLvl, colors)} />
      </View>
    </GlassCard>
  );
}

// ─── Styles ────────────────────────────────────────

const styles = StyleSheet.create({
  // Bar
  barTrack: {
    width: '100%',
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: {
    borderRadius: 4,
  },

  // Score row
  scoreRow: {
    gap: 4,
    paddingVertical: 6,
  },
  scoreRowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  scoreLabel: {
    fontSize: 13,
  },
  scoreValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  scoreValue: {
    fontSize: 15,
    fontWeight: '600',
  },
  scoreUnit: {
    fontSize: 11,
  },

  // Inline metric row
  inlineRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  inlineMetric: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  inlineLabel: {
    fontSize: 11,
  },
  inlineValue: {
    fontSize: 13,
    fontWeight: '600',
  },
  inlineUnit: {
    fontSize: 10,
  },

  // Section header
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 5,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // Overall score
  overallRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  bigScore: {
    fontSize: 36,
    fontWeight: '700',
  },
  bigScoreMax: {
    fontSize: 16,
    fontWeight: '400',
    marginLeft: 2,
  },

  // Breakdown grid
  breakdownGrid: {
    marginTop: 12,
    gap: 2,
  },

  // Stress grid
  stressGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 16,
  },
  stressItem: {
    width: '50%',
    alignItems: 'center',
    paddingVertical: 10,
  },
  stressDivider: {
    borderLeftWidth: 1,
  },
  stressLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  stressValue: {
    fontSize: 20,
    fontWeight: '700',
  },

  // Pillar grid
  pillarGrid: {
    marginTop: 16,
    gap: 12,
  },
  pillarItem: {
    gap: 4,
  },
  pillarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pillarLabel: {
    fontSize: 13,
    flex: 1,
  },
  pillarValue: {
    fontSize: 15,
    fontWeight: '600',
  },
});
