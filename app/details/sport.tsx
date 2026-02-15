/**
 * Sport / Activity Detail Page
 * Modern workout tracking with inline sport picker,
 * session history with sport names, and body performance metrics.
 * Layout mirrors the Sleep screen for consistency.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions, Pressable, Modal, Vibration, TextInput } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Icon, type IconName } from '@/components/ui/icon';
import { NatureHeader } from '@/components/ui/nature-header';
import { GlassCard } from '@/components/ui/cards';
import { MiniSparkline, LivePulse } from '@/components/ui/indicators';
import { CircularProgress } from '@/components/ui/charts';
import { useApp } from '@/context/app-context';
import useTheme from '@/hooks/use-theme';
import { FontSizes, Spacing, type ThemeColors } from '@/constants/theme';
import {
  startActivity, endActivity, updateActiveActivity,
  getRecentActivities, getActivityStats,
  type ActivityRecord, type ActivityType,
} from '@/services/database';

const { width } = Dimensions.get('window');

// ── Sport Categories ──
interface SportCategory {
  key: string;
  label: string;
  icon: IconName;
  color: string;
  dbType: ActivityType;
}

const SPORT_CATEGORIES: SportCategory[] = [
  { key: 'running', label: 'Running', icon: 'run', color: '#FF7043', dbType: 'running' as ActivityType },
  { key: 'football', label: 'Football', icon: 'soccer', color: '#66BB6A', dbType: 'running' as ActivityType },
  { key: 'basketball', label: 'Basketball', icon: 'basketball', color: '#FF9800', dbType: 'running' as ActivityType },
  { key: 'boxing', label: 'Boxing', icon: 'boxing-glove', color: '#EF5350', dbType: 'strength' as ActivityType },
  { key: 'cycling', label: 'Cycling', icon: 'bike', color: '#42A5F5', dbType: 'cycling' as ActivityType },
  { key: 'swimming', label: 'Swimming', icon: 'water-outline', color: '#26C6DA', dbType: 'swimming' as ActivityType },
  { key: 'strength', label: 'Strength', icon: 'dumbbell', color: '#AB47BC', dbType: 'strength' as ActivityType },
  { key: 'yoga', label: 'Yoga', icon: 'human', color: '#7E57C2', dbType: 'yoga' as ActivityType },
  { key: 'hiit', label: 'HIIT', icon: 'flash-outline', color: '#FF5722', dbType: 'hiit' as ActivityType },
  { key: 'walking', label: 'Walking', icon: 'walk', color: '#8BC34A', dbType: 'walking' as ActivityType },
];

// ── Mock workout history (like sleep history) ──
const MOCK_WORKOUTS = [
  {
    id: 'w-today', date: '2026-02-15', weekday: 'Sun', sportKey: 'running',
    duration_sec: 2100, calories: 290, steps: 3600, distance_km: 3.5,
    avg_hr: 144, max_hr: 168, avg_smo2: 56, score: 74,
  },
  {
    id: 'w-yesterday', date: '2026-02-14', weekday: 'Sat', sportKey: 'basketball',
    duration_sec: 3600, calories: 520, steps: 5400, distance_km: 3.2,
    avg_hr: 152, max_hr: 180, avg_smo2: 50, score: 83,
  },
  {
    id: 'w-1', date: '2026-02-13', weekday: 'Fri', sportKey: 'running',
    duration_sec: 2520, calories: 340, steps: 4800, distance_km: 4.2,
    avg_hr: 148, max_hr: 172, avg_smo2: 58, score: 78,
  },
  {
    id: 'w-2', date: '2026-02-12', weekday: 'Thu', sportKey: 'strength',
    duration_sec: 3600, calories: 280, steps: 1200, distance_km: 0.5,
    avg_hr: 118, max_hr: 145, avg_smo2: 62, score: 72,
  },
  {
    id: 'w-3', date: '2026-02-11', weekday: 'Wed', sportKey: 'cycling',
    duration_sec: 2700, calories: 420, steps: 0, distance_km: 15.3,
    avg_hr: 138, max_hr: 165, avg_smo2: 55, score: 85,
  },
  {
    id: 'w-4', date: '2026-02-10', weekday: 'Tue', sportKey: 'football',
    duration_sec: 5400, calories: 580, steps: 8900, distance_km: 6.8,
    avg_hr: 142, max_hr: 178, avg_smo2: 52, score: 88,
  },
  {
    id: 'w-5', date: '2026-02-09', weekday: 'Mon', sportKey: 'yoga',
    duration_sec: 3000, calories: 150, steps: 200, distance_km: 0,
    avg_hr: 82, max_hr: 105, avg_smo2: 72, score: 65,
  },
  {
    id: 'w-6', date: '2026-02-07', weekday: 'Sat', sportKey: 'hiit',
    duration_sec: 1800, calories: 310, steps: 2400, distance_km: 1.2,
    avg_hr: 155, max_hr: 185, avg_smo2: 48, score: 82,
  },
  {
    id: 'w-7', date: '2026-02-06', weekday: 'Fri', sportKey: 'swimming',
    duration_sec: 2400, calories: 350, steps: 0, distance_km: 1.5,
    avg_hr: 128, max_hr: 152, avg_smo2: 60, score: 76,
  },
];

const getSportForKey = (key: string): SportCategory =>
  SPORT_CATEGORIES.find(s => s.key === key) || SPORT_CATEGORIES[0];

export default function SportDetailScreen() {
  const {
    latestReading,
    activeTracking, trackingElapsed, trackingHrHistory, trackingSmo2History,
    trackingCalories, trackingSteps,
    startTracking, stopTracking, resetTracking,
  } = useApp();
  const { colors } = useTheme();
  const params = useLocalSearchParams<{ date?: string }>();
  const [activities, setActivities] = useState<ActivityRecord[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [selectedSport, setSelectedSport] = useState<SportCategory | null>(null);
  const [customSports, setCustomSports] = useState<SportCategory[]>([]);

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
  const fmtDateNav = (d: Date) => {
    const now = new Date();
    if (d.toDateString() === now.toDateString()) return 'Today';
    const y = new Date(now); y.setDate(y.getDate() - 1);
    if (d.toDateString() === y.toDateString()) return 'Yesterday';
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };
  const isToday = selectedDate.toDateString() === new Date().toDateString();

  // Filter workouts for selected date
  const toDateKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const selectedDayWorkouts = MOCK_WORKOUTS.filter(w => w.date === toDateKey(selectedDate));

  // Inline picker state
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerSport, setPickerSport] = useState<SportCategory | null>(null);
  const [showAddCustom, setShowAddCustom] = useState(false);
  const [customName, setCustomName] = useState('');

  // Derived tracking state
  const tracking = activeTracking?.type === 'sport';
  const sessionId = activeTracking?.sessionId ?? null;
  const elapsed = trackingElapsed;
  const hrHistory = trackingHrHistory;
  const smo2History = trackingSmo2History;
  const caloriesAccum = trackingCalories;
  const stepsAccum = trackingSteps;

  // Post-session analytics
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [sessionResult, setSessionResult] = useState<any>(null);

  // Workout detail modal
  const [selectedWorkout, setSelectedWorkout] = useState<typeof MOCK_WORKOUTS[0] | null>(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [acts, actStats] = await Promise.all([
        getRecentActivities(14),
        getActivityStats(7),
      ]);
      setActivities(acts);
      setStats(actStats);
    } catch {}
  };

  const allSports = [...SPORT_CATEGORIES, ...customSports];

  const handlePickSport = (sport: SportCategory) => {
    setPickerSport(sport);
  };

  const confirmStart = async () => {
    if (!pickerSport) return;
    setSelectedSport(pickerSport);
    setPickerOpen(false);
    setPickerSport(null);
    Vibration.vibrate(50);
    const id = await startActivity(pickerSport.dbType);
    startTracking('sport', id);
  };

  const handleAddCustomSport = () => {
    if (!customName.trim()) return;
    const newSport: SportCategory = {
      key: `custom-${Date.now()}`,
      label: customName.trim(),
      icon: 'run',
      color: '#78909C',
      dbType: 'running' as ActivityType,
    };
    setCustomSports(prev => [...prev, newSport]);
    setCustomName('');
    setShowAddCustom(false);
    setPickerSport(newSport);
  };

  const handleStop = async () => {
    const sid = sessionId ?? activeTracking?.sessionId ?? null;
    Vibration.vibrate([0, 50, 100, 50]);
    const data = stopTracking();
    const mins = data.elapsed / 60;
    const hrArr: number[] = data.hrHistory || [];
    const smo2Arr: number[] = data.smo2History || [];
    const avgHR = hrArr.length > 0 ? Math.round(hrArr.reduce((a, b) => a + b, 0) / hrArr.length) : 72;
    const maxHR = hrArr.length > 0 ? Math.max(...hrArr) : 90;
    const avgSmO2 = smo2Arr.length > 0 ? Math.round(smo2Arr.reduce((a, b) => a + b, 0) / smo2Arr.length) : 65;
    const calories = Math.round(data.calories || mins * 10);
    const steps = Math.round(data.steps || mins * 140);
    const distance = Math.round(mins * 0.12 * 100) / 100;
    const score = Math.min(100, Math.round((mins >= 30 ? 40 : (mins / 30) * 40) + (avgHR > 120 ? 30 : (avgHR / 120) * 30) + (avgSmO2 < 60 ? 30 : 15)));

    if (sid) {
      await updateActiveActivity(sid, {
        duration_sec: data.elapsed, calories_burned: calories, steps, distance_km: distance,
        avg_heart_rate: avgHR, max_heart_rate: maxHR, avg_muscle_oxygen: avgSmO2,
      });
      await endActivity(sid);
    }
    setSessionResult({
      duration: data.elapsed, calories, steps, distance, avgHR, maxHR, avgSmO2, score,
      hrHistory: [...data.hrHistory], smo2History: [...data.smo2History],
      sport: selectedSport,
    });
    setShowAnalytics(true);
    loadData();
  };

  const saveAndClose = () => {
    setShowAnalytics(false);
    setSessionResult(null);
    setSelectedSport(null);
    resetTracking();
  };

  const fmtDur = (s: number): string => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}` : `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };

  const fmtDurShort = (s: number): string => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  const totalSessions = stats?.total_sessions || 0;
  const totalCal = Math.round(stats?.total_calories || 0);
  const totalSteps = stats?.total_steps || 0;
  const totalMin = Math.round(stats?.total_duration_min || 0);

  const hr = latestReading?.heartRate || 72;
  const smo2 = latestReading?.muscleOxygen || 65;
  const vo2 = latestReading?.vo2Estimate || 42;
  const lactate = latestReading?.lactateEstimate || 1.2;
  const trainingLoad = latestReading?.trainingLoad || 0;
  const recoveryTime = latestReading?.recoveryTimeMin || 0;
  const hydration = latestReading?.hydrationLevel || 85;
  const smo2Warning = smo2 < 40;

  const getZoneColor = (v: number) => v >= 60 ? '#4CAF50' : v >= 40 ? '#FF9800' : '#F44336';
  const getScoreColor = (s: number) => s >= 70 ? '#4CAF50' : s >= 40 ? '#FF9800' : '#F44336';
  const getLactateStatus = (v: number) => v < 2 ? { label: 'Aerobic', color: '#4CAF50' } : v < 4 ? { label: 'Threshold', color: '#FF9800' } : { label: 'Anaerobic', color: '#F44336' };
  const lactateStatus = getLactateStatus(lactate);

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>

      {/* ════════ POST-SESSION ANALYTICS MODAL ════════ */}
      <Modal visible={showAnalytics} animationType="slide">
        <View style={[styles.analyticsModal, { backgroundColor: colors.background }]}>
          <ScrollView contentContainerStyle={styles.analyticsScroll} showsVerticalScrollIndicator={false}>
            {/* Back */}
            <Pressable style={styles.reportClose} onPress={saveAndClose}>
              <View style={[styles.reportBackBtn, { backgroundColor: colors.surface }]}>
                <Icon name="chevron-left" size={28} color={colors.text} />
              </View>
            </Pressable>

            <View style={styles.analyticsHeader}>
              <Icon name={sessionResult?.sport?.icon || 'run'} size={36} color={sessionResult?.sport?.color || '#FF7043'} />
              <Text style={[styles.analyticsTitle, { color: colors.text }]}>Workout Complete</Text>
              {sessionResult?.sport && (
                <View style={[styles.sportTag, { backgroundColor: sessionResult.sport.color + '18' }]}>
                  <Text style={[styles.sportTagText, { color: sessionResult.sport.color }]}>{sessionResult.sport.label}</Text>
                </View>
              )}
            </View>

            {sessionResult && (
              <>
                {/* Score */}
                <View style={styles.analyticsScoreRow}>
                  <CircularProgress
                    progress={sessionResult.score / 100}
                    size={140}
                    strokeWidth={10}
                    color={getScoreColor(sessionResult.score)}
                    label={`${sessionResult.score}`}
                  />
                  <Text style={[styles.analyticsScoreLabel, { color: colors.textMuted }]}>Workout Score</Text>
                </View>

                {/* Duration */}
                <GlassCard style={styles.analyticsDuration}>
                  <Text style={[styles.durationValue, { color: colors.text }]}>{fmtDur(sessionResult.duration)}</Text>
                  <Text style={[styles.durationLabel, { color: colors.textMuted }]}>Total Duration</Text>
                </GlassCard>

                {/* Summary Stats */}
                <GlassCard style={styles.summaryCard}>
                  <View style={styles.summaryGrid}>
                    <SummaryItem icon="fire" label="Calories" value={`${sessionResult.calories}`} color="#FF7043" colors={colors} />
                    <SummaryItem icon="walk" label="Steps" value={sessionResult.steps.toLocaleString()} color="#AB47BC" colors={colors} />
                    <SummaryItem icon="map-marker-distance" label="Distance" value={`${sessionResult.distance} km`} color="#42A5F5" colors={colors} />
                  </View>
                </GlassCard>

                {/* Heart Rate */}
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Heart Rate</Text>
                <GlassCard style={styles.vitalsCard}>
                  <View style={styles.vitalsGrid}>
                    <VitalItem icon="heart" label="Avg HR" value={`${sessionResult.avgHR}`} unit="bpm" color={colors.heartRate} colors={colors} />
                    <VitalItem icon="heart-flash" label="Max HR" value={`${sessionResult.maxHR}`} unit="bpm" color="#F44336" colors={colors} />
                  </View>
                  {sessionResult.hrHistory.length > 5 && (
                    <View style={{ marginTop: 12 }}>
                      <MiniSparkline data={sessionResult.hrHistory} color={colors.heartRate} width={width - 96} height={50} />
                    </View>
                  )}
                </GlassCard>

                {/* Muscle Oxygen */}
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Muscle Oxygen</Text>
                <GlassCard style={styles.vitalsCard}>
                  <View style={styles.vitalsGrid}>
                    <VitalItem icon="run" label="Avg SmO₂" value={`${sessionResult.avgSmO2}%`} unit="" color={colors.muscleOxygen} colors={colors} />
                  </View>
                  {sessionResult.smo2History.length > 5 && (
                    <View style={{ marginTop: 12 }}>
                      <MiniSparkline data={sessionResult.smo2History} color={colors.muscleOxygen} width={width - 96} height={50} />
                    </View>
                  )}
                </GlassCard>
              </>
            )}

            <Pressable style={[styles.saveBtn, { backgroundColor: colors.buttonPrimary }]} onPress={saveAndClose}>
              <Icon name="check" size={20} color={colors.buttonPrimaryText} />
              <Text style={[styles.saveBtnText, { color: colors.buttonPrimaryText }]}>Save & Close</Text>
            </Pressable>

            <View style={{ height: 50 }} />
          </ScrollView>
        </View>
      </Modal>

      {/* ════════ WORKOUT DETAIL MODAL ════════ */}
      <Modal visible={!!selectedWorkout} animationType="slide" onRequestClose={() => setSelectedWorkout(null)}>
        {selectedWorkout && (() => {
          const w = selectedWorkout;
          const sport = getSportForKey(w.sportKey);
          return (
            <View style={[styles.analyticsModal, { backgroundColor: colors.background }]}>
              <ScrollView contentContainerStyle={styles.analyticsScroll} showsVerticalScrollIndicator={false}>
                <Pressable style={styles.reportClose} onPress={() => setSelectedWorkout(null)}>
                  <View style={[styles.reportBackBtn, { backgroundColor: colors.surface }]}>
                    <Icon name="chevron-left" size={28} color={colors.text} />
                  </View>
                </Pressable>

                <View style={styles.analyticsHeader}>
                  <View style={[styles.detailSportIcon, { backgroundColor: sport.color + '18' }]}>
                    <Icon name={sport.icon} size={32} color={sport.color} />
                  </View>
                  <Text style={[styles.analyticsTitle, { color: colors.text }]}>{sport.label}</Text>
                  <Text style={[styles.analyticsSub, { color: colors.textMuted }]}>
                    {w.weekday}, {new Date(w.date).toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' })}
                  </Text>
                </View>

                {/* Score */}
                <View style={styles.analyticsScoreRow}>
                  <CircularProgress progress={w.score / 100} size={140} strokeWidth={10} color={getScoreColor(w.score)} label={`${w.score}`} />
                  <Text style={[styles.analyticsScoreLabel, { color: colors.textMuted }]}>Workout Score</Text>
                </View>

                {/* Duration */}
                <GlassCard style={styles.analyticsDuration}>
                  <Text style={[styles.durationValue, { color: colors.text }]}>{fmtDurShort(w.duration_sec)}</Text>
                  <Text style={[styles.durationLabel, { color: colors.textMuted }]}>Total Duration</Text>
                </GlassCard>

                {/* Stats */}
                <GlassCard style={styles.summaryCard}>
                  <View style={styles.summaryGrid}>
                    <SummaryItem icon="fire" label="Calories" value={`${w.calories}`} color="#FF7043" colors={colors} />
                    <SummaryItem icon="walk" label="Steps" value={w.steps.toLocaleString()} color="#AB47BC" colors={colors} />
                    <SummaryItem icon="map-marker-distance" label="Distance" value={`${w.distance_km} km`} color="#42A5F5" colors={colors} />
                  </View>
                </GlassCard>

                {/* Heart Rate */}
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Heart Rate</Text>
                <GlassCard style={styles.vitalsCard}>
                  <View style={styles.vitalsGrid}>
                    <VitalItem icon="heart" label="Avg HR" value={`${w.avg_hr}`} unit="bpm" color={colors.heartRate} colors={colors} />
                    <VitalItem icon="heart-flash" label="Max HR" value={`${w.max_hr}`} unit="bpm" color="#F44336" colors={colors} />
                  </View>
                </GlassCard>

                {/* Muscle Oxygen */}
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Muscle Oxygen</Text>
                <GlassCard style={styles.vitalsCard}>
                  <View style={styles.vitalsGrid}>
                    <VitalItem icon="run" label="Avg SmO₂" value={`${w.avg_smo2}%`} unit="" color={colors.muscleOxygen} colors={colors} />
                  </View>
                </GlassCard>

                <View style={{ height: 50 }} />
              </ScrollView>
            </View>
          );
        })()}
      </Modal>

      {/* ════════ MAIN CONTENT ════════ */}
      <ScrollView bounces={false} showsVerticalScrollIndicator={false}>
        <NatureHeader
          title="Sport & Activity"
          subtitle={tracking ? 'Workout in progress' : 'Track workouts & view performance'}
          variant="sport"
          icon="run"
        />

        <View style={styles.content}>
          {/* ═══ Date Navigation ═══ */}
          {!tracking && (
            <View style={[styles.dateBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Pressable onPress={() => shiftDate(-1)} hitSlop={12}>
                <Icon name="chevron-left" size={22} color={colors.textMuted} />
              </Pressable>
              <View style={styles.dateCenter}>
                <Text style={[styles.dateText, { color: colors.text }]}>{fmtDateNav(selectedDate)}</Text>
                <Text style={[styles.dateSub, { color: colors.textMuted }]}>
                  {selectedDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                </Text>
              </View>
              <Pressable onPress={() => shiftDate(1)} hitSlop={12} style={{ opacity: isToday ? 0.25 : 1 }} disabled={isToday}>
                <Icon name="chevron-right" size={22} color={colors.textMuted} />
              </Pressable>
            </View>
          )}

          {/* ─── ACTIVE TRACKING CARD ─── */}
          {tracking ? (
            <GlassCard style={styles.trackingCard}>
              <View style={styles.trackingHeader}>
                <View style={styles.trackingLive}>
                  <LivePulse color={colors.success} size={6} />
                  <Text style={[styles.trackingLiveText, { color: colors.success }]}>Tracking</Text>
                </View>
                {selectedSport && (
                  <View style={[styles.activeSportTag, { backgroundColor: selectedSport.color + '18' }]}>
                    <Icon name={selectedSport.icon} size={14} color={selectedSport.color} />
                    <Text style={[styles.activeSportTagText, { color: selectedSport.color }]}>{selectedSport.label}</Text>
                  </View>
                )}
              </View>

              <Text style={[styles.trackingTimer, { color: colors.text }]}>{fmtDur(elapsed)}</Text>

              {/* Live vitals */}
              <View style={styles.liveVitalsRow}>
                <View style={styles.liveVitalBox}>
                  <Icon name="heart" size={16} color={colors.heartRate} />
                  <Text style={[styles.liveVitalValue, { color: colors.heartRate }]}>{hr}</Text>
                  <Text style={[styles.liveVitalUnit, { color: colors.textMuted }]}>bpm</Text>
                </View>
                <View style={styles.liveVitalBox}>
                  <Icon name="run" size={16} color={smo2Warning ? colors.error : colors.muscleOxygen} />
                  <Text style={[styles.liveVitalValue, { color: smo2Warning ? colors.error : colors.muscleOxygen }]}>{typeof smo2 === 'number' ? smo2.toFixed(0) : smo2}%</Text>
                  <Text style={[styles.liveVitalUnit, { color: colors.textMuted }]}>SmO₂</Text>
                </View>
                <View style={styles.liveVitalBox}>
                  <Icon name="fire" size={16} color="#FF7043" />
                  <Text style={[styles.liveVitalValue, { color: '#FF7043' }]}>{Math.round(caloriesAccum)}</Text>
                  <Text style={[styles.liveVitalUnit, { color: colors.textMuted }]}>cal</Text>
                </View>
                <View style={styles.liveVitalBox}>
                  <Icon name="walk" size={16} color="#AB47BC" />
                  <Text style={[styles.liveVitalValue, { color: '#AB47BC' }]}>{Math.round(stepsAccum)}</Text>
                  <Text style={[styles.liveVitalUnit, { color: colors.textMuted }]}>steps</Text>
                </View>
              </View>

              {smo2Warning && (
                <View style={[styles.warningBar, { backgroundColor: colors.error + '15' }]}>
                  <Icon name="alert-circle" size={14} color={colors.error} />
                  <Text style={[styles.warningText, { color: colors.error }]}>Muscle oxygen low — consider a break</Text>
                </View>
              )}

              {hrHistory.length > 5 && (
                <View style={styles.trackingSparklines}>
                  <View style={styles.sparkItem}>
                    <Text style={[styles.sparkLabel, { color: colors.textMuted }]}>Heart Rate</Text>
                    <MiniSparkline data={hrHistory} color={colors.heartRate} width={(width - 100) / 2} height={32} />
                  </View>
                  <View style={styles.sparkItem}>
                    <Text style={[styles.sparkLabel, { color: colors.textMuted }]}>Muscle O₂</Text>
                    <MiniSparkline data={smo2History} color={colors.muscleOxygen} width={(width - 100) / 2} height={32} />
                  </View>
                </View>
              )}

              <Pressable style={[styles.stopBtn, { backgroundColor: '#F44336' }]} onPress={handleStop}>
                <Icon name="stop-circle-outline" size={22} color="#fff" />
                <Text style={styles.stopBtnText}>Stop & View Analytics</Text>
              </Pressable>
            </GlassCard>

          ) : !pickerOpen ? (

            /* ─── START WORKOUT CARD (matches sleep start card) ─── */
            <Pressable
              style={[styles.startCard, { backgroundColor: '#FF704320', borderColor: '#FF704340' }]}
              onPress={() => setPickerOpen(true)}
            >
              <View style={[styles.startIconWrap, { backgroundColor: '#FF704330' }]}>
                <Icon name="run" size={32} color="#FF7043" />
              </View>
              <Text style={[styles.startTitle, { color: colors.text }]}>Start Workout</Text>
              <Text style={[styles.startDesc, { color: colors.textSecondary }]}>
                Tap to choose a sport and begin tracking your workout session.
              </Text>
            </Pressable>

          ) : (

            /* ─── INLINE SPORT PICKER (no modal!) ─── */
            <GlassCard style={styles.pickerCard}>
              <Text style={[styles.pickerTitle, { color: colors.text }]}>Choose Sport</Text>

              {/* Scrollable horizontal sport chips */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pickerChips}>
                {allSports.map(sport => {
                  const isSelected = pickerSport?.key === sport.key;
                  return (
                    <Pressable
                      key={sport.key}
                      style={[
                        styles.sportChip,
                        { backgroundColor: isSelected ? sport.color + '25' : colors.surfaceSecondary, borderColor: isSelected ? sport.color + '60' : 'transparent' },
                      ]}
                      onPress={() => handlePickSport(sport)}
                    >
                      <View style={[styles.sportChipIcon, { backgroundColor: sport.color + '20' }]}>
                        <Icon name={sport.icon} size={22} color={sport.color} />
                      </View>
                      <Text style={[styles.sportChipLabel, { color: isSelected ? sport.color : colors.text }]}>{sport.label}</Text>
                    </Pressable>
                  );
                })}
              </ScrollView>

              {/* Add Custom */}
              {!showAddCustom ? (
                <Pressable style={[styles.addCustomRow, { borderColor: colors.border }]} onPress={() => setShowAddCustom(true)}>
                  <Icon name="plus" size={16} color={colors.textMuted} />
                  <Text style={[styles.addCustomText, { color: colors.textMuted }]}>Custom sport</Text>
                </Pressable>
              ) : (
                <View style={[styles.addCustomForm, { borderColor: colors.border }]}>
                  <TextInput
                    style={[styles.customInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surfaceSecondary }]}
                    placeholder="Sport name (e.g. Tennis)"
                    placeholderTextColor={colors.textMuted}
                    value={customName}
                    onChangeText={setCustomName}
                    autoFocus
                  />
                  <View style={styles.customFormRow}>
                    <Pressable style={[styles.customCancelBtn, { backgroundColor: colors.surfaceSecondary }]} onPress={() => { setShowAddCustom(false); setCustomName(''); }}>
                      <Text style={[styles.customCancelText, { color: colors.textSecondary }]}>Cancel</Text>
                    </Pressable>
                    <Pressable style={[styles.customSaveBtn, { backgroundColor: '#FF7043' }]} onPress={handleAddCustomSport}>
                      <Text style={styles.customSaveText}>Add</Text>
                    </Pressable>
                  </View>
                </View>
              )}

              {/* Action buttons */}
              <View style={styles.pickerActions}>
                <Pressable style={[styles.pickerCancelBtn, { backgroundColor: colors.surfaceSecondary }]} onPress={() => { setPickerOpen(false); setPickerSport(null); }}>
                  <Text style={[styles.pickerCancelText, { color: colors.textSecondary }]}>Cancel</Text>
                </Pressable>
                <Pressable
                  style={[styles.pickerStartBtn, { backgroundColor: pickerSport ? '#FF7043' : colors.surfaceSecondary }]}
                  onPress={confirmStart}
                  disabled={!pickerSport}
                >
                  <Icon name="play" size={18} color={pickerSport ? '#fff' : colors.textMuted} />
                  <Text style={[styles.pickerStartText, { color: pickerSport ? '#fff' : colors.textMuted }]}>
                    {pickerSport ? `Start ${pickerSport.label}` : 'Select a sport'}
                  </Text>
                </Pressable>
              </View>
            </GlassCard>
          )}

          {/* ─── THIS WEEK OVERVIEW ─── */}
          {!tracking && !pickerOpen && (
            <>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>This Week</Text>
              <GlassCard style={styles.overviewCard}>
                <View style={styles.overviewGrid}>
                  <OverviewItem value={totalSessions > 0 ? totalSessions.toString() : '5'} label="Sessions" icon="timer-outline" color="#42A5F5" colors={colors} />
                  <OverviewItem value={`${totalMin > 0 ? totalMin : 185}m`} label="Active Time" icon="clock" color="#66BB6A" colors={colors} />
                  <OverviewItem value={(totalCal > 0 ? totalCal : 2890).toLocaleString()} label="Calories" icon="fire" color="#FF7043" colors={colors} />
                  <OverviewItem value={(totalSteps > 0 ? totalSteps : 58200).toLocaleString()} label="Steps" icon="walk" color="#AB47BC" colors={colors} />
                </View>
              </GlassCard>
            </>
          )}

          {/* ─── CURRENT BODY STATE ─── */}
          {!tracking && !pickerOpen && (
            <>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Body State</Text>
              <View style={styles.bodyGrid}>
                <BodyTile icon="heart" label="Heart Rate" value={`${hr}`} unit="bpm" color={colors.heartRate} colors={colors} />
                <BodyTile icon="run" label="Muscle O₂" value={`${typeof smo2 === 'number' ? smo2.toFixed(0) : smo2}`} unit="%" color={getZoneColor(smo2)} colors={colors} />
                <BodyTile icon="lungs" label="VO₂ Est." value={`${vo2.toFixed(1)}`} unit="ml/kg" color="#42A5F5" colors={colors} />
                <BodyTile icon="flash" label="Lactate" value={`${lactate.toFixed(1)}`} unit="mmol/L" color={lactateStatus.color} colors={colors} />
              </View>
            </>
          )}

          {/* ─── TRAINING METRICS ─── */}
          {!tracking && !pickerOpen && (
            <>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Training Metrics</Text>
              <GlassCard style={styles.metricsCard}>
                <MetricRow label="Training Load" value={`${Math.round(trainingLoad)}`}
                  status={trainingLoad > 70 ? 'High' : trainingLoad > 30 ? 'Moderate' : 'Low'}
                  statusColor={trainingLoad > 70 ? '#F44336' : trainingLoad > 30 ? '#FF9800' : '#4CAF50'} colors={colors} />
                <MetricRow label="Recovery Needed" value={`${Math.round(recoveryTime)} min`}
                  status={recoveryTime > 120 ? 'Extended' : recoveryTime > 60 ? 'Normal' : 'Quick'}
                  statusColor={recoveryTime > 120 ? '#FF9800' : '#4CAF50'} colors={colors} />
                <MetricRow label="Hydration" value={`${Math.round(hydration)}%`}
                  status={hydration > 70 ? 'Good' : hydration > 50 ? 'Low' : 'Critical'}
                  statusColor={hydration > 70 ? '#4CAF50' : hydration > 50 ? '#FF9800' : '#F44336'} colors={colors} />
                <MetricRow label="Lactate Zone" value={`${lactate.toFixed(1)} mmol/L`}
                  status={lactateStatus.label} statusColor={lactateStatus.color} colors={colors} />
              </GlassCard>
            </>
          )}

          {/* ─── MUSCLE OXYGEN ZONES ─── */}
          {!tracking && !pickerOpen && (
            <>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Muscle Oxygen Zones</Text>
              <GlassCard style={styles.zonesCard}>
                <ZoneBar label="Optimal (>60%)" color="#4CAF50" active={smo2 >= 60} colors={colors} />
                <ZoneBar label="Moderate (40-60%)" color="#FF9800" active={smo2 >= 40 && smo2 < 60} colors={colors} />
                <ZoneBar label="Critical (<40%)" color="#F44336" active={smo2 < 40} colors={colors} />
                <Text style={[styles.zoneNote, { color: colors.textMuted }]}>
                  Current: {typeof smo2 === 'number' ? smo2.toFixed(0) : smo2}% — {smo2 >= 60 ? 'Ready for output' : smo2 >= 40 ? 'Working zone' : 'Rest recommended'}
                </Text>
              </GlassCard>
            </>
          )}

          {/* ─── WORKOUTS FOR SELECTED DATE ─── */}
          {!tracking && !pickerOpen && (
            <>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>{fmtDateNav(selectedDate)} Workouts</Text>
              {selectedDayWorkouts.length === 0 && (
                <GlassCard style={styles.historyCard}>
                  <View style={{ alignItems: 'center', paddingVertical: 24 }}>
                    <Icon name="run" size={28} color={colors.textMuted} />
                    <Text style={{ color: colors.textMuted, marginTop: 8, fontSize: FontSizes.sm }}>No workouts on this date</Text>
                  </View>
                </GlassCard>
              )}
              {selectedDayWorkouts.map(w => {
                const sport = getSportForKey(w.sportKey);
                return (
                  <Pressable key={w.id} onPress={() => setSelectedWorkout(w)}>
                    <GlassCard style={styles.historyCard}>
                      <View style={styles.historyRow}>
                        <View style={[styles.historyIconWrap, { backgroundColor: sport.color + '15' }]}>
                          <Icon name={sport.icon} size={20} color={sport.color} />
                        </View>
                        <View style={styles.historyInfo}>
                          <Text style={[styles.historyName, { color: colors.text }]}>{sport.label}</Text>
                          <Text style={[styles.historyDate, { color: colors.textMuted }]}>
                            {w.weekday}, {new Date(w.date).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                          </Text>
                        </View>
                        <View style={styles.historyStats}>
                          <Text style={[styles.historyDuration, { color: colors.text }]}>{fmtDurShort(w.duration_sec)}</Text>
                          <Text style={[styles.historyCal, { color: colors.textMuted }]}>{w.calories} cal</Text>
                        </View>
                        <View style={styles.historyScoreWrap}>
                          <Text style={[styles.historyScore, { color: getScoreColor(w.score) }]}>{w.score}</Text>
                        </View>
                        <Icon name="chevron-right" size={18} color={colors.textMuted} />
                      </View>
                      {/* Mini stat strip */}
                      <View style={styles.historyStrip}>
                        <View style={styles.historyStripItem}>
                          <Icon name="heart" size={10} color={colors.heartRate} />
                          <Text style={[styles.historyStripText, { color: colors.textMuted }]}>{w.avg_hr} bpm</Text>
                        </View>
                        <View style={styles.historyStripItem}>
                          <Icon name="run" size={10} color={colors.muscleOxygen} />
                          <Text style={[styles.historyStripText, { color: colors.textMuted }]}>{w.avg_smo2}% SmO₂</Text>
                        </View>
                        {w.distance_km > 0 && (
                          <View style={styles.historyStripItem}>
                            <Icon name="map-marker-distance" size={10} color="#42A5F5" />
                            <Text style={[styles.historyStripText, { color: colors.textMuted }]}>{w.distance_km} km</Text>
                          </View>
                        )}
                      </View>
                    </GlassCard>
                  </Pressable>
                );
              })}
            </>
          )}

          <View style={{ height: 40 }} />
        </View>
      </ScrollView>
    </View>
  );
}

// ── Sub-components ──

const OverviewItem = ({ value, label, icon, color, colors }: { value: string; label: string; icon: IconName; color: string; colors: any }) => (
  <View style={styles.overviewItem}>
    <View style={[styles.overviewItemIcon, { backgroundColor: color + '15' }]}>
      <Icon name={icon} size={18} color={color} />
    </View>
    <Text style={[styles.overviewValue, { color: colors.text }]}>{value}</Text>
    <Text style={[styles.overviewLabel, { color: colors.textMuted }]}>{label}</Text>
  </View>
);

const BodyTile = ({ icon, label, value, unit, color, colors }: { icon: IconName; label: string; value: string; unit: string; color: string; colors: any }) => (
  <View style={[styles.bodyTile, { backgroundColor: colors.surface }]}>
    <View style={[styles.bodyTileIcon, { backgroundColor: color + '15' }]}>
      <Icon name={icon} size={20} color={color} />
    </View>
    <Text style={[styles.bodyTileValue, { color }]}>{value}<Text style={[styles.bodyTileUnit, { color: colors.textMuted }]}> {unit}</Text></Text>
    <Text style={[styles.bodyTileLabel, { color: colors.textMuted }]}>{label}</Text>
  </View>
);

const VitalItem = ({ icon, label, value, unit, color, colors }: { icon: IconName; label: string; value: string; unit: string; color: string; colors: any }) => (
  <View style={styles.vitalItem}>
    <Icon name={icon} size={20} color={color} />
    <Text style={[styles.vitalItemValue, { color: colors.text }]}>{value}{unit ? <Text style={{ color: colors.textMuted }}> {unit}</Text> : null}</Text>
    <Text style={[styles.vitalItemLabel, { color: colors.textMuted }]}>{label}</Text>
  </View>
);

const SummaryItem = ({ icon, label, value, color, colors }: { icon: IconName; label: string; value: string; color: string; colors: any }) => (
  <View style={styles.summaryItem}>
    <View style={[styles.summaryItemIcon, { backgroundColor: color + '15' }]}>
      <Icon name={icon} size={18} color={color} />
    </View>
    <Text style={[styles.summaryItemValue, { color: colors.text }]}>{value}</Text>
    <Text style={[styles.summaryItemLabel, { color: colors.textMuted }]}>{label}</Text>
  </View>
);

const MetricRow = ({ label, value, status, statusColor, colors }: { label: string; value: string; status: string; statusColor: string; colors: any }) => (
  <View style={styles.metricRow}>
    <Text style={[styles.metricLabel, { color: colors.text }]}>{label}</Text>
    <View style={styles.metricRight}>
      <Text style={[styles.metricValue, { color: colors.text }]}>{value}</Text>
      <View style={[styles.metricBadge, { backgroundColor: statusColor + '20' }]}>
        <Text style={[styles.metricBadgeText, { color: statusColor }]}>{status}</Text>
      </View>
    </View>
  </View>
);

const ZoneBar = ({ label, color, active, colors }: { label: string; color: string; active: boolean; colors: any }) => (
  <View style={styles.zoneRow}>
    <View style={[styles.zoneIndicator, { backgroundColor: active ? color : colors.surfaceSecondary }]} />
    <Text style={[styles.zoneLabel, { color: active ? colors.text : colors.textMuted }]}>{label}</Text>
    {active && <Icon name="radiobox-marked" size={14} color={color} />}
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

  // Start card (matches sleep)
  startCard: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: Spacing.xl,
    borderRadius: 22,
    borderWidth: 1,
    marginBottom: Spacing.lg,
  },
  startIconWrap: {
    width: 72, height: 72, borderRadius: 36,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  startTitle: { fontSize: FontSizes.xl, fontWeight: '700', marginBottom: Spacing.sm },
  startDesc: { fontSize: FontSizes.sm, textAlign: 'center', lineHeight: 20 },

  // Tracking card (matches sleep tracking card)
  trackingCard: { marginBottom: Spacing.lg },
  trackingHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  trackingLive: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  trackingLiveText: { fontSize: FontSizes.sm, fontWeight: '600', letterSpacing: 0.5 },
  activeSportTag: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  activeSportTagText: { fontSize: 12, fontWeight: '600' },
  trackingTimer: { fontSize: 56, fontWeight: '100', textAlign: 'center', letterSpacing: -2, marginBottom: Spacing.lg },
  trackingSparklines: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: Spacing.lg },
  stopBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 14 },
  stopBtnText: { color: '#fff', fontSize: FontSizes.md, fontWeight: '600' },

  // Live vitals (matches sleep)
  liveVitalsRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: Spacing.md, paddingVertical: Spacing.sm },
  liveVitalBox: { alignItems: 'center', gap: 4 },
  liveVitalValue: { fontSize: 20, fontWeight: '700' },
  liveVitalUnit: { fontSize: 10 },
  warningBar: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderRadius: 10, marginBottom: Spacing.sm },
  warningText: { fontSize: 12, fontWeight: '500', flex: 1 },
  sparkItem: { alignItems: 'center', gap: 4 },
  sparkLabel: { fontSize: 10, letterSpacing: 0.3 },

  // Inline picker
  pickerCard: { marginBottom: Spacing.lg },
  pickerTitle: { fontSize: FontSizes.lg, fontWeight: '700', letterSpacing: -0.3, marginBottom: Spacing.md },
  pickerChips: { flexDirection: 'row', gap: 10, paddingBottom: Spacing.md },
  sportChip: { alignItems: 'center', borderRadius: 16, paddingVertical: 14, paddingHorizontal: 14, gap: 8, borderWidth: 1.5, minWidth: 80 },
  sportChipIcon: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  sportChipLabel: { fontSize: 12, fontWeight: '600' },
  addCustomRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderStyle: 'dashed', marginBottom: Spacing.md },
  addCustomText: { fontSize: 13, fontWeight: '500' },
  addCustomForm: { borderRadius: 12, borderWidth: 1, padding: 14, marginBottom: Spacing.md, gap: 10 },
  customInput: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14 },
  customFormRow: { flexDirection: 'row', gap: 10 },
  customCancelBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  customCancelText: { fontSize: 14, fontWeight: '500' },
  customSaveBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  customSaveText: { color: '#FFF', fontSize: 14, fontWeight: '700' },
  pickerActions: { flexDirection: 'row', gap: 10 },
  pickerCancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 14, alignItems: 'center' },
  pickerCancelText: { fontSize: 14, fontWeight: '500' },
  pickerStartBtn: { flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 14 },
  pickerStartText: { fontSize: 15, fontWeight: '700' },

  // Section
  sectionTitle: { fontSize: FontSizes.lg, fontWeight: '700', marginBottom: Spacing.md, marginTop: Spacing.lg, letterSpacing: -0.3 },

  // Overview
  overviewCard: { marginBottom: Spacing.md },
  overviewGrid: { flexDirection: 'row', justifyContent: 'space-around' },
  overviewItem: { alignItems: 'center', gap: 6 },
  overviewItemIcon: { width: 36, height: 36, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  overviewValue: { fontSize: FontSizes.xl, fontWeight: '700', letterSpacing: -0.5 },
  overviewLabel: { fontSize: 11 },

  // Body 2x2
  bodyGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: Spacing.md },
  bodyTile: { width: (width - Spacing.lg * 2 - 10) / 2, borderRadius: 20, padding: Spacing.md, gap: 8, borderWidth: 0.5, borderColor: 'rgba(150,150,150,0.12)' },
  bodyTileIcon: { width: 38, height: 38, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  bodyTileValue: { fontSize: 22, fontWeight: '700', letterSpacing: -0.5 },
  bodyTileUnit: { fontSize: 12, fontWeight: '400' },
  bodyTileLabel: { fontSize: 11, fontWeight: '500' },

  // Metrics
  metricsCard: { marginBottom: Spacing.md, gap: 16 },
  metricRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  metricLabel: { fontSize: FontSizes.md },
  metricRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  metricValue: { fontSize: FontSizes.md, fontWeight: '600' },
  metricBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  metricBadgeText: { fontSize: 11, fontWeight: '600' },

  // Zones
  zonesCard: { marginBottom: Spacing.md, gap: 12 },
  zoneRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  zoneIndicator: { width: 8, height: 28, borderRadius: 4 },
  zoneLabel: { flex: 1, fontSize: FontSizes.md },
  zoneNote: { fontSize: 12, marginTop: 6, fontStyle: 'italic' },

  // History (matches sleep history)
  historyCard: { marginBottom: Spacing.sm, paddingVertical: 4 },
  historyRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  historyIconWrap: { width: 42, height: 42, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  historyInfo: { flex: 1 },
  historyName: { fontSize: FontSizes.md, fontWeight: '600' },
  historyDate: { fontSize: 11, marginTop: 2 },
  historyStats: { alignItems: 'flex-end', marginRight: 4 },
  historyDuration: { fontSize: FontSizes.md, fontWeight: '600' },
  historyCal: { fontSize: 11, marginTop: 2 },
  historyScoreWrap: { marginRight: 4 },
  historyScore: { fontSize: 22, fontWeight: '700' },
  historyStrip: { flexDirection: 'row', gap: 14, marginLeft: 54 },
  historyStripItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  historyStripText: { fontSize: 10 },

  // Analytics modal (matches sleep analytics)
  analyticsModal: { flex: 1, paddingTop: 0 },
  analyticsScroll: { paddingHorizontal: Spacing.lg, paddingBottom: 60 },
  reportClose: { position: 'absolute', top: 16, left: 0, zIndex: 10, padding: 8 },
  reportBackBtn: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 4 },
  analyticsHeader: { alignItems: 'center', marginTop: 56, marginBottom: Spacing.xl, gap: 6 },
  analyticsTitle: { fontSize: FontSizes.xxl, fontWeight: '300', marginTop: Spacing.md },
  analyticsSub: { fontSize: FontSizes.sm },
  sportTag: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 14, marginTop: 4 },
  sportTagText: { fontSize: 14, fontWeight: '600' },
  analyticsScoreRow: { alignItems: 'center', marginBottom: Spacing.xl, gap: 8 },
  analyticsScoreLabel: { fontSize: FontSizes.sm, marginTop: 4 },
  detailSportIcon: { width: 64, height: 64, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },

  // Duration
  analyticsDuration: { alignItems: 'center', marginBottom: Spacing.md },
  durationValue: { fontSize: 32, fontWeight: '300', letterSpacing: -1 },
  durationLabel: { fontSize: FontSizes.sm, marginTop: 4 },

  // Summary
  summaryCard: { marginBottom: Spacing.md },
  summaryGrid: { flexDirection: 'row', justifyContent: 'space-around' },
  summaryItem: { alignItems: 'center', gap: 6 },
  summaryItemIcon: { width: 36, height: 36, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  summaryItemValue: { fontSize: FontSizes.xl, fontWeight: '700' },
  summaryItemLabel: { fontSize: 11 },

  // Vitals card
  vitalsCard: { marginBottom: Spacing.md },
  vitalsGrid: { flexDirection: 'row', justifyContent: 'space-around' },
  vitalItem: { alignItems: 'center', gap: 6, paddingVertical: Spacing.sm },
  vitalItemValue: { fontSize: FontSizes.lg, fontWeight: '600' },
  vitalItemLabel: { fontSize: 11 },

  // Save button
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, borderRadius: 14 },
  saveBtnText: { fontSize: FontSizes.md, fontWeight: '600' },
});
