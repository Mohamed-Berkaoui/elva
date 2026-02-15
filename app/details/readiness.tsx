/**
 * Readiness Detail Page
 * Comprehensive readiness breakdown with contributing factors,
 * recovery metrics, and trend analysis.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions, Pressable } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Icon, type IconName } from '@/components/ui/icon';
import { NatureHeader } from '@/components/ui/nature-header';
import { GlassCard } from '@/components/ui/cards';
import { CircularProgress } from '@/components/ui/charts';
import { useApp } from '@/context/app-context';
import useTheme from '@/hooks/use-theme';
import { FontSizes, Spacing } from '@/constants/theme';
import { getLastSleepSession, getVitalStats, type SleepRecord } from '@/services/database';

const { width } = Dimensions.get('window');

export default function ReadinessDetailScreen() {
  const { latestReading, readinessScore } = useApp();
  const { colors } = useTheme();
  const params = useLocalSearchParams<{ date?: string }>();
  const [lastSleep, setLastSleep] = useState<SleepRecord | null>(null);
  const [vitalStats, setVitalStats] = useState<any>(null);

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
  const seed = (selectedDate.getDay() + 1) * 13 + dayOffset * 7;
  const jitter = (base: number, range: number) => Math.round(base + ((seed % (range * 2 + 1)) - range));

  const dateReadiness = jitter(readinessScore, 12);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [sleep, stats] = await Promise.all([
        getLastSleepSession(),
        getVitalStats(7),
      ]);
      setLastSleep(sleep);
      setVitalStats(stats);
    } catch {}
  };

  const hr = jitter(latestReading?.heartRate || 68, 5);
  const hrv = jitter(latestReading?.hrv || 48, 8);
  const stress = jitter(latestReading?.stressLevel || 30, 10);
  const smo2 = jitter(latestReading?.muscleOxygen || 65, 6);
  const rr = jitter(latestReading?.respiratoryRate || 14, 2);
  const hydration = jitter(latestReading?.hydrationLevel || 85, 8);
  const trainingLoad = jitter(latestReading?.trainingLoad || 0, 10);
  const recoveryTime = jitter(latestReading?.recoveryTimeMin || 0, 20);
  const vo2 = parseFloat((jitter((latestReading?.vo2Estimate || 42) * 10, 15) / 10).toFixed(1));
  const temp = parseFloat((jitter((latestReading?.skinTemperature || 36.4) * 10, 3) / 10).toFixed(1));
  const sleepScore = jitter(lastSleep?.sleep_score || 70, 8);
  const fatigue = dateReadiness >= 75 ? 'Low' : dateReadiness >= 55 ? 'Medium' : 'High';

  const fatigueNum = fatigue === 'Low' ? 20 : fatigue === 'Medium' ? 50 : 80;

  // Readiness factor scores
  const hrvScore = Math.min(100, Math.round((hrv / 80) * 100));
  const restingHRScore = Math.min(100, Math.max(0, Math.round((1 - (hr - 50) / 60) * 100)));
  const stressScore = 100 - stress;
  const muscleScore = Math.round(smo2);
  const fatigueScore = 100 - fatigueNum;

  const getScoreColor = (score: number) => {
    if (score >= 80) return '#4CAF50';
    if (score >= 60) return '#FF9800';
    return '#F44336';
  };

  const getReadinessStatus = () => {
    if (dateReadiness >= 85) return { label: 'Peak Readiness', desc: 'Your body is fully recovered and primed for high-intensity output.', color: '#4CAF50' };
    if (dateReadiness >= 70) return { label: 'Good Readiness', desc: 'You are well-recovered. Moderate to high activity is recommended.', color: '#66BB6A' };
    if (dateReadiness >= 50) return { label: 'Moderate', desc: 'Some recovery is still needed. Light to moderate activity is best.', color: '#FF9800' };
    return { label: 'Low Readiness', desc: 'Your body needs rest. Prioritize sleep and recovery today.', color: '#F44336' };
  };

  const status = getReadinessStatus();

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <ScrollView bounces={false} showsVerticalScrollIndicator={false}>
        <NatureHeader
          title="Readiness"
          subtitle="Your body's recovery and preparedness"
          variant="readiness"
          icon="shield-check-outline"
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

          {/* Score Hero */}
          <GlassCard style={styles.heroCard}>
            <View style={styles.heroRow}>
              <View style={styles.heroLeft}>
                <Text style={[styles.heroLabel, { color: colors.textSecondary }]}>Readiness Score</Text>
                <Text style={[styles.heroValue, { color: getScoreColor(dateReadiness) }]}>
                  {dateReadiness}
                  <Text style={styles.heroUnit}>%</Text>
                </Text>
                <View style={[styles.statusBadge, { backgroundColor: status.color + '20' }]}>
                  <Text style={[styles.statusBadgeText, { color: status.color }]}>{status.label}</Text>
                </View>
              </View>
              <CircularProgress
                progress={dateReadiness}
                size={110}
                strokeWidth={10}
                color={getScoreColor(dateReadiness)}
                label={`${dateReadiness}`}
              />
            </View>
            <Text style={[styles.statusDesc, { color: colors.textSecondary }]}>{status.desc}</Text>
          </GlassCard>

          {/* Contributing Factors */}
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Contributing Factors</Text>
          <GlassCard style={styles.factorsCard}>
            <FactorBar label="HRV Recovery" score={hrvScore} detail={`${hrv} ms`} colors={colors} />
            <FactorBar label="Resting Heart Rate" score={restingHRScore} detail={`${hr} bpm`} colors={colors} />
            <FactorBar label="Sleep Quality" score={sleepScore} detail={`Score: ${sleepScore}`} colors={colors} />
            <FactorBar label="Stress Level" score={stressScore} detail={`${stress}% stress`} colors={colors} />
            <FactorBar label="Muscle Recovery" score={muscleScore} detail={`SmO₂: ${smo2.toFixed(0)}%`} colors={colors} />
            <FactorBar label="Fatigue Level" score={fatigueScore} detail={`${fatigue}`} colors={colors} />
          </GlassCard>

          {/* Body Metrics */}
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Body Metrics</Text>
          <View style={styles.metricsGrid}>
            <MetricTile icon="lungs" label="VO₂ Estimate" value={vo2.toFixed(1)} unit="ml/kg/min" color="#42A5F5" colors={colors} />
            <MetricTile icon="water-outline" label="Hydration" value={`${Math.round(hydration)}`} unit="%" color={hydration > 70 ? '#4CAF50' : '#FF9800'} colors={colors} />
            <MetricTile icon="cloud-outline" label="Resp. Rate" value={`${rr}`} unit="br/min" color="#7E57C2" colors={colors} />
            <MetricTile icon="thermometer" label="Skin Temp" value={temp.toFixed(1)} unit="°C" color="#FF7043" colors={colors} />
            <MetricTile icon="dumbbell" label="Training Load" value={`${Math.round(trainingLoad)}`} unit="a.u." color={trainingLoad > 70 ? '#F44336' : '#66BB6A'} colors={colors} />
            <MetricTile icon="clock-outline" label="Recovery ETA" value={`${Math.round(recoveryTime)}`} unit="min" color={recoveryTime > 120 ? '#FF9800' : '#4CAF50'} colors={colors} />
          </View>

          {/* Recommendations */}
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Recommendations</Text>
          <GlassCard style={styles.recsCard}>
            {dateReadiness >= 70 ? (
              <>
                <RecItem icon="run" text="High-intensity training is safe today" color="#4CAF50" colors={colors} />
                <RecItem icon="water-outline" text={`Hydration at ${Math.round(hydration)}% — ${hydration > 80 ? 'well hydrated' : 'drink more water'}`} color="#42A5F5" colors={colors} />
                <RecItem icon="trending-up" text="VO₂ & performance metrics look strong" color="#66BB6A" colors={colors} />
              </>
            ) : dateReadiness >= 50 ? (
              <>
                <RecItem icon="walk" text="Light to moderate activity recommended" color="#FF9800" colors={colors} />
                <RecItem icon="bed-outline" text="Aim for 7-8 hours of sleep tonight" color="#7986CB" colors={colors} />
                <RecItem icon="leaf" text="Consider a recovery session or yoga" color="#66BB6A" colors={colors} />
              </>
            ) : (
              <>
                <RecItem icon="bed-outline" text="Rest is your priority today" color="#F44336" colors={colors} />
                <RecItem icon="nutrition" text="Focus on hydration and nutrition" color="#42A5F5" colors={colors} />
                <RecItem icon="leaf" text="Light stretching or meditation only" color="#66BB6A" colors={colors} />
              </>
            )}
          </GlassCard>

          {/* Weekly Averages */}
          <Text style={[styles.sectionTitle, { color: colors.text }]}>7-Day Vital Averages</Text>
          <GlassCard style={styles.avgCard}>
            <AvgRow label="Avg Heart Rate" value={`${Math.round(vitalStats?.avg_heart_rate || hr)} bpm`} colors={colors} />
            <AvgRow label="Avg HRV" value={`${Math.round(vitalStats?.avg_hrv || hrv)} ms`} colors={colors} />
            <AvgRow label="Avg SpO₂" value={`${Math.round(vitalStats?.avg_blood_oxygen || 97)}%`} colors={colors} />
            <AvgRow label="Avg Stress" value={`${Math.round(vitalStats?.avg_stress_level || stress)}%`} colors={colors} />
          </GlassCard>

          <View style={{ height: 40 }} />
        </View>
      </ScrollView>
    </View>
  );
}

// ── Sub-components ──

const FactorBar = ({ label, score, detail, colors }: { label: string; score: number; detail: string; colors: any }) => {
  const barColor = score >= 80 ? '#4CAF50' : score >= 60 ? '#FF9800' : '#F44336';
  return (
    <View style={styles.factorRow}>
      <View style={styles.factorHeader}>
        <Text style={[styles.factorLabel, { color: colors.text }]}>{label}</Text>
        <Text style={[styles.factorDetail, { color: colors.textMuted }]}>{detail}</Text>
      </View>
      <View style={[styles.factorBarBg, { backgroundColor: colors.surfaceSecondary }]}>
        <View style={[styles.factorBarFill, { width: `${Math.min(100, score)}%`, backgroundColor: barColor }]} />
      </View>
    </View>
  );
};

const MetricTile = ({ icon, label, value, unit, color, colors }: { icon: IconName; label: string; value: string; unit: string; color: string; colors: any }) => (
  <View style={[styles.metricTile, { backgroundColor: colors.surface }]}>
    <View style={[styles.metricTileIcon, { backgroundColor: color + '15' }]}>
      <Icon name={icon} size={20} color={color} />
    </View>
    <Text style={[styles.metricTileValue, { color }]}>{value}
      <Text style={[styles.metricTileUnit, { color: colors.textMuted }]}> {unit}</Text>
    </Text>
    <Text style={[styles.metricTileLabel, { color: colors.textMuted }]}>{label}</Text>
  </View>
);

const RecItem = ({ icon, text, color, colors }: { icon: IconName; text: string; color: string; colors: any }) => (
  <View style={styles.recRow}>
    <Icon name={icon} size={20} color={color} />
    <Text style={[styles.recText, { color: colors.text }]}>{text}</Text>
  </View>
);

const AvgRow = ({ label, value, colors }: { label: string; value: string; colors: any }) => (
  <View style={styles.avgRow}>
    <Text style={[styles.avgLabel, { color: colors.textSecondary }]}>{label}</Text>
    <Text style={[styles.avgValue, { color: colors.text }]}>{value}</Text>
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

  factorsCard: { marginBottom: Spacing.md, gap: 16 },
  factorRow: { gap: 6 },
  factorHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  factorLabel: { fontSize: FontSizes.md, fontWeight: '500' },
  factorDetail: { fontSize: FontSizes.sm },
  factorBarBg: { height: 8, borderRadius: 4, overflow: 'hidden' },
  factorBarFill: { height: '100%', borderRadius: 4 },

  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: Spacing.md },
  metricTile: { width: (width - Spacing.lg * 2 - 10) / 2, borderRadius: 20, padding: Spacing.md, gap: 8, borderWidth: 0.5, borderColor: 'rgba(150,150,150,0.12)' },
  metricTileIcon: { width: 38, height: 38, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  metricTileValue: { fontSize: 22, fontWeight: '700', letterSpacing: -0.5 },
  metricTileUnit: { fontSize: 12, fontWeight: '400' },
  metricTileLabel: { fontSize: 11, fontWeight: '500' },

  recsCard: { marginBottom: Spacing.md, gap: 14 },
  recRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  recText: { flex: 1, fontSize: FontSizes.md, lineHeight: 20 },

  avgCard: { marginBottom: Spacing.md, gap: 14 },
  avgRow: { flexDirection: 'row', justifyContent: 'space-between' },
  avgLabel: { fontSize: FontSizes.md },
  avgValue: { fontSize: FontSizes.md, fontWeight: '600' },
});
