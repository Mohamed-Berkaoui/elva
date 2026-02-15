import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Pressable,
  StatusBar,
  Dimensions,
} from 'react-native';
import { Icon, type IconName } from '@/components/ui/icon';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ElvaLogo } from '@/components/ui/logo';

import { DynamicBackground } from '@/components/ui/dynamic-background';

import { SimpleLineChart, BarChart, CircularProgress } from '@/components/ui/charts';
import { useApp } from '@/context/app-context';
import useTheme from '@/hooks/use-theme';
import { FontSizes, Spacing, LogoSize, type ThemeColors } from '@/constants/theme';
import {
  getDailySummaries,
  getVitalStats,
  getRecentActivities,
  getRecentSleepSessions,
  getHourlyAverages,
  type DailySummaryRecord,
  type ActivityRecord,
  type SleepRecord,
} from '@/services/database';

type TimeRange = '7d' | '14d' | '30d';

// Generate fake data for a given number of days
const DAY_LABELS_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function generateFakeData(days: number, baseValues: { min: number; max: number; decimals?: number }, seed: number) {
  const result: { label: string; value: number }[] = [];
  const now = new Date();
  let s = seed;
  const pseudoRandom = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const label = days <= 7 ? DAY_LABELS_SHORT[d.getDay() === 0 ? 6 : d.getDay() - 1] : `${d.getMonth() + 1}/${d.getDate()}`;
    const range = baseValues.max - baseValues.min;
    const val = baseValues.min + pseudoRandom() * range;
    result.push({ label, value: baseValues.decimals ? Math.round(val * 10) / 10 : Math.round(val) });
  }
  return result;
}

function getFakeDataForRange(range: TimeRange) {
  const days = range === '7d' ? 7 : range === '14d' ? 14 : 30;
  // Each metric gets a different seed so they're not correlated, but stable per range
  const baseSeed = days * 1000;
  return {
    hr: generateFakeData(days, { min: 58, max: 78 }, baseSeed + 1),
    hrv: generateFakeData(days, { min: 32, max: 62 }, baseSeed + 2),
    stress: generateFakeData(days, { min: 18, max: 50 }, baseSeed + 3),
    sleep: generateFakeData(days, { min: 5.5, max: 8.5, decimals: 1 }, baseSeed + 4),
    readiness: generateFakeData(days, { min: 55, max: 92 }, baseSeed + 5),
    calories: generateFakeData(days, { min: 200, max: 700 }, baseSeed + 6),
    steps: generateFakeData(days, { min: 4000, max: 13000 }, baseSeed + 7),
    spo2: generateFakeData(days, { min: 94, max: 99 }, baseSeed + 8),
  };
}

export default function AnalyticsScreen() {
  const insets = useSafeAreaInsets();
  const { readinessScore } = useApp();
  const { mode, colors } = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const [timeRange, setTimeRange] = useState<TimeRange>('7d');

  // Data
  const [summaries, setSummaries] = useState<DailySummaryRecord[]>([]);
  const [vitalStats, setVitalStats] = useState<any>(null);
  const [activities, setActivities] = useState<ActivityRecord[]>([]);
  const [sleepSessions, setSleepSessions] = useState<SleepRecord[]>([]);
  const [hourlyData, setHourlyData] = useState<any[]>([]);

  const daysMap: Record<TimeRange, number> = { '7d': 7, '14d': 14, '30d': 30 };

  const loadData = useCallback(async () => {
    const days = daysMap[timeRange];
    try {
      const [sums, stats, acts, sleeps, hourly] = await Promise.all([
        getDailySummaries(days),
        getVitalStats(days),
        getRecentActivities(days),
        getRecentSleepSessions(days),
        getHourlyAverages(24),
      ]);
      setSummaries(sums);
      setVitalStats(stats);
      setActivities(acts);
      setSleepSessions(sleeps);
      setHourlyData(hourly);
    } catch {
      // DB not ready yet
    }
  }, [timeRange]);

  useEffect(() => { loadData(); }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setTimeout(() => setRefreshing(false), 500);
  }, [loadData]);

  // Derived stats
  const avgHR = vitalStats?.avg_heart_rate || 0;
  const avgHRV = vitalStats?.avg_hrv || 0;
  const avgSpO2 = vitalStats?.avg_blood_oxygen || 0;
  const avgStress = vitalStats?.avg_stress_level || 0;
  const totalActivities = activities.filter(a => a.end_time).length;
  const totalActivityMin = activities.reduce((sum, a) => sum + ((a.duration_sec || 0) / 60), 0);
  const totalCalories = activities.reduce((sum, a) => sum + (a.calories_burned || 0), 0);
  const totalSteps = activities.reduce((sum, a) => sum + (a.steps || 0), 0);

  const avgSleepScore = sleepSessions.length > 0
    ? Math.round(sleepSessions.reduce((sum, s) => sum + (s.sleep_score || 0), 0) / sleepSessions.length)
    : 0;
  const avgSleepDuration = sleepSessions.length > 0
    ? Math.round(sleepSessions.reduce((sum, s) => sum + (s.total_duration_min || 0), 0) / sleepSessions.length)
    : 0;

  // Chart data from summaries
  const hrChartData = summaries.map((s, i) => ({ label: `${i + 1}`, value: s.avg_heart_rate || 0 })).reverse();
  const hrvChartData = summaries.map((s, i) => ({ label: `${i + 1}`, value: s.avg_hrv || 0 })).reverse();
  const stressChartData = summaries.map((s, i) => ({ label: `${i + 1}`, value: s.avg_stress || 0 })).reverse();
  const sleepChartData = sleepSessions.map((s, i) => ({ label: `${i + 1}`, value: s.total_duration_min / 60 })).reverse();
  const readinessChartData = summaries.map((s, i) => ({ label: `${i + 1}`, value: s.readiness_score || 0 })).reverse();
  const caloriesChartData = summaries.map((s, i) => ({ label: `${i + 1}`, value: s.total_calories || 0 })).reverse();

  const hasData = summaries.length > 0 || activities.length > 0 || sleepSessions.length > 0;

  // Generate fake data keyed to the selected time range
  const [fakeData, setFakeData] = useState(() => getFakeDataForRange('7d'));
  useEffect(() => {
    setFakeData(getFakeDataForRange(timeRange));
  }, [timeRange]);

  // Use fake data when no real data is available
  const useHrData = hrChartData.length > 1 ? hrChartData : fakeData.hr;
  const useHrvData = hrvChartData.length > 1 ? hrvChartData : fakeData.hrv;
  const useStressData = stressChartData.length > 1 ? stressChartData : fakeData.stress;
  const useSleepData = sleepChartData.length > 1 ? sleepChartData : fakeData.sleep;
  const useReadinessData = readinessChartData.length > 1 ? readinessChartData : fakeData.readiness;
  const useCaloriesData = caloriesChartData.length > 1 ? caloriesChartData : fakeData.calories;
  const useStepsData = summaries.length > 1 ? summaries.map((s, i) => ({ label: `${i + 1}`, value: s.total_steps || 0 })).reverse() : fakeData.steps;
  const useSpo2Data = summaries.length > 1 ? summaries.map((s, i) => ({ label: `${i + 1}`, value: s.avg_spo2 || 0 })).reverse() : fakeData.spo2;
  const displayAvgHR = avgHR || 69;
  const displayAvgHRV = avgHRV || 49;
  const displayAvgSpO2 = avgSpO2 || 97;
  const displayAvgStress = avgStress || 34;
  const displayTotalActivities = totalActivities || 5;
  const displayTotalMin = totalActivityMin || 185;
  const displayTotalCalories = totalCalories || 2890;
  const displayTotalSteps = totalSteps || 58200;
  const displayAvgSleepScore = avgSleepScore || 74;
  const displayAvgSleepDuration = avgSleepDuration || 432;

  // Unified accent palette
  const accent = '#64B5F6';
  const accentSoft = accent + '12';
  const score = readinessScore || 75;
  const scoreLabel = score >= 80 ? 'Excellent' : score >= 60 ? 'Good' : 'Needs Rest';

  return (
    <DynamicBackground readinessScore={readinessScore} plain>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <StatusBar barStyle={mode === 'dark' ? 'light-content' : 'dark-content'} />

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.text} />}
        >
          {/* Logo */}
          <View style={styles.pageHeader}>
            <ElvaLogo size={LogoSize.header} heartRate={72} variant="solid" />
          </View>

          {/* ═══ WELLNESS HERO ═══ */}
          <View style={[styles.heroCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.heroEyebrow, { color: accent }]}>YOUR WELLNESS</Text>
            <View style={styles.heroBody}>
              <CircularProgress progress={score} size={100} strokeWidth={9} color={accent} label={`${score}`} />
              <View style={styles.heroRight}>
                <Text style={[styles.heroLabel, { color: colors.text }]}>{scoreLabel}</Text>
                <Text style={[styles.heroSub, { color: colors.textMuted }]}>Readiness Score</Text>
                <View style={styles.heroMiniRow}>
                  <HeroMini label="HR" value={`${Math.round(displayAvgHR)}`} unit="bpm" colors={colors} />
                  <HeroMini label="HRV" value={`${Math.round(displayAvgHRV)}`} unit="ms" colors={colors} />
                  <HeroMini label="SpO₂" value={`${Math.round(displayAvgSpO2)}`} unit="%" colors={colors} />
                </View>
              </View>
            </View>
          </View>

          {/* Time Range */}
          <View style={styles.timeRangeRow}>
            {(['7d', '14d', '30d'] as TimeRange[]).map(range => {
              const active = timeRange === range;
              return (
                <Pressable
                  key={range}
                  style={[styles.timeChip, {
                    backgroundColor: active ? accent : 'transparent',
                    borderColor: active ? accent : colors.border,
                  }]}
                  onPress={() => setTimeRange(range)}
                >
                  <Text style={[styles.timeChipText, { color: active ? '#fff' : colors.textSecondary }]}>
                    {range === '7d' ? '7 Days' : range === '14d' ? '14 Days' : '30 Days'}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* ═══ VITALS ═══ */}
          <SectionDivider label="VITALS" colors={colors} />

          <ChartCard icon="heart" title="Heart Rate" subtitle={`${Math.round(displayAvgHR)} bpm avg`} accent={accent} colors={colors}>
            <SimpleLineChart data={useHrData} lineColor={accent} height={130} unit=" bpm" />
          </ChartCard>

          <ChartCard icon="pulse" title="HRV" subtitle={`${Math.round(displayAvgHRV)} ms avg`} accent={accent} colors={colors}>
            <SimpleLineChart data={useHrvData} lineColor={accent} height={130} unit=" ms" />
          </ChartCard>

          <ChartCard icon="leaf" title="Stress" subtitle={`${Math.round(displayAvgStress)}% avg`} accent={accent} colors={colors}>
            <SimpleLineChart data={useStressData} lineColor={accent} height={110} unit="%" />
          </ChartCard>

          <ChartCard icon="water" title="Blood Oxygen" subtitle={`${Math.round(displayAvgSpO2)}% avg`} accent={accent} colors={colors}>
            <SimpleLineChart data={useSpo2Data} lineColor={accent} height={110} unit="%" />
          </ChartCard>

          <ChartCard icon="shield-check-outline" title="Readiness" subtitle={`${score} today`} accent={accent} colors={colors}>
            <SimpleLineChart data={useReadinessData} lineColor={accent} height={110} />
          </ChartCard>

          {/* ═══ ACTIVITY ═══ */}
          <SectionDivider label="ACTIVITY" colors={colors} />

          <View style={styles.statGrid}>
            <StatTile label="Sessions" value={`${displayTotalActivities}`} accent={accent} colors={colors} />
            <StatTile label="Active" value={`${Math.round(displayTotalMin)} min`} accent={accent} colors={colors} />
            <StatTile label="Calories" value={`${Math.round(displayTotalCalories).toLocaleString()}`} accent={accent} colors={colors} />
            <StatTile label="Steps" value={`${(displayTotalSteps / 1000).toFixed(1)}k`} accent={accent} colors={colors} />
          </View>

          <ChartCard icon="fire" title="Calories" subtitle="Daily burn" accent={accent} colors={colors}>
            <BarChart data={useCaloriesData} barColor={accent} height={130} unit=" cal" />
          </ChartCard>

          <ChartCard icon="walk" title="Steps" subtitle="Daily movement" accent={accent} colors={colors}>
            <BarChart data={useStepsData} barColor={accent} height={130} />
          </ChartCard>

          {/* ═══ SLEEP ═══ */}
          <SectionDivider label="SLEEP" colors={colors} />

          <View style={[styles.sleepStrip, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.sleepStatItem}>
              <Text style={[styles.sleepStatVal, { color: accent }]}>{displayAvgSleepScore}</Text>
              <Text style={[styles.sleepStatLbl, { color: colors.textMuted }]}>Score</Text>
            </View>
            <View style={[styles.sleepDiv, { backgroundColor: colors.border }]} />
            <View style={styles.sleepStatItem}>
              <Text style={[styles.sleepStatVal, { color: colors.text }]}>
                {Math.floor(displayAvgSleepDuration / 60)}h{Math.round(displayAvgSleepDuration % 60)}m
              </Text>
              <Text style={[styles.sleepStatLbl, { color: colors.textMuted }]}>Avg Duration</Text>
            </View>
            <View style={[styles.sleepDiv, { backgroundColor: colors.border }]} />
            <View style={styles.sleepStatItem}>
              <Text style={[styles.sleepStatVal, { color: colors.text }]}>{sleepSessions.length || 7}</Text>
              <Text style={[styles.sleepStatLbl, { color: colors.textMuted }]}>Nights</Text>
            </View>
          </View>

          <ChartCard icon="moon-waning-crescent" title="Sleep Duration" subtitle="Hours per night" accent={accent} colors={colors}>
            <BarChart data={useSleepData} barColor={accent} height={130} unit="h" />
          </ChartCard>

          {/* ═══ RECENT ACTIVITIES ═══ */}
          {activities.length > 0 && (
            <>
              <SectionDivider label="RECENT" colors={colors} />
              {activities.slice(0, 5).map(activity => (
                <View key={activity.id} style={[styles.actRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <View style={[styles.actIcon, { backgroundColor: accentSoft }]}>
                    <Icon name={getActivityIcon(activity.type)} size={18} color={accent} />
                  </View>
                  <View style={styles.actBody}>
                    <Text style={[styles.actName, { color: colors.text }]}>
                      {activity.type.charAt(0).toUpperCase() + activity.type.slice(1)}
                    </Text>
                    <Text style={[styles.actMeta, { color: colors.textMuted }]}>
                      {new Date(activity.start_time).toLocaleDateString()} · {Math.round((activity.duration_sec || 0) / 60)} min
                    </Text>
                  </View>
                  <View style={styles.actNums}>
                    {activity.calories_burned > 0 && (
                      <Text style={[styles.actNumVal, { color: colors.text }]}>{Math.round(activity.calories_burned)} cal</Text>
                    )}
                    {activity.avg_heart_rate > 0 && (
                      <Text style={[styles.actNumSub, { color: colors.textMuted }]}>♥ {Math.round(activity.avg_heart_rate)}</Text>
                    )}
                  </View>
                </View>
              ))}
            </>
          )}

          {/* 24h Heart Rate */}
          {hourlyData.length > 1 && (
            <>
              <SectionDivider label="TODAY" colors={colors} />
              <ChartCard icon="heart" title="24h Heart Rate" subtitle="Hourly averages" accent={accent} colors={colors}>
                <SimpleLineChart
                  data={hourlyData.map((h: any, i: number) => ({ label: `${i}`, value: h.avg_heart_rate || 0 }))}
                  lineColor={accent}
                  height={90}
                />
              </ChartCard>
            </>
          )}

          <View style={{ height: 100 }} />
        </ScrollView>
      </View>
    </DynamicBackground>
  );
}

// ============================================
// HELPERS
// ============================================

const SectionDivider: React.FC<{ label: string; colors: ThemeColors }> = ({ label, colors }) => (
  <View style={styles.secDivWrap}>
    <View style={[styles.secDivLine, { backgroundColor: colors.border }]} />
    <Text style={[styles.secDivText, { color: colors.textMuted }]}>{label}</Text>
    <View style={[styles.secDivLine, { backgroundColor: colors.border }]} />
  </View>
);

const HeroMini: React.FC<{ label: string; value: string; unit: string; colors: ThemeColors }> = ({ label, value, unit, colors }) => (
  <View style={styles.heroMiniWrap}>
    <Text style={[styles.heroMiniVal, { color: colors.text }]}>
      {value}<Text style={{ color: colors.textMuted, fontSize: 10 }}> {unit}</Text>
    </Text>
    <Text style={[styles.heroMiniLbl, { color: colors.textMuted }]}>{label}</Text>
  </View>
);

const ChartCard: React.FC<{
  icon: IconName; title: string; subtitle: string; accent: string; colors: ThemeColors; children: React.ReactNode;
}> = ({ icon, title, subtitle, accent, colors, children }) => (
  <View style={[styles.cCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
    <View style={styles.cCardHead}>
      <View style={[styles.cCardDot, { backgroundColor: accent + '14' }]}>
        <Icon name={icon} size={15} color={accent} />
      </View>
      <Text style={[styles.cCardTitle, { color: colors.text }]}>{title}</Text>
      <Text style={[styles.cCardSub, { color: colors.textMuted }]}>{subtitle}</Text>
    </View>
    <View style={styles.cCardBody}>{children}</View>
  </View>
);

const StatTile: React.FC<{ label: string; value: string; accent: string; colors: ThemeColors }> = ({ label, value, accent, colors }) => (
  <View style={[styles.statTile, { backgroundColor: colors.surface, borderColor: colors.border }]}>
    <Text style={[styles.statTileVal, { color: accent }]}>{value}</Text>
    <Text style={[styles.statTileLbl, { color: colors.textMuted }]}>{label}</Text>
  </View>
);

const getActivityIcon = (type: string): IconName => {
  const icons: Record<string, IconName> = {
    running: 'run', walking: 'walk', cycling: 'bike', strength: 'dumbbell',
    yoga: 'human', meditation: 'leaf', swimming: 'water', hiit: 'fire',
    stretching: 'run', sleep: 'moon-waning-crescent',
  };
  return icons[type] || 'run';
};

// ============================================
// STYLES
// ============================================

const { width: SW } = Dimensions.get('window');
const STAT_W = (SW - Spacing.lg * 2 - 10) / 2;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  scrollContent: { paddingHorizontal: Spacing.lg, paddingTop: 0, paddingBottom: 120 },
  pageHeader: { marginBottom: Spacing.md },

  /* Hero */
  heroCard: { borderRadius: 22, padding: 22, marginBottom: Spacing.lg, borderWidth: 0.5 },
  heroEyebrow: { fontSize: 10, fontWeight: '800', letterSpacing: 1.4, textTransform: 'uppercase', marginBottom: 16 },
  heroBody: { flexDirection: 'row', alignItems: 'center', gap: 22 },
  heroRight: { flex: 1 },
  heroLabel: { fontSize: 20, fontWeight: '700', letterSpacing: -0.4 },
  heroSub: { fontSize: 11, marginTop: 2, marginBottom: 14 },
  heroMiniRow: { flexDirection: 'row', gap: 16 },
  heroMiniWrap: { alignItems: 'center' },
  heroMiniVal: { fontSize: 14, fontWeight: '700', letterSpacing: -0.3 },
  heroMiniLbl: { fontSize: 9, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4, marginTop: 2 },

  /* Time Range */
  timeRangeRow: { flexDirection: 'row', gap: 8, marginBottom: 6 },
  timeChip: { flex: 1, paddingVertical: 11, borderRadius: 28, borderWidth: 1, alignItems: 'center' },
  timeChipText: { fontSize: 12, fontWeight: '700', letterSpacing: 0.3 },

  /* Section Divider */
  secDivWrap: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 26, marginBottom: 16 },
  secDivLine: { flex: 1, height: StyleSheet.hairlineWidth },
  secDivText: { fontSize: 10, fontWeight: '800', letterSpacing: 1.6 },

  /* Chart Card */
  cCard: { borderRadius: 20, padding: 18, marginBottom: 12, borderWidth: 0.5 },
  cCardHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  cCardDot: { width: 32, height: 32, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  cCardTitle: { fontSize: 15, fontWeight: '700', letterSpacing: -0.2, flex: 1 },
  cCardSub: { fontSize: 11, fontWeight: '500' },
  cCardBody: {},
  chartRange: { marginTop: 8 },
  chartRangeText: { fontSize: 10, textAlign: 'center', letterSpacing: 0.2 },

  /* Stat Grid */
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 12 },
  statTile: { width: STAT_W, borderRadius: 18, paddingVertical: 18, paddingHorizontal: 14, alignItems: 'center', borderWidth: 0.5, gap: 4 },
  statTileVal: { fontSize: 20, fontWeight: '800', letterSpacing: -0.5 },
  statTileLbl: { fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },

  /* Sleep Strip */
  sleepStrip: { flexDirection: 'row', borderRadius: 20, padding: 18, alignItems: 'center', justifyContent: 'space-around', marginBottom: 12, borderWidth: 0.5 },
  sleepStatItem: { alignItems: 'center', gap: 4 },
  sleepStatVal: { fontSize: 18, fontWeight: '700', letterSpacing: -0.3 },
  sleepStatLbl: { fontSize: 9, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4 },
  sleepDiv: { width: 1, height: 32 },

  /* Activity Rows */
  actRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 16, marginBottom: 8, borderWidth: 0.5 },
  actIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  actBody: { flex: 1 },
  actName: { fontSize: 14, fontWeight: '600' },
  actMeta: { fontSize: 11, marginTop: 2 },
  actNums: { alignItems: 'flex-end' },
  actNumVal: { fontSize: 13, fontWeight: '600' },
  actNumSub: { fontSize: 11, marginTop: 2 },
});
