import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  StatusBar,
  Dimensions,
} from 'react-native';
import { Icon, type IconName } from '@/components/ui/icon';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GlassCard, MetricCard } from '@/components/ui/cards';
import { ElvaLogo } from '@/components/ui/logo';
import { DynamicBackground } from '@/components/ui/dynamic-background';
import { LivePulse, TrendBadge, MiniSparkline, StatusBadge, ReadinessGauge } from '@/components/ui/indicators';
import {
  PhysicalRecoverySection,
  MentalRecoverySection,
  StressMonitorSection,
  HealthSpanSection,
  type RecoveryData,
  type MentalRecoveryData,
  type StressMonitorData,
  type HealthSpanData,
} from '@/components/ui/health-sections';
import { useApp } from '@/context/app-context';
import useTheme from '@/hooks/use-theme';
import { FontSizes, Spacing, LogoSize, type ThemeColors } from '@/constants/theme';
import { getLastSleepSession, getActivityStats, getUnreadInsights, getVitalStats, type AIInsightRecord } from '@/services/database';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - Spacing.lg * 3) / 2;

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { user, braceletConnected, latestReading, readinessScore, latestVital, refreshHealthData, unreadCount } = useApp();
  const { mode, colors } = useTheme();
  const [refreshing, setRefreshing] = useState(false);

  // History for sparklines
  const [hrHistory, setHrHistory] = useState<number[]>([]);
  const [hrvHistory, setHrvHistory] = useState<number[]>([]);
  const [stressHistory, setStressHistory] = useState<number[]>([]);

  // Additional data from SQLite
  const [lastSleep, setLastSleep] = useState<any>(null);
  const [activityStats, setActivityStats] = useState<any>(null);
  const [insights, setInsights] = useState<AIInsightRecord[]>([]);
  const [vitalStats, setVitalStats] = useState<any>(null);

  // Track bracelet readings for sparklines
  useEffect(() => {
    if (latestReading) {
      setHrHistory(prev => [...prev.slice(-19), latestReading.heartRate]);
      setHrvHistory(prev => [...prev.slice(-19), latestReading.hrv]);
      setStressHistory(prev => [...prev.slice(-19), latestReading.stressLevel]);
    }
  }, [latestReading]);

  // Load extra data
  useEffect(() => {
    loadExtraData();
  }, []);

  const loadExtraData = async () => {
    try {
      const [sleep, stats, unreadInsights, vitals] = await Promise.all([
        getLastSleepSession(),
        getActivityStats(1),
        getUnreadInsights(),
        getVitalStats(7),
      ]);
      setLastSleep(sleep);
      setActivityStats(stats);
      setInsights(unreadInsights);
      setVitalStats(vitals);
    } catch {
      // DB not ready
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshHealthData();
    await loadExtraData();
    setTimeout(() => setRefreshing(false), 500);
  }, [refreshHealthData]);

  const greeting = getGreeting();
  const hr = latestReading?.heartRate || latestVital?.heart_rate || 0;
  const hrv = latestReading?.hrv || latestVital?.hrv || 0;
  const spo2 = latestReading?.bloodOxygen || latestVital?.blood_oxygen || 0;
  const temp = latestReading?.skinTemperature || latestVital?.skin_temperature || 0;
  const stress = latestReading?.stressLevel || latestVital?.stress_level || 0;
  const smo2 = latestReading?.muscleOxygen || latestVital?.muscle_oxygen || 0;
  const fatigue = latestReading?.muscleFatigue || latestVital?.muscle_fatigue || 'Low';
  const state = latestReading?.state || 'resting';
  const battery = latestReading?.batteryLevel || 100;
  // Extended channels from enhanced simulator
  const respiratoryRate = latestReading?.respiratoryRate || 14;
  const vo2Estimate = latestReading?.vo2Estimate || 4;
  const lactateEstimate = latestReading?.lactateEstimate || 0.8;
  const hydrationLevel = latestReading?.hydrationLevel || 90;
  const trainingLoad = latestReading?.trainingLoad || 0;
  const recoveryTimeMin = latestReading?.recoveryTimeMin || 0;
  const skinTemp = latestReading?.skinTemperature || temp;

  // ── Derived health scores ──────────────────────
  const fatigueNum = typeof fatigue === 'string'
    ? fatigue === 'Low' ? 20 : fatigue === 'Medium' ? 50 : 80
    : (fatigue as number);

  const sleepScore = lastSleep?.sleep_score || 70;

  const physicalRecoveryData: RecoveryData = useMemo(() => {
    const recoveryScore = Math.round(
      (Math.min(100, (hrv / 80) * 100) * 0.3) +
      (smo2 * 0.25) +
      ((100 - fatigueNum) * 0.2) +
      (sleepScore * 0.25)
    );
    return {
      hrv,
      restingHR: hr,
      muscleOxygen: smo2 || 65,
      muscleFatigue: fatigueNum,
      sleepScore,
      recoveryScore: Math.max(0, Math.min(100, recoveryScore)),
      respiratoryRate,
      vo2Estimate,
      hydrationLevel,
      recoveryTimeMin,
      trainingLoad,
    };
  }, [hrv, hr, smo2, fatigueNum, sleepScore, respiratoryRate, vo2Estimate, hydrationLevel, recoveryTimeMin, trainingLoad]);

  const mentalRecoveryData: MentalRecoveryData = useMemo(() => {
    const mentalScore = Math.round(
      ((100 - stress) * 0.4) +
      (Math.min(100, (hrv / 80) * 100) * 0.3) +
      (sleepScore * 0.3)
    );
    return {
      stressLevel: stress,
      hrv,
      sleepQuality: sleepScore,
      mentalScore: Math.max(0, Math.min(100, mentalScore)),
      respiratoryRate,
    };
  }, [stress, hrv, sleepScore, respiratoryRate]);

  const stressMonitorData: StressMonitorData = useMemo(() => ({
    currentStress: stress,
    avgStress: vitalStats?.avg_stress || stress,
    peakStress: Math.min(100, (vitalStats?.avg_stress || stress) * 1.3),
    hrv,
    heartRate: hr,
    respiratoryRate,
    skinTemperature: skinTemp,
  }), [stress, hrv, hr, vitalStats, respiratoryRate, skinTemp]);

  const healthSpanData: HealthSpanData = useMemo(() => {
    const cardiovascular = Math.round(
      (Math.min(100, (hrv / 80) * 100) * 0.5) + ((spo2 / 100) * 100 * 0.5)
    );
    const musculoskeletal = Math.round(
      (smo2 * 0.5) + ((100 - fatigueNum) * 0.5)
    );
    const metabolic = Math.round(
      ((100 - stress) * 0.4) + (sleepScore * 0.3) + ((spo2 / 100) * 100 * 0.3)
    );
    const neurological = Math.round(
      (Math.min(100, (hrv / 80) * 100) * 0.5) + ((100 - stress) * 0.5)
    );
    const overallScore = Math.round(
      (cardiovascular * 0.3) + (musculoskeletal * 0.2) + (metabolic * 0.25) + (neurological * 0.25)
    );
    return {
      overallScore: Math.max(0, Math.min(100, overallScore)),
      cardiovascular: Math.max(0, Math.min(100, cardiovascular)),
      musculoskeletal: Math.max(0, Math.min(100, musculoskeletal)),
      metabolic: Math.max(0, Math.min(100, metabolic)),
      neurological: Math.max(0, Math.min(100, neurological)),
      vo2Estimate,
      lactateEstimate,
      hydrationLevel,
    };
  }, [hrv, spo2, smo2, fatigueNum, stress, sleepScore, vo2Estimate, lactateEstimate, hydrationLevel]);

  return (
    <DynamicBackground readinessScore={readinessScore} plain>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <StatusBar barStyle={mode === 'dark' ? 'light-content' : 'dark-content'} />

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.text} />
          }
        >
          {/* Header */}
          <View style={styles.pageHeader}>
            <ElvaLogo size={LogoSize.header} heartRate={hr || 72} variant="solid" />
          </View>

          {/* Bracelet Status Pill */}
          <View style={[styles.braceletPill, { backgroundColor: colors.surface, borderColor: braceletConnected ? colors.success + '30' : colors.border }]}>
            <View style={[styles.braceletDot, { backgroundColor: braceletConnected ? colors.success : colors.textMuted }]} />
            <Text style={[styles.braceletText, { color: colors.textMuted }]}>
              ELVA • {braceletConnected ? state.replace('_', ' ') : 'Disconnected'}
            </Text>
            <View style={styles.braceletBatt}>
              <Icon name="battery-50" size={13} color={battery < 20 ? colors.error : colors.textMuted} />
              <Text style={[styles.braceletBattText, { color: colors.textMuted }]}>{Math.round(battery)}%</Text>
            </View>
          </View>

          {/* ═══ READINESS HERO ═══ */}
          <View style={[styles.readinessHero, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.readinessTop}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.readinessEyebrow, { color: '#42A5F5' }]}>Today's Readiness</Text>
                <View style={styles.readinessScoreRow}>
                  <Text style={[styles.readinessNum, { color: '#42A5F5' }]}>{readinessScore}</Text>
                  <Text style={[styles.readinessPercent, { color: '#42A5F580' }]}>%</Text>
                </View>
                <StatusBadge
                  status={readinessScore >= 80 ? 'excellent' : readinessScore >= 60 ? 'good' : 'low'}
                  label={readinessScore >= 80 ? 'Peak Output' : readinessScore >= 60 ? 'Moderate' : 'Rest Day'}
                />
              </View>
              <ReadinessGauge score={readinessScore} size={110} />
            </View>
          </View>

          {/* ═══ LIVE VITALS ═══ */}
          <View style={styles.sectionRow}>
            <View style={[styles.sectionDot, { backgroundColor: colors.heartRate }]} />
            <Text style={[styles.sectionLabel, { color: colors.text }]}>Live Vitals</Text>
            {braceletConnected && <LivePulse color={colors.success} size={4} />}
          </View>

          <View style={styles.vitalsGrid}>
            <VitalTile icon="heart" value={hr} unit="bpm" label="Heart Rate" color={colors.heartRate} colors={colors} />
            <VitalTile icon="pulse" value={hrv} unit="ms" label="HRV" color={colors.hrv} colors={colors} />
            <VitalTile icon="water" value={spo2} unit="%" label="SpO₂" color={colors.oxygen} colors={colors} />
            <VitalTile icon="thermometer" value={temp?.toFixed(1) || '0.0'} unit="°C" label="Temp" color={colors.text} colors={colors} />
          </View>

          {/* Sparkline Trends */}
          {hrHistory.length > 3 && (
            <View style={[styles.sparkCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.sparkRow}>
                <View style={styles.sparkItem}>
                  <Text style={[styles.sparkItemLabel, { color: colors.textMuted }]}>HR</Text>
                  <MiniSparkline data={hrHistory} color={colors.heartRate} width={80} height={26} />
                </View>
                <View style={styles.sparkItem}>
                  <Text style={[styles.sparkItemLabel, { color: colors.textMuted }]}>HRV</Text>
                  <MiniSparkline data={hrvHistory} color={colors.hrv} width={80} height={26} />
                </View>
                <View style={styles.sparkItem}>
                  <Text style={[styles.sparkItemLabel, { color: colors.textMuted }]}>Stress</Text>
                  <MiniSparkline data={stressHistory} color={colors.stress} width={80} height={26} />
                </View>
              </View>
              <View style={styles.sparkFooter}>
                <LivePulse color={colors.success} size={3} />
                <Text style={[styles.sparkFooterText, { color: colors.textMuted }]}>Live • every 3s</Text>
              </View>
            </View>
          )}

          {/* ═══ BODY SIGNALS ═══ */}
          <View style={styles.sectionRow}>
            <View style={[styles.sectionDot, { backgroundColor: colors.stress }]} />
            <Text style={[styles.sectionLabel, { color: colors.text }]}>Body Signals</Text>
          </View>
          <View style={styles.bodySignalRow}>
            <View style={[styles.bodySignalCard, { backgroundColor: colors.surface }]}>
              <View style={[styles.bodySignalIcon, { backgroundColor: colors.stress + '15' }]}>
                <Icon name="leaf" size={18} color={colors.stress} />
              </View>
              <Text style={[styles.bodySignalValue, { color: colors.stress }]}>{stress}%</Text>
              <Text style={[styles.bodySignalLabel, { color: colors.textMuted }]}>Stress</Text>
            </View>
            <View style={[styles.bodySignalCard, { backgroundColor: colors.surface }]}>
              <View style={[styles.bodySignalIcon, { backgroundColor: colors.muscleOxygen + '15' }]}>
                <Icon name="run" size={18} color={colors.muscleOxygen} />
              </View>
              <Text style={[styles.bodySignalValue, { color: colors.muscleOxygen }]}>{smo2?.toFixed(0) || '65'}%</Text>
              <Text style={[styles.bodySignalLabel, { color: colors.textMuted }]}>Muscle O₂</Text>
            </View>
            <View style={[styles.bodySignalCard, { backgroundColor: colors.surface }]}>
              <View style={[styles.bodySignalIcon, { backgroundColor: colors.hrv + '15' }]}>
                <Icon name="lungs" size={18} color={colors.hrv} />
              </View>
              <Text style={[styles.bodySignalValue, { color: colors.hrv }]}>{respiratoryRate}</Text>
              <Text style={[styles.bodySignalLabel, { color: colors.textMuted }]}>Resp Rate</Text>
            </View>
          </View>

          {/* ─── Physical Recovery ─── */}
          <View style={styles.sectionRow}>
            <View style={[styles.sectionDot, { backgroundColor: colors.physicalRecovery }]} />
            <Text style={[styles.sectionLabel, { color: colors.text }]}>Physical Recovery</Text>
          </View>
          <PhysicalRecoverySection data={physicalRecoveryData} />

          {/* ─── Mental Recovery ─── */}
          <View style={styles.sectionRow}>
            <View style={[styles.sectionDot, { backgroundColor: colors.mentalRecovery }]} />
            <Text style={[styles.sectionLabel, { color: colors.text }]}>Mental Recovery</Text>
          </View>
          <MentalRecoverySection data={mentalRecoveryData} />

          {/* ─── Stress Monitor ─── */}
          <View style={styles.sectionRow}>
            <View style={[styles.sectionDot, { backgroundColor: colors.stress }]} />
            <Text style={[styles.sectionLabel, { color: colors.text }]}>Stress Monitor</Text>
          </View>
          <StressMonitorSection data={stressMonitorData} />

          {/* ─── Health Span ─── */}
          <View style={styles.sectionRow}>
            <View style={[styles.sectionDot, { backgroundColor: colors.success }]} />
            <Text style={[styles.sectionLabel, { color: colors.text }]}>Health Span</Text>
          </View>
          <HealthSpanSection data={healthSpanData} />

          {/* Sleep Summary */}
          {lastSleep && (
            <>
              <View style={styles.sectionRow}>
                <View style={[styles.sectionDot, { backgroundColor: colors.sleep }]} />
                <Text style={[styles.sectionLabel, { color: colors.text }]}>Last Sleep</Text>
              </View>
              <View style={[styles.sleepRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={styles.sleepStat}>
                  <Text style={[styles.sleepStatBig, { color: colors.text }]}>
                    {Math.floor(lastSleep.total_duration_min / 60)}h {Math.round(lastSleep.total_duration_min % 60)}m
                  </Text>
                  <Text style={[styles.sleepStatSub, { color: colors.textMuted }]}>Duration</Text>
                </View>
                <View style={[styles.sleepDiv, { backgroundColor: colors.border }]} />
                <View style={styles.sleepStat}>
                  <Text style={[styles.sleepStatBig, { color: colors.sleep }]}>{Math.round(lastSleep.sleep_score)}</Text>
                  <Text style={[styles.sleepStatSub, { color: colors.textMuted }]}>Score</Text>
                </View>
                <View style={[styles.sleepDiv, { backgroundColor: colors.border }]} />
                <View style={styles.sleepStat}>
                  <Text style={[styles.sleepStatBig, { color: colors.text }]}>{Math.round(lastSleep.deep_sleep_min)}m</Text>
                  <Text style={[styles.sleepStatSub, { color: colors.textMuted }]}>Deep</Text>
                </View>
              </View>
            </>
          )}

          {/* Today's Activity */}
          {activityStats && activityStats.total_sessions > 0 && (
            <>
              <View style={styles.sectionRow}>
                <View style={[styles.sectionDot, { backgroundColor: colors.calories }]} />
                <Text style={[styles.sectionLabel, { color: colors.text }]}>Today's Activity</Text>
              </View>
              <View style={styles.bodySignalRow}>
                <View style={[styles.bodySignalCard, { backgroundColor: colors.surface }]}>
                  <View style={[styles.bodySignalIcon, { backgroundColor: colors.steps + '15' }]}>
                    <Icon name="walk" size={18} color={colors.steps} />
                  </View>
                  <Text style={[styles.bodySignalValue, { color: colors.steps }]}>{activityStats.total_steps.toLocaleString()}</Text>
                  <Text style={[styles.bodySignalLabel, { color: colors.textMuted }]}>Steps</Text>
                </View>
                <View style={[styles.bodySignalCard, { backgroundColor: colors.surface }]}>
                  <View style={[styles.bodySignalIcon, { backgroundColor: colors.calories + '15' }]}>
                    <Icon name="fire" size={18} color={colors.calories} />
                  </View>
                  <Text style={[styles.bodySignalValue, { color: colors.calories }]}>{Math.round(activityStats.total_calories)}</Text>
                  <Text style={[styles.bodySignalLabel, { color: colors.textMuted }]}>Calories</Text>
                </View>
                <View style={[styles.bodySignalCard, { backgroundColor: colors.surface }]}>
                  <View style={[styles.bodySignalIcon, { backgroundColor: colors.accent + '15' }]}>
                    <Icon name="clock" size={18} color={colors.accent} />
                  </View>
                  <Text style={[styles.bodySignalValue, { color: colors.accent }]}>{Math.round(activityStats.total_duration_min)}m</Text>
                  <Text style={[styles.bodySignalLabel, { color: colors.textMuted }]}>Active</Text>
                </View>
              </View>
            </>
          )}

          {/* AI Insights */}
          {insights.length > 0 && (
            <>
              <View style={styles.sectionRow}>
                <View style={[styles.sectionDot, { backgroundColor: colors.accent }]} />
                <Text style={[styles.sectionLabel, { color: colors.text }]}>AI Insights</Text>
              </View>
              {insights.slice(0, 3).map((insight) => (
                <GlassCard key={insight.id} style={styles.insightCard}>
                  <View style={styles.insightHeader}>
                    <View style={[styles.insightPriorityBadge, { backgroundColor: getPriorityColor(insight.priority, colors) + '18' }]}>
                      <Text style={[styles.insightPriority, { color: getPriorityColor(insight.priority, colors) }]}>
                        {insight.priority.toUpperCase()}
                      </Text>
                    </View>
                    <Text style={[styles.insightTime, { color: colors.textMuted }]}>
                      {new Date(insight.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </View>
                  <Text style={[styles.insightTitle, { color: colors.text }]}>{insight.title}</Text>
                  <Text style={[styles.insightDescription, { color: colors.textSecondary }]} numberOfLines={2}>
                    {insight.description}
                  </Text>
                  {insight.recommendation && (
                    <Text style={[styles.insightRec, { color: colors.accent }]} numberOfLines={1}>
                      → {insight.recommendation}
                    </Text>
                  )}
                </GlassCard>
              ))}
            </>
          )}

          {/* Notification Badge */}
          {unreadCount > 0 && (
            <View style={[styles.notifBanner, { backgroundColor: colors.accent + '12', borderColor: colors.accent + '25' }]}>
              <Icon name="bell" size={16} color={colors.accent} />
              <Text style={[styles.notifBannerText, { color: colors.accent }]}>
                {unreadCount} new AI notification{unreadCount > 1 ? 's' : ''}
              </Text>
            </View>
          )}

          <View style={styles.bottomSpacer} />
        </ScrollView>
      </View>
    </DynamicBackground>
  );
}

// ============================================
// HELPERS
// ============================================

interface VitalTileProps { icon: IconName; value: string | number; unit: string; label: string; color: string; colors: ThemeColors; }
const VitalTile: React.FC<VitalTileProps> = ({ icon, value, unit, label, color, colors }) => (
  <View style={[styles.vitalTile, { backgroundColor: colors.surface, borderColor: colors.border }]}>
    <View style={[styles.vitalTileIcon, { backgroundColor: color + '15' }]}>
      <Icon name={icon} size={16} color={color} />
    </View>
    <Text style={[styles.vitalTileValue, { color }]}>{value}<Text style={styles.vitalTileUnit}> {unit}</Text></Text>
    <Text style={[styles.vitalTileLabel, { color: colors.textMuted }]}>{label}</Text>
  </View>
);

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
};

const getScoreColor = (score: number, colors: ThemeColors) => {
  if (score >= 80) return colors.success;
  if (score >= 60) return colors.warning;
  return colors.error;
};

const getPriorityColor = (priority: string, colors: ThemeColors) => {
  switch (priority) {
    case 'high': return colors.error;
    case 'medium': return colors.warning;
    default: return colors.success;
  }
};

// ============================================
// STYLES
// ============================================

const TILE_W = (width - Spacing.lg * 2 - 10) / 2;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  scrollContent: { paddingHorizontal: Spacing.lg, paddingTop: 0, paddingBottom: 120 },
  pageHeader: { marginBottom: Spacing.md },

  /* Bracelet Pill */
  braceletPill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 24, marginBottom: Spacing.lg, gap: 8, borderWidth: 1 },
  braceletDot: { width: 7, height: 7, borderRadius: 4 },
  braceletText: { fontSize: 11, fontWeight: '600', flex: 1, textTransform: 'uppercase', letterSpacing: 0.5 },
  braceletBatt: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  braceletBattText: { fontSize: 11, fontWeight: '600' },

  /* Readiness Hero */
  readinessHero: { borderRadius: 24, padding: Spacing.xl, marginBottom: Spacing.lg, borderWidth: 0.5 },
  readinessTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  readinessEyebrow: { fontSize: 13, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 6 },
  readinessScoreRow: { flexDirection: 'row', alignItems: 'baseline' },
  readinessNum: { fontSize: 72, fontWeight: '200', letterSpacing: -3 },
  readinessPercent: { fontSize: 26, fontWeight: '400', marginLeft: 2 },

  /* Section Headers */
  sectionRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: Spacing.xl, marginBottom: Spacing.md },
  sectionDot: { width: 8, height: 8, borderRadius: 4 },
  sectionLabel: { fontSize: FontSizes.lg, fontWeight: '700', letterSpacing: -0.3 },

  /* Vitals Grid */
  vitalsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: Spacing.sm },
  vitalTile: { width: TILE_W, borderRadius: 20, padding: 16, gap: 6, borderWidth: 0.5 },
  vitalTileIcon: { width: 32, height: 32, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  vitalTileValue: { fontSize: 20, fontWeight: '800', letterSpacing: -0.4 },
  vitalTileUnit: { fontSize: 12, fontWeight: '500' },
  vitalTileLabel: { fontSize: 11, fontWeight: '600' },

  /* Sparkline */
  sparkCard: { borderRadius: 20, padding: Spacing.md, marginBottom: Spacing.sm, borderWidth: 0.5 },
  sparkRow: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' },
  sparkItem: { alignItems: 'center', gap: 4 },
  sparkItemLabel: { fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  sparkFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: Spacing.sm },
  sparkFooterText: { fontSize: 10 },

  /* Body Signals */
  bodySignalRow: { flexDirection: 'row', gap: 10 },
  bodySignalCard: { flex: 1, borderRadius: 18, padding: 14, alignItems: 'center', gap: 6, borderWidth: 0.5, borderColor: 'rgba(150,150,150,0.12)' },
  bodySignalIcon: { width: 34, height: 34, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  bodySignalValue: { fontSize: 18, fontWeight: '800', letterSpacing: -0.3 },
  bodySignalLabel: { fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.3 },

  /* Sleep */
  sleepRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', borderRadius: 20, padding: Spacing.lg, borderWidth: 0.5 },
  sleepDiv: { width: 1, height: 40 },
  sleepStat: { alignItems: 'center' },
  sleepStatBig: { fontSize: 22, fontWeight: '700', letterSpacing: -0.5 },
  sleepStatSub: { fontSize: 10, fontWeight: '600', marginTop: 4, textTransform: 'uppercase', letterSpacing: 0.4 },

  /* Insights */
  insightCard: { padding: Spacing.md, marginBottom: Spacing.sm },
  insightHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  insightPriorityBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  insightPriority: { fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  insightTime: { fontSize: FontSizes.xs },
  insightTitle: { fontSize: FontSizes.md, fontWeight: '700', marginBottom: 4 },
  insightDescription: { fontSize: FontSizes.sm, lineHeight: 18 },
  insightRec: { fontSize: FontSizes.sm, marginTop: 6, fontWeight: '600' },

  /* Notif */
  notifBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: Spacing.md, borderRadius: 14, marginTop: Spacing.md, borderWidth: 1 },
  notifBannerText: { fontSize: FontSizes.sm, fontWeight: '600' },

  bottomSpacer: { height: 20 },
});
