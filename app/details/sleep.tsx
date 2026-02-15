/**
 * Sleep Detail Page
 * Start sleep tracking from here. View previous nights' reports with
 * REM, deep, light, total sleep. When stopping, shows analytics before saving.
 * Date-driven: receives date from Activity page, shows that night's data.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions, Pressable, Modal } from 'react-native';
import { Icon, type IconName } from '@/components/ui/icon';
import { useLocalSearchParams } from 'expo-router';
import { NatureHeader } from '@/components/ui/nature-header';
import { GlassCard } from '@/components/ui/cards';
import { CircularProgress } from '@/components/ui/charts';
import { LivePulse, MiniSparkline } from '@/components/ui/indicators';
import { useApp } from '@/context/app-context';
import useTheme from '@/hooks/use-theme';
import { FontSizes, Spacing, BorderRadius } from '@/constants/theme';
import {
  getLastSleepSession,
  getRecentSleepSessions,
  startSleepSession,
  endSleepSession,
  type SleepRecord,
} from '@/services/database';

const { width } = Dimensions.get('window');

// ── Full mock sleep history (detailed per-night data) ──
const MOCK_SLEEP_NIGHTS = [
  {
    id: 'mock-today', date: '2026-02-15', weekday: 'Sun',
    total_duration_min: 440, deep_sleep_min: 76, light_sleep_min: 220, rem_sleep_min: 105, awake_min: 39,
    sleep_score: 80, avg_hr: 60, avg_hrv: 49, avg_spo2: 97, avg_rr: 13, skin_temp: 36.2,
    bedtime: '23:10', wakeup: '06:30', latency_min: 10, efficiency: 89,
  },
  {
    id: 'mock-0', date: '2026-02-14', weekday: 'Sat',
    total_duration_min: 455, deep_sleep_min: 88, light_sleep_min: 225, rem_sleep_min: 110, awake_min: 32,
    sleep_score: 87, avg_hr: 57, avg_hrv: 54, avg_spo2: 97, avg_rr: 13, skin_temp: 36.1,
    bedtime: '22:30', wakeup: '06:05', latency_min: 7, efficiency: 92,
  },
  {
    id: 'mock-1', date: '2026-02-13', weekday: 'Fri',
    total_duration_min: 462, deep_sleep_min: 82, light_sleep_min: 228, rem_sleep_min: 112, awake_min: 40,
    sleep_score: 85, avg_hr: 58, avg_hrv: 52, avg_spo2: 97, avg_rr: 13, skin_temp: 36.1,
    bedtime: '22:45', wakeup: '06:27', latency_min: 8, efficiency: 91,
  },
  {
    id: 'mock-2', date: '2026-02-12', weekday: 'Thu',
    total_duration_min: 398, deep_sleep_min: 55, light_sleep_min: 205, rem_sleep_min: 98, awake_min: 40,
    sleep_score: 68, avg_hr: 63, avg_hrv: 38, avg_spo2: 96, avg_rr: 15, skin_temp: 36.4,
    bedtime: '00:10', wakeup: '06:48', latency_min: 18, efficiency: 84,
  },
  {
    id: 'mock-3', date: '2026-02-11', weekday: 'Wed',
    total_duration_min: 480, deep_sleep_min: 95, light_sleep_min: 230, rem_sleep_min: 120, awake_min: 35,
    sleep_score: 91, avg_hr: 56, avg_hrv: 58, avg_spo2: 98, avg_rr: 12, skin_temp: 36.0,
    bedtime: '22:15', wakeup: '06:15', latency_min: 5, efficiency: 93,
  },
  {
    id: 'mock-4', date: '2026-02-10', weekday: 'Tue',
    total_duration_min: 420, deep_sleep_min: 68, light_sleep_min: 218, rem_sleep_min: 95, awake_min: 39,
    sleep_score: 76, avg_hr: 61, avg_hrv: 44, avg_spo2: 97, avg_rr: 14, skin_temp: 36.3,
    bedtime: '23:30', wakeup: '06:30', latency_min: 12, efficiency: 88,
  },
  {
    id: 'mock-5', date: '2026-02-09', weekday: 'Mon',
    total_duration_min: 510, deep_sleep_min: 105, light_sleep_min: 240, rem_sleep_min: 130, awake_min: 35,
    sleep_score: 94, avg_hr: 55, avg_hrv: 62, avg_spo2: 98, avg_rr: 12, skin_temp: 35.9,
    bedtime: '22:00', wakeup: '06:30', latency_min: 4, efficiency: 95,
  },
  {
    id: 'mock-6', date: '2026-02-08', weekday: 'Sun',
    total_duration_min: 365, deep_sleep_min: 42, light_sleep_min: 195, rem_sleep_min: 78, awake_min: 50,
    sleep_score: 55, avg_hr: 67, avg_hrv: 32, avg_spo2: 95, avg_rr: 16, skin_temp: 36.6,
    bedtime: '01:30', wakeup: '07:35', latency_min: 25, efficiency: 78,
  },
  {
    id: 'mock-7', date: '2026-02-07', weekday: 'Sat',
    total_duration_min: 445, deep_sleep_min: 78, light_sleep_min: 220, rem_sleep_min: 108, awake_min: 39,
    sleep_score: 82, avg_hr: 59, avg_hrv: 48, avg_spo2: 97, avg_rr: 13, skin_temp: 36.2,
    bedtime: '23:00', wakeup: '06:25', latency_min: 9, efficiency: 90,
  },
];

// Helper to format a Date to YYYY-MM-DD
const toDateKey = (d: Date) => d.toISOString().split('T')[0];

export default function SleepDetailScreen() {
  const { date: dateParam } = useLocalSearchParams<{ date?: string }>();
  const {
    latestReading, readinessScore,
    activeTracking, trackingElapsed, trackingHrHistory, trackingHrvHistory,
    startTracking, stopTracking, resetTracking,
  } = useApp();
  const { colors } = useTheme();
  const [lastSleep, setLastSleep] = useState<SleepRecord | null>(null);
  const [recentSleep, setRecentSleep] = useState<SleepRecord[]>([]);

  // Date navigation
  const [selectedDate, setSelectedDate] = useState(() => {
    if (dateParam) return new Date(dateParam);
    return new Date();
  });

  const isToday = toDateKey(selectedDate) === toDateKey(new Date());
  const shiftDate = (dir: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + dir);
    if (d <= new Date()) setSelectedDate(d);
  };
  const fmtDate = (d: Date) => {
    if (toDateKey(d) === toDateKey(new Date())) return 'Today';
    const y = new Date(); y.setDate(y.getDate() - 1);
    if (toDateKey(d) === toDateKey(y)) return 'Yesterday';
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  // Find the mock night matching selected date
  const selectedNightData = useMemo(() => {
    const key = toDateKey(selectedDate);
    return MOCK_SLEEP_NIGHTS.find(n => n.date === key) || null;
  }, [selectedDate]);

  // Derived tracking state (from global context)
  const isTracking = activeTracking?.type === 'sleep';
  const elapsed = trackingElapsed;
  const sessionId = activeTracking?.sessionId ?? null;
  const hrHistory = trackingHrHistory;
  const hrvHistory = trackingHrvHistory;

  // Post-sleep analytics modal
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [completedSession, setCompletedSession] = useState<{
    duration: number;
    deepMin: number;
    lightMin: number;
    remMin: number;
    awakeMin: number;
    sleepScore: number;
    avgHR: number;
    avgHRV: number;
  } | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [last, recent] = await Promise.all([
        getLastSleepSession(),
        getRecentSleepSessions(7),
      ]);
      setLastSleep(last);
      setRecentSleep(recent);
    } catch {}
  };

  const handleStartSleep = async () => {
    try {
      const id = await startSleepSession();
      startTracking('sleep', id);
    } catch {}
  };

  const handleStopSleep = async () => {
    const sid = sessionId ?? activeTracking?.sessionId ?? null;
    const data = stopTracking();
    const mins = data.elapsed / 60;
    const deepPct = 0.15 + Math.random() * 0.1;
    const remPct = 0.2 + Math.random() * 0.05;
    const awakePct = 0.05 + Math.random() * 0.05;
    const lightPct = 1 - deepPct - remPct - awakePct;
    const sleepScore = Math.min(100, Math.round(
      (mins >= 420 ? 40 : (mins / 420) * 40) + (deepPct * 150) + (remPct * 90) + (1 - awakePct / 0.1) * 10
    ));
    const avgHR = data.hrHistory.length > 0 ? Math.round(data.hrHistory.reduce((a, b) => a + b, 0) / data.hrHistory.length) : 62;
    const avgHRV = data.hrvHistory.length > 0 ? Math.round(data.hrvHistory.reduce((a, b) => a + b, 0) / data.hrvHistory.length) : 45;

    const sessionData = {
      duration: mins,
      deepMin: mins * deepPct,
      lightMin: mins * lightPct,
      remMin: mins * remPct,
      awakeMin: mins * awakePct,
      sleepScore,
      avgHR,
      avgHRV,
    };

    if (sid) {
      await endSleepSession(sid, {
        deep_sleep_min: sessionData.deepMin,
        light_sleep_min: sessionData.lightMin,
        rem_sleep_min: sessionData.remMin,
        awake_min: sessionData.awakeMin,
        sleep_score: sleepScore,
      });
    }

    setCompletedSession(sessionData);
    setShowAnalytics(true);
  };

  const handleDismissAnalytics = () => {
    setShowAnalytics(false);
    setCompletedSession(null);
    resetTracking();
    loadData();
  };

  // Use selected night data or fallback
  const n = selectedNightData;
  const sleepScore = n?.sleep_score || lastSleep?.sleep_score || 72;
  const totalMin = n?.total_duration_min || lastSleep?.total_duration_min || 420;
  const deepMin = n?.deep_sleep_min || lastSleep?.deep_sleep_min || 63;
  const lightMin = n?.light_sleep_min || lastSleep?.light_sleep_min || 210;
  const remMin = n?.rem_sleep_min || lastSleep?.rem_sleep_min || 105;
  const awakeMin = n?.awake_min || lastSleep?.awake_min || 42;
  const totalHrs = Math.floor(totalMin / 60);
  const totalMins = Math.round(totalMin % 60);

  const rhr = n?.avg_hr || latestReading?.heartRate || 62;
  const hrv = n?.avg_hrv || latestReading?.hrv || 48;
  const rr = n?.avg_rr || latestReading?.respiratoryRate || 14;
  const skinTemp = n?.skin_temp || latestReading?.skinTemperature || 36.2;
  const spo2 = n?.avg_spo2 || 97;
  const efficiency = n?.efficiency || Math.round(((totalMin - awakeMin) / totalMin) * 100);
  const latencyMin = n?.latency_min || 10;
  const bedtime = n?.bedtime || '23:00';
  const wakeup = n?.wakeup || '06:30';

  const deepPct = Math.round((deepMin / totalMin) * 100);
  const lightPct = Math.round((lightMin / totalMin) * 100);
  const remPct = Math.round((remMin / totalMin) * 100);
  const awakePct = Math.round((awakeMin / totalMin) * 100);

  const getScoreColor = (score: number) => {
    if (score >= 80) return '#4CAF50';
    if (score >= 60) return '#FF9800';
    return '#F44336';
  };

  const fmtDur = (s: number): string => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return h > 0
      ? `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
      : `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };

  const deepOk = deepPct >= 15;
  const remOk = remPct >= 20;
  const durationOk = totalMin >= 420;
  const hrvOk = hrv >= 40;
  const effOk = efficiency >= 85;

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      {/* Post-sleep analytics modal */}
      <Modal visible={showAnalytics} transparent animationType="slide">
        <View style={[styles.analyticsModal, { backgroundColor: colors.background }]}>
          <ScrollView contentContainerStyle={styles.analyticsScroll} showsVerticalScrollIndicator={false}>
            <View style={styles.analyticsHeader}>
              <Icon name="moon-waning-crescent" size={36} color={colors.sleep} />
              <Text style={[styles.analyticsTitle, { color: colors.text }]}>Sleep Complete</Text>
              <Text style={[styles.analyticsSub, { color: colors.textSecondary }]}>Here's how you slept</Text>
            </View>

            {completedSession && (
              <>
                <View style={styles.analyticsScoreRow}>
                  <CircularProgress
                    progress={completedSession.sleepScore}
                    size={140}
                    strokeWidth={10}
                    color={getScoreColor(completedSession.sleepScore)}
                    label={`${completedSession.sleepScore}`}
                  />
                </View>

                <GlassCard style={styles.analyticsDuration}>
                  <Text style={[styles.durationValue, { color: colors.text }]}>
                    {Math.floor(completedSession.duration / 60)}h {Math.round(completedSession.duration % 60)}m
                  </Text>
                  <Text style={[styles.durationLabel, { color: colors.textMuted }]}>Total Sleep Time</Text>
                </GlassCard>

                <GlassCard style={styles.analyticsStages}>
                  <Text style={[styles.analyticsSectionTitle, { color: colors.text }]}>Sleep Stages</Text>
                  <View style={styles.stagesBar}>
                    <View style={[styles.stageSegment, { flex: completedSession.deepMin, backgroundColor: '#3F51B5' }]} />
                    <View style={[styles.stageSegment, { flex: completedSession.lightMin, backgroundColor: '#7986CB' }]} />
                    <View style={[styles.stageSegment, { flex: completedSession.remMin, backgroundColor: '#9C27B0' }]} />
                    <View style={[styles.stageSegment, { flex: completedSession.awakeMin, backgroundColor: '#FF9800' }]} />
                  </View>
                  <View style={styles.stagesList}>
                    <AnalyticsStageRow label="Deep Sleep" mins={completedSession.deepMin} color="#3F51B5" total={completedSession.duration} colors={colors} />
                    <AnalyticsStageRow label="Light Sleep" mins={completedSession.lightMin} color="#7986CB" total={completedSession.duration} colors={colors} />
                    <AnalyticsStageRow label="REM Sleep" mins={completedSession.remMin} color="#9C27B0" total={completedSession.duration} colors={colors} />
                    <AnalyticsStageRow label="Awake" mins={completedSession.awakeMin} color="#FF9800" total={completedSession.duration} colors={colors} />
                  </View>
                </GlassCard>

                <GlassCard style={styles.analyticsVitals}>
                  <Text style={[styles.analyticsSectionTitle, { color: colors.text }]}>Overnight Vitals</Text>
                  <View style={styles.vitalsRow}>
                    <View style={styles.vitalBox}>
                      <Icon name="heart" size={20} color={colors.heartRate} />
                      <Text style={[styles.vitalBoxValue, { color: colors.text }]}>{completedSession.avgHR}</Text>
                      <Text style={[styles.vitalBoxLabel, { color: colors.textMuted }]}>Avg HR</Text>
                    </View>
                    <View style={styles.vitalBox}>
                      <Icon name="pulse" size={20} color={colors.hrv} />
                      <Text style={[styles.vitalBoxValue, { color: colors.text }]}>{completedSession.avgHRV}</Text>
                      <Text style={[styles.vitalBoxLabel, { color: colors.textMuted }]}>Avg HRV</Text>
                    </View>
                  </View>
                </GlassCard>
              </>
            )}

            <Pressable
              style={[styles.saveBtn, { backgroundColor: colors.buttonPrimary }]}
              onPress={handleDismissAnalytics}
            >
              <Icon name="check" size={20} color={colors.buttonPrimaryText} />
              <Text style={[styles.saveBtnText, { color: colors.buttonPrimaryText }]}>Save & Close</Text>
            </Pressable>
          </ScrollView>
        </View>
      </Modal>

      <ScrollView bounces={false} showsVerticalScrollIndicator={false}>
        <NatureHeader
          title="Sleep Analysis"
          subtitle={isTracking ? 'Currently tracking...' : "Track & review your sleep"}
          variant="sleep"
          icon="moon-waning-crescent"
        />

        <View style={styles.content}>
          {/* Active Tracking Card */}
          {isTracking ? (
            <GlassCard style={styles.trackingCard}>
              <View style={styles.trackingHeader}>
                <View style={styles.trackingLive}>
                  <LivePulse color={colors.sleep} size={6} />
                  <Text style={[styles.trackingLiveText, { color: colors.sleep }]}>Sleep Tracking Active</Text>
                </View>
              </View>
              <Text style={[styles.trackingTimer, { color: colors.text }]}>{fmtDur(elapsed)}</Text>

              <View style={styles.liveVitalsRow}>
                <View style={styles.liveVitalBox}>
                  <Icon name="heart" size={16} color={colors.heartRate} />
                  <Text style={[styles.liveVitalValue, { color: colors.heartRate }]}>{latestReading?.heartRate || 62}</Text>
                  <Text style={[styles.liveVitalUnit, { color: colors.textMuted }]}>bpm</Text>
                </View>
                <View style={styles.liveVitalBox}>
                  <Icon name="pulse" size={16} color={colors.hrv} />
                  <Text style={[styles.liveVitalValue, { color: colors.hrv }]}>{latestReading?.hrv || 48}</Text>
                  <Text style={[styles.liveVitalUnit, { color: colors.textMuted }]}>ms</Text>
                </View>
                <View style={styles.liveVitalBox}>
                  <Icon name="water" size={16} color={colors.oxygen} />
                  <Text style={[styles.liveVitalValue, { color: colors.oxygen }]}>{latestReading?.bloodOxygen || 97}%</Text>
                  <Text style={[styles.liveVitalUnit, { color: colors.textMuted }]}>SpO₂</Text>
                </View>
                <View style={styles.liveVitalBox}>
                  <Icon name="thermometer" size={16} color="#FF7043" />
                  <Text style={[styles.liveVitalValue, { color: '#FF7043' }]}>{(latestReading?.skinTemperature || 36.2).toFixed(1)}</Text>
                  <Text style={[styles.liveVitalUnit, { color: colors.textMuted }]}>°C</Text>
                </View>
              </View>

              {hrHistory.length > 3 && (
                <View style={styles.trackingSparklines}>
                  <View style={styles.sparkItem}>
                    <Text style={[styles.sparkLabel, { color: colors.textMuted }]}>Heart Rate</Text>
                    <MiniSparkline data={hrHistory} color={colors.heartRate} width={(width - 100) / 2} height={32} />
                  </View>
                  <View style={styles.sparkItem}>
                    <Text style={[styles.sparkLabel, { color: colors.textMuted }]}>HRV</Text>
                    <MiniSparkline data={hrvHistory} color={colors.hrv} width={(width - 100) / 2} height={32} />
                  </View>
                </View>
              )}

              <Pressable
                style={[styles.stopBtn, { backgroundColor: '#F44336' }]}
                onPress={handleStopSleep}
              >
                <Icon name="stop-circle-outline" size={22} color="#fff" />
                <Text style={styles.stopBtnText}>Stop & View Analytics</Text>
              </Pressable>
            </GlassCard>
          ) : (
            <Pressable
              style={[styles.startCard, { backgroundColor: colors.sleep + '20', borderColor: colors.sleep + '40' }]}
              onPress={handleStartSleep}
            >
              <View style={[styles.startIconWrap, { backgroundColor: colors.sleep + '30' }]}>
                <Icon name="moon-waning-crescent" size={32} color={colors.sleep} />
              </View>
              <Text style={[styles.startTitle, { color: colors.text }]}>Start Sleep Tracking</Text>
              <Text style={[styles.startDesc, { color: colors.textSecondary }]}>
                Tap to begin tracking your sleep.
              </Text>
            </Pressable>
          )}

          {/* ═══ Date Navigation ═══ */}
          {!isTracking && (
            <>
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

              {/* ═══ Sleep Data for Selected Date ═══ */}
              {selectedNightData ? (
                <>
                  {/* Score Hero */}
                  <GlassCard style={styles.heroCard}>
                    <View style={styles.heroRow}>
                      <View style={styles.heroLeft}>
                        <Text style={[styles.heroLabel, { color: colors.textSecondary }]}>Sleep Score</Text>
                        <Text style={[styles.heroValue, { color: getScoreColor(sleepScore) }]}>
                          {sleepScore}
                          <Text style={styles.heroUnit}>/100</Text>
                        </Text>
                        <Text style={[styles.heroDuration, { color: colors.text }]}>
                          {totalHrs}h {totalMins}m total
                        </Text>
                        <Text style={[styles.heroTimeSub, { color: colors.textMuted }]}>
                          {bedtime} → {wakeup}
                        </Text>
                      </View>
                      <CircularProgress
                        progress={sleepScore}
                        size={110}
                        strokeWidth={10}
                        color={getScoreColor(sleepScore)}
                        label={`${sleepScore}`}
                      />
                    </View>
                  </GlassCard>

                  {/* Sleep Stages */}
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>Sleep Stages</Text>
                  <GlassCard style={styles.stagesCard}>
                    <View style={styles.stagesBar}>
                      <View style={[styles.stageSegment, { flex: deepMin, backgroundColor: '#3F51B5', borderTopLeftRadius: 7, borderBottomLeftRadius: 7 }]} />
                      <View style={[styles.stageSegment, { flex: lightMin, backgroundColor: '#7986CB' }]} />
                      <View style={[styles.stageSegment, { flex: remMin, backgroundColor: '#9C27B0' }]} />
                      <View style={[styles.stageSegment, { flex: awakeMin, backgroundColor: '#FF9800', borderTopRightRadius: 7, borderBottomRightRadius: 7 }]} />
                    </View>
                    <View style={styles.stagesList}>
                      <StageRow label="Deep Sleep" mins={deepMin} pct={deepPct} color="#3F51B5" ideal="15-25%" colors={colors} />
                      <StageRow label="Light Sleep" mins={lightMin} pct={lightPct} color="#7986CB" ideal="45-55%" colors={colors} />
                      <StageRow label="REM Sleep" mins={remMin} pct={remPct} color="#9C27B0" ideal="20-25%" colors={colors} />
                      <StageRow label="Awake" mins={awakeMin} pct={awakePct} color="#FF9800" ideal="<10%" colors={colors} />
                    </View>
                  </GlassCard>

                  {/* Overnight Vitals */}
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>Overnight Vitals</Text>
                  <GlassCard style={styles.vitalsCard}>
                    <View style={styles.vitalsGrid}>
                      <VitalItem label="Resting HR" value={`${rhr}`} unit="bpm" icon="heart" color={colors.heartRate} colors={colors} />
                      <VitalItem label="HRV" value={`${hrv}`} unit="ms" icon="pulse" color={colors.hrv} colors={colors} />
                      <VitalItem label="SpO₂" value={`${spo2}`} unit="%" icon="water" color={colors.oxygen} colors={colors} />
                      <VitalItem label="Skin Temp" value={skinTemp.toFixed(1)} unit="°C" icon="thermometer" color="#FF7043" colors={colors} />
                      <VitalItem label="Resp. Rate" value={`${rr}`} unit="br/min" icon="cloud-outline" color="#42A5F5" colors={colors} />
                      <VitalItem label="Fell Asleep" value={`${latencyMin}`} unit="min" icon="clock-outline" color="#AB47BC" colors={colors} />
                    </View>
                  </GlassCard>

                  {/* Sleep Quality */}
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>Sleep Quality</Text>
                  <GlassCard style={styles.qualityCard}>
                    <QualityRow label="Sleep Efficiency" value={`${efficiency}%`} status={effOk ? 'good' : 'needs-work'} colors={colors} />
                    <QualityRow label="Deep Sleep Ratio" value={`${deepPct}%`} status={deepOk ? 'good' : 'needs-work'} colors={colors} />
                    <QualityRow label="REM Ratio" value={`${remPct}%`} status={remOk ? 'good' : 'needs-work'} colors={colors} />
                    <QualityRow label="Sleep Duration" value={`${totalHrs}h ${totalMins}m`} status={durationOk ? 'good' : 'needs-work'} colors={colors} />
                    <QualityRow label="HRV Recovery" value={`${hrv} ms`} status={hrvOk ? 'good' : 'needs-work'} colors={colors} />
                    <QualityRow label="Sleep Latency" value={`${latencyMin} min`} status={latencyMin <= 15 ? 'good' : 'needs-work'} colors={colors} />
                    <QualityRow label="Blood Oxygen" value={`${spo2}%`} status={spo2 >= 95 ? 'good' : 'needs-work'} colors={colors} />
                  </GlassCard>

                  {/* Insights */}
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>Insights</Text>
                  <GlassCard style={styles.qualityCard}>
                    {durationOk
                      ? <InsightRow icon="check-circle" text="You got enough sleep — great job!" color="#4CAF50" colors={colors} />
                      : <InsightRow icon="alert-circle" text={`You slept ${totalHrs}h ${totalMins}m — aim for 7+ hours.`} color="#FF9800" colors={colors} />
                    }
                    {deepOk
                      ? <InsightRow icon="check-circle" text={`Deep sleep at ${deepPct}% — excellent recovery.`} color="#4CAF50" colors={colors} />
                      : <InsightRow icon="alert-circle" text={`Deep sleep at ${deepPct}% — below ideal 15%.`} color="#FF9800" colors={colors} />
                    }
                    {remOk
                      ? <InsightRow icon="check-circle" text={`REM at ${remPct}% — good for memory.`} color="#4CAF50" colors={colors} />
                      : <InsightRow icon="alert-circle" text={`REM at ${remPct}% — below ideal 20%.`} color="#FF9800" colors={colors} />
                    }
                    {hrvOk
                      ? <InsightRow icon="check-circle" text={`HRV ${hrv}ms — good autonomic balance.`} color="#4CAF50" colors={colors} />
                      : <InsightRow icon="alert-circle" text={`HRV ${hrv}ms — stress may be elevated.`} color="#FF9800" colors={colors} />
                    }
                  </GlassCard>
                </>
              ) : (
                <GlassCard style={styles.heroCard}>
                  <View style={{ alignItems: 'center', paddingVertical: 32 }}>
                    <Icon name="moon-waning-crescent" size={36} color={colors.textMuted} />
                    <Text style={[styles.startTitle, { color: colors.textMuted, marginTop: 12 }]}>No Sleep Data</Text>
                    <Text style={[styles.startDesc, { color: colors.textMuted }]}>No sleep data for this date. Navigate to another night.</Text>
                  </View>
                </GlassCard>
              )}
            </>
          )}

          <View style={{ height: 40 }} />
        </View>
      </ScrollView>
    </View>
  );
}

// ── Insight row ──
const InsightRow = ({ icon, text, color, colors }: { icon: IconName; text: string; color: string; colors: any }) => (
  <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 4 }}>
    <Icon name={icon} size={16} color={color} />
    <Text style={{ fontSize: 13, flex: 1, lineHeight: 20, color: colors.textSecondary }}>{text}</Text>
  </View>
);

// ── Sub-components ──

const AnalyticsStageRow = ({ label, mins, color, total, colors }: { label: string; mins: number; color: string; total: number; colors: any }) => (
  <View style={styles.stageRow}>
    <View style={[styles.stageDot, { backgroundColor: color }]} />
    <View style={styles.stageInfo}>
      <Text style={[styles.stageName, { color: colors.text }]}>{label}</Text>
    </View>
    <View style={styles.stageRight}>
      <Text style={[styles.stageMins, { color: colors.text }]}>{Math.round(mins)}m</Text>
      <Text style={[styles.stagePct, { color: colors.textMuted }]}>{Math.round((mins / total) * 100)}%</Text>
    </View>
  </View>
);

interface StageRowProps {
  label: string; mins: number; pct: number; color: string; ideal: string; colors: any;
}
const StageRow = ({ label, mins, pct, color, ideal, colors }: StageRowProps) => (
  <View style={styles.stageRow}>
    <View style={[styles.stageDot, { backgroundColor: color }]} />
    <View style={styles.stageInfo}>
      <Text style={[styles.stageName, { color: colors.text }]}>{label}</Text>
      <Text style={[styles.stageIdeal, { color: colors.textMuted }]}>Ideal: {ideal}</Text>
    </View>
    <View style={styles.stageRight}>
      <Text style={[styles.stageMins, { color: colors.text }]}>{Math.round(mins)}m</Text>
      <Text style={[styles.stagePct, { color: colors.textMuted }]}>{pct}%</Text>
    </View>
  </View>
);

interface VitalItemProps {
  label: string; value: string; unit: string; icon: IconName; color: string; colors: any;
}
const VitalItem = ({ label, value, unit, icon, color, colors }: VitalItemProps) => (
  <View style={styles.vitalItem}>
    <Icon name={icon} size={20} color={color} />
    <Text style={[styles.vitalValue, { color: colors.text }]}>{value}<Text style={[styles.vitalUnit, { color: colors.textMuted }]}> {unit}</Text></Text>
    <Text style={[styles.vitalLabel, { color: colors.textMuted }]}>{label}</Text>
  </View>
);

interface QualityRowProps {
  label: string; value: string; status: 'good' | 'needs-work'; colors: any;
}
const QualityRow = ({ label, value, status, colors }: QualityRowProps) => (
  <View style={styles.qualityRow}>
    <View style={styles.qualityLeft}>
      <Icon name={status === 'good' ? 'check-circle' : 'alert-circle'} size={18} color={status === 'good' ? '#4CAF50' : '#FF9800'} />
      <Text style={[styles.qualityLabel, { color: colors.text }]}>{label}</Text>
    </View>
    <Text style={[styles.qualityValue, { color: status === 'good' ? '#4CAF50' : '#FF9800' }]}>{value}</Text>
  </View>
);

// ── Styles ──

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg },

  // Start card
  startCard: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: Spacing.xl,
    borderRadius: 22,
    borderWidth: 1,
    marginBottom: Spacing.lg,
  },
  startIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  startTitle: { fontSize: FontSizes.xl, fontWeight: '700', marginBottom: Spacing.sm },
  startDesc: { fontSize: FontSizes.sm, textAlign: 'center', lineHeight: 20 },

  // Tracking card
  trackingCard: { marginBottom: Spacing.lg },
  trackingHeader: { flexDirection: 'row', justifyContent: 'center', marginBottom: Spacing.md },
  trackingLive: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  trackingLiveText: { fontSize: FontSizes.sm, fontWeight: '600', letterSpacing: 0.5 },
  trackingTimer: { fontSize: 56, fontWeight: '100', textAlign: 'center', letterSpacing: -2, marginBottom: Spacing.lg },
  trackingSparklines: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: Spacing.lg },
  sparkItem: { alignItems: 'center', gap: 4 },
  sparkLabel: { fontSize: 10, letterSpacing: 0.3 },
  stopBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 14 },
  stopBtnText: { color: '#fff', fontSize: FontSizes.md, fontWeight: '600' },

  // Analytics modal
  analyticsModal: { flex: 1, paddingTop: 60 },
  analyticsScroll: { paddingHorizontal: Spacing.lg, paddingBottom: 60 },
  analyticsHeader: { alignItems: 'center', marginBottom: Spacing.xl },
  analyticsTitle: { fontSize: FontSizes.xxl, fontWeight: '300', marginTop: Spacing.md },
  analyticsSub: { fontSize: FontSizes.sm, marginTop: 4 },
  analyticsScoreRow: { alignItems: 'center', marginBottom: Spacing.xl },
  analyticsDuration: { alignItems: 'center', marginBottom: Spacing.md },
  durationValue: { fontSize: 32, fontWeight: '300', letterSpacing: -1 },
  durationLabel: { fontSize: FontSizes.sm, marginTop: 4 },
  analyticsStages: { marginBottom: Spacing.md },
  analyticsSectionTitle: { fontSize: FontSizes.lg, fontWeight: '600', marginBottom: Spacing.md },
  analyticsVitals: { marginBottom: Spacing.xl },
  vitalsRow: { flexDirection: 'row', justifyContent: 'space-around' },
  vitalBox: { alignItems: 'center', gap: 6 },
  vitalBoxValue: { fontSize: 24, fontWeight: '600' },
  vitalBoxLabel: { fontSize: 11 },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, borderRadius: 14 },
  saveBtnText: { fontSize: FontSizes.md, fontWeight: '600' },

  // Existing detail styles
  heroCard: { marginBottom: Spacing.md },
  heroRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  heroLeft: {},
  heroLabel: { fontSize: FontSizes.sm, marginBottom: 4 },
  heroValue: { fontSize: 52, fontWeight: '300', letterSpacing: -2 },
  heroUnit: { fontSize: 20, fontWeight: '400' },
  heroDuration: { fontSize: FontSizes.md, fontWeight: '500', marginTop: 4 },
  heroTimeSub: { fontSize: FontSizes.sm, marginTop: 2 },

  // Date navigation bar
  dateBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 16, borderWidth: 1, marginBottom: Spacing.md },
  dateCenter: { alignItems: 'center' },
  dateText: { fontSize: FontSizes.md, fontWeight: '700' },
  dateSub: { fontSize: 11, marginTop: 2 },

  sectionTitle: { fontSize: FontSizes.lg, fontWeight: '700', marginBottom: Spacing.md, marginTop: Spacing.lg, letterSpacing: -0.3 },

  stagesCard: { marginBottom: Spacing.md },
  stagesBar: { flexDirection: 'row', height: 14, borderRadius: 7, overflow: 'hidden', marginBottom: Spacing.lg },
  stageSegment: {},
  stagesList: { gap: 14 },
  stageRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  stageDot: { width: 10, height: 10, borderRadius: 5 },
  stageInfo: { flex: 1 },
  stageName: { fontSize: FontSizes.md, fontWeight: '500' },
  stageIdeal: { fontSize: 11, marginTop: 1 },
  stageRight: { alignItems: 'flex-end' },
  stageMins: { fontSize: FontSizes.md, fontWeight: '600' },
  stagePct: { fontSize: 11, marginTop: 1 },

  vitalsCard: { marginBottom: Spacing.md },
  vitalsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md },
  vitalItem: { width: (width - Spacing.lg * 2 - Spacing.md * 3) / 2, alignItems: 'center', gap: 6, paddingVertical: Spacing.sm },
  vitalValue: { fontSize: FontSizes.lg, fontWeight: '600' },
  vitalUnit: { fontSize: FontSizes.sm, fontWeight: '400' },
  vitalLabel: { fontSize: 11 },

  qualityCard: { marginBottom: Spacing.md, gap: 14 },
  qualityRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  qualityLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  qualityLabel: { fontSize: FontSizes.md },
  qualityValue: { fontSize: FontSizes.md, fontWeight: '600' },

  trendCard: { marginBottom: Spacing.md },
  trendRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' },
  trendItem: { alignItems: 'center' },
  trendValue: { fontSize: FontSizes.xl, fontWeight: '700', letterSpacing: -0.5 },
  trendLabel: { fontSize: 11, marginTop: 4 },
  trendDivider: { width: 1, height: 36 },

  // Nightly list rows (tappable)
  nightCard: { marginBottom: Spacing.sm, paddingVertical: 4 },
  nightRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  nightIconWrap: { width: 42, height: 42, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  nightInfo: { flex: 1 },
  nightDate: { fontSize: FontSizes.md, fontWeight: '600' },
  nightDuration: { fontSize: 11, marginTop: 2 },
  nightScoreWrap: { marginRight: 4 },
  nightScore: { fontSize: 22, fontWeight: '700' },
  miniStagesBar: { flexDirection: 'row', height: 5, borderRadius: 3, overflow: 'hidden', marginLeft: 54 },
  miniStageSegment: {},

  // Live vitals during tracking
  liveVitalsRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: Spacing.md, paddingVertical: Spacing.sm },
  liveVitalBox: { alignItems: 'center', gap: 4 },
  liveVitalValue: { fontSize: 20, fontWeight: '700' },
  liveVitalUnit: { fontSize: 10 },

});
