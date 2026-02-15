/**
 * ELVA Synthetic Telemetry Engine
 * Generates realistic, time-series health data for demo/incubator purposes.
 * Simulates 30 days of historical data with circadian rhythms,
 * trend patterns, and physiologically plausible correlations.
 */

import {
  VitalData,
  SleepData,
  ActivityData,
  RecoveryData,
  CycleData,
  HealthSummary,
  AIInsight,
  NutritionRecommendation,
  READINESS_WEIGHTS,
  HORMONAL_THRESHOLDS,
} from '@/types';

// ============================================
// SEED & DETERMINISTIC RANDOM
// ============================================
// Use a seeded PRNG so telemetry is consistent across renders
// but still looks "natural"
let _seed = 42;
const seededRandom = (seed?: number): number => {
  if (seed !== undefined) _seed = seed;
  _seed = (_seed * 16807 + 0) % 2147483647;
  return (_seed - 1) / 2147483646;
};

const gaussianRandom = (mean: number, stdDev: number, seed?: number): number => {
  const u1 = seededRandom(seed);
  const u2 = seededRandom();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return mean + z * stdDev;
};

const clamp = (val: number, min: number, max: number) => Math.max(min, Math.min(max, val));

// ============================================
// CIRCADIAN RHYTHM MODEL
// ============================================
// Returns a circadian multiplier (0-1) based on hour of day
const circadianFactor = (hour: number): number => {
  // Lowest at ~4 AM, highest at ~2 PM
  return 0.5 + 0.5 * Math.sin(((hour - 4) / 24) * 2 * Math.PI);
};

// ============================================
// USER BASELINE PROFILES
// ============================================
export interface UserProfile {
  gender: 'male' | 'female';
  age: number;
  fitnessLevel: 'beginner' | 'intermediate' | 'advanced';
  baselineHR: number;
  baselineHRV: number;
  baselineSpO2: number;
  baselineTemp: number;
  baselineSmO2: number;
  avgSleepHours: number;
  avgSteps: number;
}

export const DEFAULT_FEMALE_PROFILE: UserProfile = {
  gender: 'female',
  age: 28,
  fitnessLevel: 'intermediate',
  baselineHR: 68,
  baselineHRV: 52,
  baselineSpO2: 98,
  baselineTemp: 36.5,
  baselineSmO2: 72,
  avgSleepHours: 7.2,
  avgSteps: 8500,
};

export const DEFAULT_MALE_PROFILE: UserProfile = {
  gender: 'male',
  age: 32,
  fitnessLevel: 'intermediate',
  baselineHR: 65,
  baselineHRV: 58,
  baselineSpO2: 98,
  baselineTemp: 36.4,
  baselineSmO2: 70,
  avgSleepHours: 6.8,
  avgSteps: 9200,
};

// ============================================
// 30-DAY HISTORICAL DATA GENERATOR
// ============================================

export interface DailySnapshot {
  date: Date;
  dayIndex: number;
  vitals: VitalData;
  sleep: SleepData;
  activity: ActivityData;
  recovery: RecoveryData;
  insights: AIInsight[];
  nutritionPlan: NutritionRecommendation;
  // Additional analytics
  hourlyHeartRates: { hour: number; value: number }[];
  hourlySteps: { hour: number; value: number }[];
  sleepStages: { stage: string; startMin: number; endMin: number }[];
  hrvTrend: number; // 7-day rolling average
  readinessTrend: number; // 7-day rolling average
  strainAccumulation: number; // cumulative strain over past 3 days
  trainingLoad: number; // weekly training load score
}

export const generate30DayHistory = (profile: UserProfile): DailySnapshot[] => {
  const history: DailySnapshot[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Generate a "training block" pattern — 3 days push, 1 day rest
  const trainingPattern = [0.7, 0.85, 0.95, 0.3]; // strain levels

  for (let dayOffset = 29; dayOffset >= 0; dayOffset--) {
    const date = new Date(today);
    date.setDate(date.getDate() - dayOffset);
    const dayIndex = 30 - dayOffset;
    const patternIdx = dayIndex % trainingPattern.length;
    const strainTarget = trainingPattern[patternIdx];

    // Seed for this day so data is deterministic
    const daySeed = dayOffset * 1000 + 42;

    // Weekly fatigue wave — accumulation over the week
    const weekFatigue = Math.sin((dayIndex / 7) * Math.PI) * 0.15;

    // Generate vitals
    const vitals = generateDayVitals(profile, strainTarget, weekFatigue, daySeed);

    // Generate sleep (previous night)
    const sleep = generateDaySleep(profile, strainTarget, weekFatigue, daySeed + 100);

    // Generate activity
    const activity = generateDayActivity(profile, strainTarget, daySeed + 200);

    // Cycle data for females
    const cycleDay = profile.gender === 'female' ? ((dayIndex + 18) % 28) + 1 : 0;
    const isLuteal = cycleDay > 14 && cycleDay <= 28;

    // Generate recovery
    const recovery = generateDayRecovery(
      profile,
      vitals,
      sleep,
      activity,
      isLuteal,
      weekFatigue,
      daySeed + 300
    );

    // Hourly breakdowns
    const hourlyHeartRates = generateHourlyHeartRates(profile, strainTarget, daySeed + 400);
    const hourlySteps = generateHourlySteps(profile, strainTarget, daySeed + 500);
    const sleepStages = generateSleepStages(sleep, daySeed + 600);

    // Rolling averages (will be filled in after all days are generated)
    const snapshot: DailySnapshot = {
      date,
      dayIndex,
      vitals,
      sleep,
      activity,
      recovery,
      insights: [],
      nutritionPlan: generateNutritionPlan(activity, recovery),
      hourlyHeartRates,
      hourlySteps,
      sleepStages,
      hrvTrend: vitals.hrv,
      readinessTrend: recovery.readinessScore,
      strainAccumulation: 0,
      trainingLoad: 0,
    };

    history.push(snapshot);
  }

  // Compute rolling averages
  for (let i = 0; i < history.length; i++) {
    // 7-day HRV trend
    const hrvWindow = history.slice(Math.max(0, i - 6), i + 1);
    history[i].hrvTrend = Math.round(
      hrvWindow.reduce((sum, d) => sum + d.vitals.hrv, 0) / hrvWindow.length
    );

    // 7-day readiness trend
    const readinessWindow = history.slice(Math.max(0, i - 6), i + 1);
    history[i].readinessTrend = Math.round(
      readinessWindow.reduce((sum, d) => sum + d.recovery.readinessScore, 0) /
        readinessWindow.length
    );

    // 3-day strain accumulation
    const strainWindow = history.slice(Math.max(0, i - 2), i + 1);
    history[i].strainAccumulation = Math.round(
      strainWindow.reduce((sum, d) => sum + (d.recovery.dailyStrain || 0) * 100, 0)
    );

    // Weekly training load
    const weekWindow = history.slice(Math.max(0, i - 6), i + 1);
    history[i].trainingLoad = Math.round(
      weekWindow.reduce((sum, d) => sum + d.activity.activeMinutes * (1 + (d.recovery.dailyStrain || 0)), 0)
    );

    // Generate insights for this day
    history[i].insights = generateDayInsights(history[i], history.slice(0, i));
  }

  return history;
};

// ============================================
// VITALS GENERATOR
// ============================================
const generateDayVitals = (
  profile: UserProfile,
  strainTarget: number,
  weekFatigue: number,
  seed: number
): VitalData => {
  const hr = clamp(
    Math.round(gaussianRandom(profile.baselineHR + strainTarget * 8 + weekFatigue * 5, 3, seed)),
    50,
    100
  );

  const hrv = clamp(
    Math.round(gaussianRandom(profile.baselineHRV - strainTarget * 12 - weekFatigue * 8, 5, seed + 1)),
    20,
    90
  );

  const spo2 = clamp(
    Math.round(gaussianRandom(profile.baselineSpO2, 0.8, seed + 2)),
    94,
    100
  );

  const temp = clamp(
    parseFloat(gaussianRandom(profile.baselineTemp, 0.15, seed + 3).toFixed(1)),
    35.8,
    37.5
  );

  const smo2 = clamp(
    Math.round(gaussianRandom(profile.baselineSmO2 - strainTarget * 15, 5, seed + 4)),
    30,
    95
  );

  const stress = clamp(
    Math.round(gaussianRandom(25 + strainTarget * 30 + weekFatigue * 15, 8, seed + 5)),
    5,
    95
  );

  return {
    timestamp: new Date(),
    heartRate: hr,
    hrv,
    bloodOxygen: spo2,
    skinTemperature: temp,
    stressLevel: stress,
    muscleOxygen: smo2,
    muscleFatigue: smo2 < 40 ? 'High' : smo2 < 60 ? 'Medium' : 'Low',
  };
};

// ============================================
// SLEEP GENERATOR
// ============================================
const generateDaySleep = (
  profile: UserProfile,
  strainTarget: number,
  weekFatigue: number,
  seed: number
): SleepData => {
  // Higher strain = more sleep need but potentially worse quality
  const totalMinutes = clamp(
    Math.round(gaussianRandom(profile.avgSleepHours * 60, 30, seed)),
    300,
    600
  );

  const deepPct = clamp(gaussianRandom(0.2, 0.05, seed + 1), 0.1, 0.35);
  const remPct = clamp(gaussianRandom(0.23, 0.04, seed + 2), 0.12, 0.3);
  const awakePct = clamp(gaussianRandom(0.04 + weekFatigue * 0.05, 0.02, seed + 3), 0.01, 0.15);
  const lightPct = 1 - deepPct - remPct - awakePct;

  const deepSleep = Math.round(totalMinutes * deepPct);
  const remSleep = Math.round(totalMinutes * remPct);
  const awakeTime = Math.round(totalMinutes * awakePct);
  const lightSleep = totalMinutes - deepSleep - remSleep - awakeTime;

  // Sleep score correlates with deep sleep and total duration
  const sleepScore = clamp(
    Math.round(
      (deepPct / 0.25) * 30 +
        (remPct / 0.23) * 25 +
        (Math.min(totalMinutes, 480) / 480) * 25 +
        (1 - awakePct / 0.1) * 20
    ),
    40,
    100
  );

  const bedHour = clamp(Math.round(gaussianRandom(23, 0.7, seed + 4)), 21, 25) % 24;
  const bedDate = new Date();
  bedDate.setHours(bedHour, Math.round(seededRandom() * 59), 0, 0);

  const wakeDate = new Date(bedDate.getTime() + totalMinutes * 60000);

  return {
    date: new Date(),
    totalDuration: totalMinutes,
    deepSleep,
    lightSleep,
    remSleep,
    awakeTime,
    sleepScore,
    bedTime: bedDate,
    wakeTime: wakeDate,
  };
};

// ============================================
// ACTIVITY GENERATOR
// ============================================
const generateDayActivity = (
  profile: UserProfile,
  strainTarget: number,
  seed: number
): ActivityData => {
  const stepMultiplier = 0.5 + strainTarget;
  const steps = clamp(
    Math.round(gaussianRandom(profile.avgSteps * stepMultiplier, 1500, seed)),
    1000,
    25000
  );

  const distance = parseFloat((steps * 0.00075).toFixed(1));
  const caloriesBurned = Math.round(steps * 0.04 + strainTarget * 200);
  const activeMinutes = clamp(Math.round(gaussianRandom(30 + strainTarget * 60, 15, seed + 1)), 5, 180);
  const standingHours = clamp(Math.round(gaussianRandom(8, 2, seed + 2)), 3, 16);
  const floors = clamp(Math.round(gaussianRandom(8 + strainTarget * 10, 4, seed + 3)), 0, 40);

  return {
    date: new Date(),
    steps,
    distance,
    caloriesBurned,
    activeMinutes,
    standingHours,
    floors,
  };
};

// ============================================
// RECOVERY GENERATOR
// ============================================
const generateDayRecovery = (
  profile: UserProfile,
  vitals: VitalData,
  sleep: SleepData,
  activity: ActivityData,
  isLuteal: boolean,
  weekFatigue: number,
  seed: number
): RecoveryData => {
  const hrvNormalized = clamp((vitals.hrv - 20) / 70, 0, 1);
  const sleepQuality = clamp(sleep.sleepScore / 100, 0, 1);
  const dailyStrain = clamp(activity.activeMinutes / 120, 0, 1);

  const { HRV_WEIGHT, SLEEP_WEIGHT, STRAIN_WEIGHT } = READINESS_WEIGHTS;

  let readiness =
    (hrvNormalized * HRV_WEIGHT + sleepQuality * SLEEP_WEIGHT - dailyStrain * STRAIN_WEIGHT) *
    100;

  if (isLuteal) {
    readiness *= HORMONAL_THRESHOLDS.LUTEAL_READINESS_DAMPENING;
  }

  readiness = clamp(Math.round(readiness - weekFatigue * 10), 0, 100);

  const recoveryScore = clamp(
    Math.round(gaussianRandom(readiness * 0.9 + 10, 5, seed)),
    20,
    100
  );

  const muscleRecovery = clamp(
    Math.round(gaussianRandom(85 - dailyStrain * 30, 8, seed + 1)),
    30,
    100
  );

  const energyLevel = clamp(
    Math.round(gaussianRandom(65 + sleepQuality * 20 - dailyStrain * 15, 8, seed + 2)),
    20,
    100
  );

  const recommendations = [
    'Your body is primed for output today. Consider high-intensity training.',
    'Moderate activity recommended. Your system is rebuilding strength.',
    'Restorative day advised. Light stretching and hydration will serve you best.',
    'Your recovery is solid. A balanced workout aligns with your readiness.',
    'Focus on steady-state movement. Your internal rhythm is resetting.',
  ];

  return {
    date: new Date(),
    recoveryScore,
    readinessScore: readiness,
    muscleRecovery,
    energyLevel,
    recommendation: recommendations[Math.floor(seededRandom() * recommendations.length)],
    hrvNormalized,
    sleepQuality,
    dailyStrain,
  };
};

// ============================================
// HOURLY HEART RATE
// ============================================
const generateHourlyHeartRates = (
  profile: UserProfile,
  strainTarget: number,
  seed: number
): { hour: number; value: number }[] => {
  const data: { hour: number; value: number }[] = [];
  for (let h = 0; h < 24; h++) {
    const circadian = circadianFactor(h);
    // Simulate a workout bump between 7-8 AM or 5-6 PM
    const workoutBump = (h === 7 || h === 17) ? strainTarget * 30 : 0;
    const hr = clamp(
      Math.round(
        gaussianRandom(
          profile.baselineHR * (0.8 + circadian * 0.4) + workoutBump,
          3,
          seed + h
        )
      ),
      45,
      180
    );
    data.push({ hour: h, value: hr });
  }
  return data;
};

// ============================================
// HOURLY STEPS
// ============================================
const generateHourlySteps = (
  profile: UserProfile,
  strainTarget: number,
  seed: number
): { hour: number; value: number }[] => {
  const data: { hour: number; value: number }[] = [];
  const totalTarget = profile.avgSteps * (0.5 + strainTarget);

  // Distribution: mostly during 7-9, 12-13, 17-19
  const hourDistribution = [
    0.01, 0.01, 0.01, 0.01, 0.01, 0.02, 0.03, 0.12, 0.08, 0.05,
    0.04, 0.04, 0.08, 0.05, 0.04, 0.04, 0.05, 0.12, 0.08, 0.05,
    0.03, 0.02, 0.01, 0.01,
  ];

  for (let h = 0; h < 24; h++) {
    const steps = clamp(
      Math.round(gaussianRandom(totalTarget * hourDistribution[h], totalTarget * 0.01, seed + h)),
      0,
      5000
    );
    data.push({ hour: h, value: steps });
  }
  return data;
};

// ============================================
// SLEEP STAGES TIMELINE
// ============================================
const generateSleepStages = (
  sleep: SleepData,
  seed: number
): { stage: string; startMin: number; endMin: number }[] => {
  const stages: { stage: string; startMin: number; endMin: number }[] = [];
  const total = sleep.totalDuration;
  let currentMin = 0;

  // Typical sleep architecture: cycles of ~90 min
  // Each cycle: Light → Deep → Light → REM
  const numCycles = Math.round(total / 90);

  for (let cycle = 0; cycle < numCycles && currentMin < total; cycle++) {
    const cycleLength = clamp(Math.round(gaussianRandom(90, 10, seed + cycle)), 70, 110);

    // Light sleep entry
    const lightEntry = Math.round(cycleLength * 0.15);
    stages.push({ stage: 'Light', startMin: currentMin, endMin: currentMin + lightEntry });
    currentMin += lightEntry;

    // Deep sleep (more in first half of night)
    const deepFactor = cycle < numCycles / 2 ? 0.35 : 0.15;
    const deep = Math.round(cycleLength * deepFactor);
    stages.push({ stage: 'Deep', startMin: currentMin, endMin: currentMin + deep });
    currentMin += deep;

    // Light transition
    const lightMid = Math.round(cycleLength * 0.15);
    stages.push({ stage: 'Light', startMin: currentMin, endMin: currentMin + lightMid });
    currentMin += lightMid;

    // REM (more in second half)
    const remFactor = cycle >= numCycles / 2 ? 0.3 : 0.15;
    const rem = Math.round(cycleLength * remFactor);
    stages.push({ stage: 'REM', startMin: currentMin, endMin: currentMin + rem });
    currentMin += rem;

    // Brief awake between cycles
    if (seededRandom() > 0.6) {
      const awake = clamp(Math.round(gaussianRandom(3, 2, seed + cycle + 100)), 1, 10);
      stages.push({ stage: 'Awake', startMin: currentMin, endMin: currentMin + awake });
      currentMin += awake;
    }
  }

  return stages;
};

// ============================================
// NUTRITION PLAN GENERATOR
// ============================================
const generateNutritionPlan = (
  activity: ActivityData,
  recovery: RecoveryData
): NutritionRecommendation => {
  const baseCalories = 1800;
  const activityCalories = activity.caloriesBurned;
  const totalCalories = Math.round(baseCalories + activityCalories * 0.5);

  return {
    calories: totalCalories,
    protein: Math.round(totalCalories * 0.25 / 4),
    carbs: Math.round(totalCalories * 0.45 / 4),
    fats: Math.round(totalCalories * 0.3 / 9),
    hydration: 2.5,
    meals: [
      {
        name: 'Breakfast',
        time: '7:30 AM',
        calories: Math.round(totalCalories * 0.25),
        description: 'Oatmeal with berries, nuts, and Greek yogurt',
      },
      {
        name: 'Lunch',
        time: '12:30 PM',
        calories: Math.round(totalCalories * 0.35),
        description: 'Grilled chicken salad with quinoa and avocado',
      },
      {
        name: 'Snack',
        time: '3:30 PM',
        calories: Math.round(totalCalories * 0.1),
        description: 'Apple with almond butter',
      },
      {
        name: 'Dinner',
        time: '7:00 PM',
        calories: Math.round(totalCalories * 0.3),
        description: 'Salmon with roasted vegetables and brown rice',
      },
    ],
  };
};

// ============================================
// DAILY INSIGHTS GENERATOR
// ============================================
const generateDayInsights = (
  day: DailySnapshot,
  previousDays: DailySnapshot[]
): AIInsight[] => {
  const insights: AIInsight[] = [];
  const { vitals, sleep, activity, recovery } = day;

  // Trend-based insights (compare to 7-day average)
  const recent7 = previousDays.slice(-7);

  if (recent7.length >= 3) {
    const avgHRV = recent7.reduce((s, d) => s + d.vitals.hrv, 0) / recent7.length;
    const hrvDelta = vitals.hrv - avgHRV;

    if (hrvDelta < -8) {
      insights.push({
        id: `insight_hrv_decline_${day.dayIndex}`,
        type: 'recovery',
        title: 'HRV Declining',
        description: `Your HRV dropped ${Math.abs(Math.round(hrvDelta))}ms below your 7-day average of ${Math.round(avgHRV)}ms. This suggests accumulated fatigue.`,
        priority: 'high',
        actionable: true,
        recommendation: 'Prioritize sleep and consider reducing training intensity for the next 1-2 days.',
        timestamp: day.date,
      });
    } else if (hrvDelta > 8) {
      insights.push({
        id: `insight_hrv_improve_${day.dayIndex}`,
        type: 'recovery',
        title: 'HRV Improving',
        description: `Your HRV is ${Math.round(hrvDelta)}ms above your 7-day average. Your autonomic nervous system is adapting positively.`,
        priority: 'low',
        actionable: true,
        recommendation: 'Your recovery is strong—this is a good window for progressive overload.',
        timestamp: day.date,
      });
    }

    // Sleep trend
    const avgSleepScore = recent7.reduce((s, d) => s + d.sleep.sleepScore, 0) / recent7.length;
    if (sleep.sleepScore < avgSleepScore - 10) {
      insights.push({
        id: `insight_sleep_drop_${day.dayIndex}`,
        type: 'sleep',
        title: 'Sleep Quality Dip',
        description: `Your sleep score of ${sleep.sleepScore} is ${Math.round(avgSleepScore - sleep.sleepScore)} points below your recent average.`,
        priority: 'medium',
        actionable: true,
        recommendation: 'Review your pre-sleep routine. Screen time and caffeine after 2 PM may be factors.',
        timestamp: day.date,
      });
    }
  }

  // Heart rate insight
  if (vitals.heartRate > 75) {
    insights.push({
      id: `insight_hr_${day.dayIndex}`,
      type: 'health',
      title: 'Elevated Resting Heart Rate',
      description: `Your RHR of ${vitals.heartRate} BPM is above your typical baseline, which may indicate stress or incomplete recovery.`,
      priority: 'medium',
      actionable: true,
      recommendation: 'Consider a 10-minute breathing exercise and ensure adequate hydration.',
      timestamp: day.date,
    });
  }

  // Strain accumulation warning
  if (day.strainAccumulation > 200) {
    insights.push({
      id: `insight_strain_${day.dayIndex}`,
      type: 'activity',
      title: 'High Training Accumulation',
      description: `Your 3-day strain accumulation is ${day.strainAccumulation}—approaching overtraining territory.`,
      priority: 'high',
      actionable: true,
      recommendation: 'Schedule a recovery day. Your body needs deload to adapt and grow stronger.',
      timestamp: day.date,
    });
  }

  // Positive insight
  if (recovery.readinessScore >= 75) {
    insights.push({
      id: `insight_ready_${day.dayIndex}`,
      type: 'recovery',
      title: 'Peak Readiness Window',
      description: `Your readiness score of ${recovery.readinessScore}% indicates optimal conditions for training.`,
      priority: 'low',
      actionable: true,
      recommendation: 'Take advantage of this window—your body is primed for progressive effort.',
      timestamp: day.date,
    });
  }

  // SpO2 insight
  insights.push({
    id: `insight_spo2_${day.dayIndex}`,
    type: 'health',
    title: vitals.bloodOxygen >= 97 ? 'Blood Oxygen Optimal' : 'Blood Oxygen Normal',
    description: `SpO2 at ${vitals.bloodOxygen}%—your cardiovascular system is functioning ${vitals.bloodOxygen >= 97 ? 'excellently' : 'within normal range'}.`,
    priority: 'low',
    actionable: false,
    timestamp: day.date,
  });

  return insights;
};

// ============================================
// ANALYTICS AGGREGATION
// ============================================

export interface AnalyticsSummary {
  // Averages
  avgHeartRate: number;
  avgHRV: number;
  avgSleepScore: number;
  avgSleepDuration: number;
  avgSteps: number;
  avgReadiness: number;
  avgRecovery: number;
  avgCalories: number;
  avgActiveMinutes: number;
  avgStress: number;

  // Trends (positive = improving)
  hrvTrend: number;
  sleepTrend: number;
  readinessTrend: number;
  activityTrend: number;

  // Peaks / Records
  peakHRV: number;
  peakSteps: number;
  peakSleepScore: number;
  peakReadiness: number;
  bestDay: string;
  worstDay: string;

  // Weekly breakdown
  weeklyReadiness: { week: string; value: number }[];
  weeklyHRV: { week: string; value: number }[];
  weeklySleep: { week: string; value: number }[];
  weeklyActivity: { week: string; value: number }[];

  // Correlations
  sleepToReadinessCorrelation: string;
  hrvToPerformanceCorrelation: string;
  strainToRecoveryBalance: string;

  // Totals
  totalSteps: number;
  totalCalories: number;
  totalActiveMinutes: number;
  totalSleepHours: number;
  daysAboveReadiness70: number;
}

export const computeAnalytics = (history: DailySnapshot[]): AnalyticsSummary => {
  const n = history.length;

  const avg = (arr: number[]) => arr.reduce((s, v) => s + v, 0) / arr.length;
  const sum = (arr: number[]) => arr.reduce((s, v) => s + v, 0);

  const hrs = history.map((d) => d.vitals.heartRate);
  const hrvs = history.map((d) => d.vitals.hrv);
  const sleepScores = history.map((d) => d.sleep.sleepScore);
  const sleepDurations = history.map((d) => d.sleep.totalDuration);
  const steps = history.map((d) => d.activity.steps);
  const readiness = history.map((d) => d.recovery.readinessScore);
  const recovery = history.map((d) => d.recovery.recoveryScore);
  const calories = history.map((d) => d.activity.caloriesBurned);
  const activeMinutes = history.map((d) => d.activity.activeMinutes);
  const stress = history.map((d) => d.vitals.stressLevel);

  // Trend: compare last 7 days to previous 7 days
  const computeTrend = (arr: number[]): number => {
    if (arr.length < 14) return 0;
    const recent = avg(arr.slice(-7));
    const previous = avg(arr.slice(-14, -7));
    return Math.round(((recent - previous) / previous) * 100);
  };

  // Weekly breakdown
  const computeWeekly = (arr: number[]): { week: string; value: number }[] => {
    const weeks: { week: string; value: number }[] = [];
    for (let i = 0; i < arr.length; i += 7) {
      const chunk = arr.slice(i, i + 7);
      const weekNum = Math.floor(i / 7) + 1;
      weeks.push({ week: `W${weekNum}`, value: Math.round(avg(chunk)) });
    }
    return weeks;
  };

  // Best/worst day by readiness
  const bestIdx = readiness.indexOf(Math.max(...readiness));
  const worstIdx = readiness.indexOf(Math.min(...readiness));

  // Correlation descriptions
  const highSleepDays = history.filter((d) => d.sleep.sleepScore >= 75);
  const highSleepReadiness = highSleepDays.length > 0
    ? avg(highSleepDays.map((d) => d.recovery.readinessScore))
    : 0;
  const lowSleepDays = history.filter((d) => d.sleep.sleepScore < 65);
  const lowSleepReadiness = lowSleepDays.length > 0
    ? avg(lowSleepDays.map((d) => d.recovery.readinessScore))
    : 0;

  const sleepReadinessCorr =
    highSleepReadiness - lowSleepReadiness > 10
      ? 'Strong positive correlation: better sleep quality leads to significantly higher readiness scores.'
      : 'Moderate correlation: sleep quality has some impact on your readiness.';

  return {
    avgHeartRate: Math.round(avg(hrs)),
    avgHRV: Math.round(avg(hrvs)),
    avgSleepScore: Math.round(avg(sleepScores)),
    avgSleepDuration: Math.round(avg(sleepDurations)),
    avgSteps: Math.round(avg(steps)),
    avgReadiness: Math.round(avg(readiness)),
    avgRecovery: Math.round(avg(recovery)),
    avgCalories: Math.round(avg(calories)),
    avgActiveMinutes: Math.round(avg(activeMinutes)),
    avgStress: Math.round(avg(stress)),

    hrvTrend: computeTrend(hrvs),
    sleepTrend: computeTrend(sleepScores),
    readinessTrend: computeTrend(readiness),
    activityTrend: computeTrend(steps),

    peakHRV: Math.max(...hrvs),
    peakSteps: Math.max(...steps),
    peakSleepScore: Math.max(...sleepScores),
    peakReadiness: Math.max(...readiness),
    bestDay: history[bestIdx]?.date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) || '',
    worstDay: history[worstIdx]?.date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) || '',

    weeklyReadiness: computeWeekly(readiness),
    weeklyHRV: computeWeekly(hrvs),
    weeklySleep: computeWeekly(sleepScores),
    weeklyActivity: computeWeekly(steps),

    sleepToReadinessCorrelation: sleepReadinessCorr,
    hrvToPerformanceCorrelation:
      computeTrend(hrvs) > 0
        ? 'Positive trend: your HRV is improving, supporting better performance capacity.'
        : 'Watch area: HRV is trending down, which may limit performance output.',
    strainToRecoveryBalance:
      avg(recovery) > avg(readiness.map((r) => r * 0.7))
        ? 'Balanced: your recovery is keeping pace with training strain.'
        : 'Imbalanced: training strain is outpacing recovery. Consider a deload week.',

    totalSteps: sum(steps),
    totalCalories: sum(calories),
    totalActiveMinutes: sum(activeMinutes),
    totalSleepHours: Math.round(sum(sleepDurations) / 60),
    daysAboveReadiness70: readiness.filter((r) => r >= 70).length,
  };
};

// ============================================
// CYCLE TRACKING (30-day for women)
// ============================================

export interface CycleHistory {
  days: {
    date: Date;
    cycleDay: number;
    phase: 'menstrual' | 'follicular' | 'ovulation' | 'luteal';
    basalTemp: number;
    symptoms: string[];
    readinessImpact: number; // percentage adjustment
  }[];
  avgCycleLength: number;
  tempBaseline: number;
  ovulationDetected: boolean;
  predictedNextPeriod: Date;
  predictedOvulation: Date;
}

export const generateCycleHistory = (): CycleHistory => {
  const days: CycleHistory['days'] = [];
  const baseTemp = 36.5;
  const today = new Date();

  for (let i = 29; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const cycleDay = ((30 - i + 18) % 28) + 1;

    let phase: CycleHistory['days'][0]['phase'];
    let tempAdjust = 0;
    let readinessImpact = 0;
    const symptoms: string[] = [];

    if (cycleDay <= 5) {
      phase = 'menstrual';
      tempAdjust = -0.1;
      readinessImpact = -5;
      symptoms.push('Cramps', 'Fatigue');
    } else if (cycleDay <= 13) {
      phase = 'follicular';
      tempAdjust = 0;
      readinessImpact = 5;
      symptoms.push('Increased energy');
    } else if (cycleDay <= 16) {
      phase = 'ovulation';
      tempAdjust = 0.2;
      readinessImpact = 0;
      symptoms.push('Peak energy', 'Mild cramping');
    } else {
      phase = 'luteal';
      tempAdjust = 0.4;
      readinessImpact = -15;
      symptoms.push('Bloating', 'Mood changes');
    }

    days.push({
      date,
      cycleDay,
      phase,
      basalTemp: parseFloat((baseTemp + tempAdjust + (seededRandom() * 0.1 - 0.05)).toFixed(1)),
      symptoms,
      readinessImpact,
    });
  }

  const predictedNext = new Date(today);
  predictedNext.setDate(predictedNext.getDate() + (28 - days[days.length - 1].cycleDay));

  const predictedOv = new Date(predictedNext);
  predictedOv.setDate(predictedOv.getDate() - 14);

  return {
    days,
    avgCycleLength: 28,
    tempBaseline: baseTemp,
    ovulationDetected: true,
    predictedNextPeriod: predictedNext,
    predictedOvulation: predictedOv,
  };
};

// ============================================
// REAL-TIME SIMULATION ENGINE
// ============================================
// Simulates live-updating vitals with realistic micro-variations

export interface RealTimeVitals extends VitalData {
  trend: 'rising' | 'falling' | 'stable';
  confidence: number; // 0-100 sensor confidence
  lastUpdated: Date;
}

export const simulateRealTimeVitals = (
  previous: VitalData,
  elapsedMs: number
): RealTimeVitals => {
  const noise = (range: number) => (Math.random() - 0.5) * range;
  const hours = new Date().getHours();
  const circadian = circadianFactor(hours);

  const hr = clamp(
    Math.round(previous.heartRate + noise(3) + (circadian - 0.5) * 2),
    50,
    120
  );

  const hrv = clamp(
    Math.round(previous.hrv + noise(4)),
    20,
    90
  );

  const spo2 = clamp(
    Math.round(previous.bloodOxygen + noise(1)),
    94,
    100
  );

  const temp = clamp(
    parseFloat((previous.skinTemperature + noise(0.05)).toFixed(1)),
    35.8,
    37.5
  );

  const smo2 = clamp(
    Math.round((previous.muscleOxygen || 65) + noise(3)),
    30,
    95
  );

  const stress = clamp(
    Math.round(previous.stressLevel + noise(5)),
    5,
    95
  );

  const hrTrend = hr > previous.heartRate + 2 ? 'rising' : hr < previous.heartRate - 2 ? 'falling' : 'stable';

  return {
    timestamp: new Date(),
    heartRate: hr,
    hrv,
    bloodOxygen: spo2,
    skinTemperature: temp,
    stressLevel: stress,
    muscleOxygen: smo2,
    muscleFatigue: smo2 < 40 ? 'High' : smo2 < 60 ? 'Medium' : 'Low',
    trend: hrTrend,
    confidence: clamp(Math.round(95 + noise(8)), 80, 100),
    lastUpdated: new Date(),
  };
};
