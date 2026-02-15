/**
 * ELVA Activity & Movement Screen
 * Shows daily scores for Sleep, Sport, Readiness, Recovery.
 * Each category is a tappable card with score overview.
 * Sleep and Sport support live tracking sessions.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  StatusBar,
  Dimensions,
  Modal,
} from 'react-native';
import { Icon, type IconName } from '@/components/ui/icon';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { GlassCard } from '@/components/ui/cards';
import { MiniSparkline, LivePulse } from '@/components/ui/indicators';
import { CircularProgress } from '@/components/ui/charts';
import { DynamicBackground } from '@/components/ui/dynamic-background';
import { ElvaLogo } from '@/components/ui/logo';
import { useApp } from '@/context/app-context';
import useTheme from '@/hooks/use-theme';
import { FontSizes, Spacing, LogoSize, type ThemeColors } from '@/constants/theme';
import {
  startActivity,
  endActivity,
  updateActiveActivity,
  getActiveActivity,
  getActiveSleepSession,
  startSleepSession,
  endSleepSession,
  getLastSleepSession,
  getActivityStats,
  type ActivityType,
  type SleepRecord,
} from '@/services/database';
import { getBraceletSimulator, type BraceletReading } from '@/services/bracelet-simulator';
import { getRecoveryData, getTodayActivity } from '@/data/mock-data';

const { width } = Dimensions.get('window');

export default function ActivityScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { readinessScore, latestReading } = useApp();

  const [activeSession, setActiveSession] = useState<{
    id: number;
    type: ActivityType | 'sleep';
    startTime: Date;
    config: { key: string; label: string; icon: IconName; color: string };
  } | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [reading, setReading] = useState<BraceletReading | null>(null);
  const [hrHistory, setHrHistory] = useState<number[]>([]);
  const [smo2History, setSmo2History] = useState<number[]>([]);
  const [showStop, setShowStop] = useState(false);
  const [lastSleep, setLastSleep] = useState<SleepRecord | null>(null);
  const [actStats, setActStats] = useState<any>(null);
  const [selectedDate] = useState(new Date());

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const readingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const recovery = getRecoveryData();
  const activity = getTodayActivity();

  useEffect(() => {
    checkActive();
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [sleep, stats] = await Promise.all([
        getLastSleepSession(),
        getActivityStats(7),
      ]);
      setLastSleep(sleep);
      setActStats(stats);
    } catch {}
  };

  useEffect(() => {
    if (!activeSession) return;
    timerRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - activeSession.startTime.getTime()) / 1000));
    }, 1000);
    readingRef.current = setInterval(() => {
      const sim = getBraceletSimulator();
      const r = sim.getLastReading();
      setReading(r);
      setHrHistory(prev => [...prev.slice(-29), r.heartRate]);
      setSmo2History(prev => [...prev.slice(-29), r.muscleOxygen]);
    }, 2000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (readingRef.current) clearInterval(readingRef.current);
    };
  }, [activeSession]);

  const checkActive = async () => {
    try {
      const active = await getActiveActivity();
      if (active) {
        setActiveSession({ id: active.id!, type: active.type as ActivityType, startTime: new Date(active.start_time), config: { key: 'sport', label: 'Sport', icon: 'run', color: '#FF7043' } });
      }
      const sleep = await getActiveSleepSession();
      if (sleep) {
        setActiveSession({ id: sleep.id!, type: 'sleep', startTime: new Date(sleep.start_time), config: { key: 'sleep', label: 'Sleep', icon: 'moon-waning-crescent', color: '#7986CB' } });
      }
    } catch {}
  };

  const onTapCategory = (key: string, route: string) => {
    if (activeSession) {
      if ((key === 'sleep' && activeSession.type === 'sleep') ||
          (key === 'sport' && activeSession.type !== 'sleep')) {
        setShowStop(true);
        return;
      }
    }
    router.push({ pathname: route as any, params: { date: selectedDate.toISOString() } });
  };

  const confirmStopSession = async () => {
    if (!activeSession) return;
    setShowStop(false);
    const mins = elapsed / 60;
    if (activeSession.type === 'sleep') {
      const deepPct = 0.15 + Math.random() * 0.1;
      const remPct = 0.2 + Math.random() * 0.05;
      const awakePct = 0.05 + Math.random() * 0.05;
      const lightPct = 1 - deepPct - remPct - awakePct;
      const sleepScore = Math.min(100, Math.round(
        (mins >= 420 ? 40 : (mins / 420) * 40) + (deepPct * 150) + (remPct * 90) + (1 - awakePct / 0.1) * 10
      ));
      await endSleepSession(activeSession.id, {
        deep_sleep_min: mins * deepPct,
        light_sleep_min: mins * lightPct,
        rem_sleep_min: mins * remPct,
        awake_min: mins * awakePct,
        sleep_score: sleepScore,
      });
    } else {
      const calories = mins * 10;
      const steps = Math.round(mins * 140);
      const distance = mins * 0.12;
      const avgHR = hrHistory.length > 0 ? Math.round(hrHistory.reduce((a, b) => a + b, 0) / hrHistory.length) : 0;
      const maxHR = hrHistory.length > 0 ? Math.max(...hrHistory) : 0;
      const avgSmO2 = smo2History.length > 0 ? Math.round(smo2History.reduce((a, b) => a + b, 0) / smo2History.length) : undefined;
      await updateActiveActivity(activeSession.id, {
        duration_sec: elapsed, calories_burned: Math.round(calories), steps,
        distance_km: Math.round(distance * 100) / 100,
        avg_heart_rate: avgHR, max_heart_rate: maxHR, avg_muscle_oxygen: avgSmO2,
      });
      await endActivity(activeSession.id);
    }
    setActiveSession(null);
    setElapsed(0);
    setHrHistory([]);
    setSmo2History([]);
    setReading(null);
    loadData();
  };

  // Scores
  const sleepScore = lastSleep?.sleep_score || 72;
  const sleepDuration = lastSleep?.total_duration_min || 420;
  const sleepHrs = Math.floor(sleepDuration / 60);
  const sleepMins = Math.round(sleepDuration % 60);
  const sportSessions = actStats?.total_sessions || 0;
  const sportCalories = Math.round(actStats?.total_calories || 0);
  const recoveryScore = recovery.recoveryScore;
  const strainLevel = Math.min(100, (activity.caloriesBurned / 500) * 100);
  const hr = latestReading?.heartRate || 72;
  const smo2 = latestReading?.muscleOxygen || 65;

  const getScoreColor = (score: number) => {
    if (score >= 80) return '#4CAF50';
    if (score >= 60) return '#FF9800';
    return '#F44336';
  };

  const smo2Warning = reading && reading.muscleOxygen < 40;

  // selectedDate always "today" — detail pages have their own date nav

  return (
    <DynamicBackground readinessScore={readinessScore} image={activeSession ? (activeSession.type === 'sleep' ? 'sunset' : 'green-mountains') : undefined} plain={!activeSession}>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <StatusBar barStyle={colors.text === '#FFFFFF' ? 'light-content' : 'dark-content'} />

        {/* Stop Modal */}
        <Modal visible={showStop} transparent animationType="fade" onRequestClose={() => setShowStop(false)}>
          <View style={styles.overlay}>
            <View style={[styles.modal, { backgroundColor: colors.surface }]}>
              <Icon name="pause-circle-outline" size={36} color={colors.text} style={{ marginBottom: 12 }} />
              <Text style={[styles.modalTitle, { color: colors.text }]}>End Session</Text>
              <Text style={[styles.modalSub, { color: colors.textSecondary }]}>{fmtDur(elapsed)}</Text>
              <View style={styles.modalRow}>
                <Pressable style={[styles.modalBtn, { backgroundColor: colors.surfaceSecondary }]} onPress={() => setShowStop(false)}>
                  <Text style={[styles.modalBtnText, { color: colors.textSecondary }]}>Resume</Text>
                </Pressable>
                <Pressable style={[styles.modalBtn, { backgroundColor: colors.error }]} onPress={confirmStopSession}>
                  <Text style={[styles.modalBtnText, { color: '#FFF' }]}>Save & End</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.pageHeader}>
            <ElvaLogo size={LogoSize.header} heartRate={72} variant="solid" />
          </View>

          {/* Active Session Live Card */}
          {activeSession && (
            <GlassCard style={styles.sessionCard}>
              <View style={styles.sessionHeader}>
                <View style={styles.sessionType}>
                  <Icon name={activeSession.config.icon} size={22} color={activeSession.config.color} />
                  <Text style={[styles.sessionLabel, { color: colors.text }]}>{activeSession.config.label}</Text>
                </View>
                <View style={styles.liveChip}>
                  <LivePulse color={colors.success} size={4} />
                  <Text style={[styles.liveChipText, { color: colors.success }]}>Live</Text>
                </View>
              </View>
              <Text style={[styles.timer, { color: colors.text }]}>{fmtDur(elapsed)}</Text>
              {reading && (
                <View style={styles.vitalsRow}>
                  <Vital label="HR" value={reading.heartRate} unit="bpm" color={colors.heartRate} colors={colors} />
                  <Vital label="HRV" value={reading.hrv} unit="ms" color={colors.hrv} colors={colors} />
                  <Vital label="SmO₂" value={Math.round(reading.muscleOxygen)} unit="%" color={smo2Warning ? colors.error : colors.muscleOxygen} colors={colors} />
                </View>
              )}
              {smo2Warning && (
                <View style={[styles.warningBar, { backgroundColor: colors.error + '15' }]}>
                  <Icon name="alert-circle" size={16} color={colors.error} />
                  <Text style={[styles.warningText, { color: colors.error }]}>Muscle oxygen low — consider rest</Text>
                </View>
              )}
              {hrHistory.length > 5 && (
                <View style={styles.sparkRow}>
                  <View style={styles.sparkItem}>
                    <Text style={[styles.sparkLabel, { color: colors.textMuted }]}>Heart Rate</Text>
                    <MiniSparkline data={hrHistory} color={colors.heartRate} width={(width - 80) / 2} height={32} />
                  </View>
                  <View style={styles.sparkItem}>
                    <Text style={[styles.sparkLabel, { color: colors.textMuted }]}>Muscle O₂</Text>
                    <MiniSparkline data={smo2History} color={colors.muscleOxygen} width={(width - 80) / 2} height={32} />
                  </View>
                </View>
              )}
              <Pressable style={[styles.endBtn, { borderColor: colors.border }]} onPress={() => setShowStop(true)}>
                <Icon name="stop-circle-outline" size={20} color={colors.text} />
                <Text style={[styles.endBtnText, { color: colors.text }]}>End Session</Text>
              </Pressable>
            </GlassCard>
          )}

          {/* ══════ DATE NAV + CATEGORY CARDS ══════ */}
          {!activeSession && (
            <>
              {/* Category Cards — vertical list */}
              <View style={styles.categoryList}>
                {/* Sleep */}
                <Pressable style={[styles.catCard, { backgroundColor: colors.surface }]} onPress={() => onTapCategory('sleep', '/details/sleep')}>
                  <View style={[styles.catIconWrap, { backgroundColor: '#7986CB15' }]}>  
                    <Icon name="moon-waning-crescent" size={24} color="#7986CB" />
                  </View>
                  <View style={styles.catInfo}>
                    <Text style={[styles.catTitle, { color: colors.text }]}>Sleep</Text>
                    <Text style={[styles.catSub, { color: colors.textMuted }]}>{sleepHrs}h {sleepMins}m</Text>
                  </View>
                  <View style={styles.catScoreWrap}>
                    <Text style={[styles.catScore, { color: getScoreColor(sleepScore) }]}>{sleepScore}</Text>
                  </View>
                  <View style={[styles.catTrack, { backgroundColor: '#7986CB12' }]}>
                    <Icon name="play-circle-outline" size={14} color="#7986CB" />
                  </View>
                  <Icon name="chevron-right" size={18} color={colors.textMuted} />
                </Pressable>

                {/* Sport */}
                <Pressable style={[styles.catCard, { backgroundColor: colors.surface }]} onPress={() => onTapCategory('sport', '/details/sport')}>
                  <View style={[styles.catIconWrap, { backgroundColor: '#FF704315' }]}>  
                    <Icon name="run" size={24} color="#FF7043" />
                  </View>
                  <View style={styles.catInfo}>
                    <Text style={[styles.catTitle, { color: colors.text }]}>Sport</Text>
                    <Text style={[styles.catSub, { color: colors.textMuted }]}>{sportSessions} session{sportSessions !== 1 ? 's' : ''} • {sportCalories} cal</Text>
                  </View>
                  <View style={styles.catScoreWrap}>
                    <Text style={[styles.catScore, { color: '#FF7043' }]}>{sportSessions}</Text>
                  </View>
                  <View style={[styles.catTrack, { backgroundColor: '#FF704312' }]}>
                    <Icon name="play-circle-outline" size={14} color="#FF7043" />
                  </View>
                  <Icon name="chevron-right" size={18} color={colors.textMuted} />
                </Pressable>

                {/* Readiness */}
                <Pressable style={[styles.catCard, { backgroundColor: colors.surface }]} onPress={() => onTapCategory('readiness', '/details/readiness')}>
                  <View style={[styles.catIconWrap, { backgroundColor: '#66BB6A15' }]}>  
                    <Icon name="shield-check-outline" size={24} color="#66BB6A" />
                  </View>
                  <View style={styles.catInfo}>
                    <Text style={[styles.catTitle, { color: colors.text }]}>Readiness</Text>
                    <Text style={[styles.catSub, { color: colors.textMuted }]}>{readinessScore >= 70 ? 'Good to go' : readinessScore >= 50 ? 'Moderate' : 'Take it easy'}</Text>
                  </View>
                  <View style={styles.catScoreWrap}>
                    <Text style={[styles.catScore, { color: getScoreColor(readinessScore) }]}>{readinessScore}</Text>
                  </View>
                  <Icon name="chevron-right" size={18} color={colors.textMuted} />
                </Pressable>

                {/* Recovery */}
                <Pressable style={[styles.catCard, { backgroundColor: colors.surface }]} onPress={() => onTapCategory('recovery', '/details/recovery')}>
                  <View style={[styles.catIconWrap, { backgroundColor: '#42A5F515' }]}>  
                    <Icon name="heart-pulse" size={24} color="#42A5F5" />
                  </View>
                  <View style={styles.catInfo}>
                    <Text style={[styles.catTitle, { color: colors.text }]}>Recovery</Text>
                    <Text style={[styles.catSub, { color: colors.textMuted }]}>Strain {Math.round(strainLevel)}%</Text>
                  </View>
                  <View style={styles.catScoreWrap}>
                    <Text style={[styles.catScore, { color: getScoreColor(recoveryScore) }]}>{recoveryScore}</Text>
                  </View>
                  <Icon name="chevron-right" size={18} color={colors.textMuted} />
                </Pressable>
              </View>

              {/* Quick Vitals */}
              <View style={[styles.quickVitals, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={styles.quickVitalItem}>
                  <Icon name="heart" size={16} color={colors.heartRate} />
                  <Text style={[styles.quickVitalVal, { color: colors.text }]}>{hr}</Text>
                  <Text style={[styles.quickVitalUnit, { color: colors.textMuted }]}>bpm</Text>
                </View>
                <View style={[styles.quickVitalDiv, { backgroundColor: colors.border }]} />
                <View style={styles.quickVitalItem}>
                  <Icon name="run" size={16} color={colors.muscleOxygen} />
                  <Text style={[styles.quickVitalVal, { color: colors.text }]}>{typeof smo2 === 'number' ? smo2.toFixed(0) : smo2}%</Text>
                  <Text style={[styles.quickVitalUnit, { color: colors.textMuted }]}>SmO₂</Text>
                </View>
                <View style={[styles.quickVitalDiv, { backgroundColor: colors.border }]} />
                <View style={styles.quickVitalItem}>
                  <Icon name="shield-check-outline" size={16} color={readinessScore >= 70 ? '#4CAF50' : '#FF9800'} />
                  <Text style={[styles.quickVitalVal, { color: colors.text }]}>{readinessScore}</Text>
                  <Text style={[styles.quickVitalUnit, { color: colors.textMuted }]}>Ready</Text>
                </View>
              </View>
            </>
          )}

          <View style={{ height: 100 }} />
        </ScrollView>
      </View>
    </DynamicBackground>
  );
}

// ── Helpers ──

const Vital = ({ label, value, unit, color, colors }: { label: string; value: number; unit: string; color: string; colors: ThemeColors }) => (
  <View style={styles.vital}>
    <Text style={[styles.vitalLabel, { color: colors.textMuted }]}>{label}</Text>
    <Text style={[styles.vitalValue, { color }]}>{value}</Text>
    <Text style={[styles.vitalUnit, { color: colors.textMuted }]}>{unit}</Text>
  </View>
);

const fmtDur = (s: number): string => {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
    : `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
};

// ── Styles ──

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: Spacing.lg, paddingTop: 0, paddingBottom: 120 },
  pageHeader: { marginBottom: Spacing.md },

  /* Date Bar */
  dateBar: { flexDirection: 'row', alignItems: 'center', borderRadius: 20, paddingHorizontal: Spacing.md, paddingVertical: 14, marginBottom: Spacing.lg, borderWidth: 0.5 },
  dateCenter: { flex: 1, alignItems: 'center' },
  dateText: { fontSize: FontSizes.lg, fontWeight: '700', letterSpacing: -0.3 },
  dateSub: { fontSize: 11, marginTop: 2 },

  /* Category Cards */
  categoryList: { gap: 10, marginBottom: Spacing.lg },
  catCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 20, padding: 16, gap: 12, borderWidth: 0.5, borderColor: 'rgba(150,150,150,0.12)' },
  catIconWrap: { width: 48, height: 48, borderRadius: 15, justifyContent: 'center', alignItems: 'center' },
  catInfo: { flex: 1, gap: 2 },
  catTitle: { fontSize: FontSizes.md, fontWeight: '700' },
  catSub: { fontSize: 12 },
  catScoreWrap: { marginRight: 4 },
  catScore: { fontSize: 28, fontWeight: '700', letterSpacing: -0.5 },
  catTrack: { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },

  /* Quick Vitals */
  quickVitals: { flexDirection: 'row', borderRadius: 20, padding: Spacing.md, justifyContent: 'space-around', alignItems: 'center', borderWidth: 0.5 },
  quickVitalItem: { alignItems: 'center', gap: 4 },
  quickVitalVal: { fontSize: 18, fontWeight: '700', letterSpacing: -0.3 },
  quickVitalUnit: { fontSize: 10 },
  quickVitalDiv: { width: 1, height: 32 },

  /* Active session */
  sessionCard: { marginBottom: Spacing.lg },
  sessionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  sessionType: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sessionLabel: { fontSize: FontSizes.lg, fontWeight: '500' },
  liveChip: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  liveChipText: { fontSize: 11, fontWeight: '600', letterSpacing: 0.5 },
  timer: { fontSize: 48, fontWeight: '100', textAlign: 'center', letterSpacing: -2, marginBottom: Spacing.lg },
  vitalsRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: Spacing.md },
  vital: { alignItems: 'center' },
  vitalLabel: { fontSize: 10, marginBottom: 2, letterSpacing: 0.5 },
  vitalValue: { fontSize: 20, fontWeight: '600' },
  vitalUnit: { fontSize: 10, marginTop: 1 },
  warningBar: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, marginBottom: Spacing.md },
  warningText: { fontSize: 12, fontWeight: '500', flex: 1 },
  sparkRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.md, gap: 8 },
  sparkItem: { flex: 1, alignItems: 'center', gap: 4 },
  sparkLabel: { fontSize: 10, letterSpacing: 0.3 },
  endBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 12, borderWidth: 1, marginTop: Spacing.lg },
  endBtnText: { fontSize: FontSizes.md, fontWeight: '500' },

  /* Modals */
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modal: { width: '100%', maxWidth: 320, borderRadius: 16, padding: 28, alignItems: 'center' },
  modalTitle: { fontSize: 18, fontWeight: '600', marginBottom: 4 },
  modalSub: { fontSize: 14, marginBottom: 24, textAlign: 'center' },
  modalRow: { flexDirection: 'row', gap: 12, width: '100%' },
  modalBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  modalBtnText: { fontSize: 14, fontWeight: '600' },
});
