/**
 * ELVA Mock Data Service
 * Simulates data from the ELVA wearable bracelet
 */

import {
  User,
  VitalData,
  SleepData,
  ActivityData,
  RecoveryData,
  CycleData,
  HormoneInsight,
  AIInsight,
  NutritionRecommendation,
  HealthSummary,
  ChatMessage,
  READINESS_WEIGHTS,
  HORMONAL_THRESHOLDS,
} from '@/types';

// Current mock user
export const mockUser: User = {
  id: 'user_001',
  name: 'Alex',
  email: 'alex@example.com',
  gender: 'female',
  age: 28,
  weight: 65,
  height: 168,
  deviceConnected: true,
  createdAt: new Date('2025-01-15'),
};

// Generate current vitals with PRD-specified sensors
export const getCurrentVitals = (): VitalData => ({
  timestamp: new Date(),
  heartRate: 72 + Math.floor(Math.random() * 10 - 5), // PPG @ 50Hz
  hrv: 45 + Math.floor(Math.random() * 20 - 10), // RMSSD for recovery tracking
  bloodOxygen: 97 + Math.floor(Math.random() * 3), // IR PPG @ 1Hz
  skinTemperature: 36.5 + Math.random() * 0.5, // Thermistor @ 0.003Hz
  stressLevel: 25 + Math.floor(Math.random() * 20),
  muscleOxygen: 65 + Math.floor(Math.random() * 20), // NIRS @ 10Hz - SmO2 percentage
  muscleFatigue: Math.random() > 0.7 ? 'High' : Math.random() > 0.4 ? 'Medium' : 'Low',
});

// Calculate readiness using PRD formula
// R = (HRV_norm × 0.4) + (Sleep_quality × 0.4) - (Strain_daily × 0.2)
export const calculateReadinessScore = (
  hrvNormalized: number,
  sleepQuality: number,
  dailyStrain: number,
  isLutealPhase: boolean = false
): number => {
  const { HRV_WEIGHT, SLEEP_WEIGHT, STRAIN_WEIGHT } = READINESS_WEIGHTS;
  
  let readiness = (
    (hrvNormalized * HRV_WEIGHT) +
    (sleepQuality * SLEEP_WEIGHT) -
    (dailyStrain * STRAIN_WEIGHT)
  ) * 100;
  
  // Apply luteal phase dampening for female users per PRD
  if (isLutealPhase) {
    readiness *= HORMONAL_THRESHOLDS.LUTEAL_READINESS_DAMPENING;
  }
  
  return Math.max(0, Math.min(100, Math.round(readiness)));
};

// Today's activity data
export const getTodayActivity = (): ActivityData => ({
  date: new Date(),
  steps: 7842,
  distance: 5.2,
  caloriesBurned: 320,
  activeMinutes: 45,
  standingHours: 8,
  floors: 12,
});

// Last night's sleep data
export const getLastNightSleep = (): SleepData => ({
  date: new Date(Date.now() - 86400000),
  totalDuration: 420, // 7 hours
  deepSleep: 90,
  lightSleep: 210,
  remSleep: 105,
  awakeTime: 15,
  sleepScore: 78,
  bedTime: new Date(new Date().setHours(23, 30, 0, 0)),
  wakeTime: new Date(new Date().setHours(7, 0, 0, 0)),
});

// Recovery data with PRD readiness calculation
export const getRecoveryData = (): RecoveryData => {
  const hrvNormalized = 0.65; // 0-1 scale
  const sleepQuality = 0.78; // 0-1 scale
  const dailyStrain = 0.35; // 0-1 scale
  const isLutealPhase = mockUser.gender === 'female' && getCycleData().phase === 'luteal';
  
  return {
    date: new Date(),
    recoveryScore: 72,
    readinessScore: calculateReadinessScore(hrvNormalized, sleepQuality, dailyStrain, isLutealPhase),
    muscleRecovery: 85,
    energyLevel: 65,
    recommendation: 'Your body is recovering well. Consider moderate activity today.',
    hrvNormalized,
    sleepQuality,
    dailyStrain,
  };
};

// Women's cycle data with basal body temperature tracking
export const getCycleData = (): CycleData => {
  const baselineTemp = 36.5;
  const currentDay = 22; // Luteal phase
  const isPostOvulation = currentDay > 14;
  const tempRise = isPostOvulation ? 0.4 : 0; // 0.3-0.5°C rise indicates luteal phase
  
  return {
    cycleDay: currentDay,
    phase: 'luteal',
    estimatedOvulation: new Date(Date.now() - 8 * 86400000),
    nextPeriod: new Date(Date.now() + 6 * 86400000),
    symptoms: ['Mild bloating', 'Slightly elevated energy needs'],
    fertileWindow: false,
    basalBodyTemp: baselineTemp + tempRise,
    tempRiseFromBaseline: tempRise,
  };
};

// Hormone insights for women with performance window framing
export const getHormoneInsights = (): HormoneInsight => {
  const cycleData = getCycleData();
  const isLutealPhase = cycleData.phase === 'luteal';
  
  return {
    date: new Date(),
    estrogenTrend: 'falling',
    progesteroneTrend: 'peak',
    recommendation: 'Your readiness score is naturally adjusted during this phase. Consider steady-state movement rather than high-intensity training.',
    lutealPhaseActive: isLutealPhase,
    performanceWindow: 'restorative', // Framed as optimization tool per PRD
  };
};



// AI-generated insights
export const getAIInsights = (vitals: VitalData, sleep: SleepData, activity: ActivityData, recovery: RecoveryData): AIInsight[] => {
  const insights: AIInsight[] = [];

  // Heart rate insight
  if (vitals.heartRate > 75) {
    insights.push({
      id: 'insight_hr_1',
      type: 'health',
      title: 'Elevated Resting Heart Rate',
      description: `Your resting heart rate is ${vitals.heartRate} BPM, slightly higher than your baseline. This could indicate stress, dehydration, or insufficient recovery.`,
      priority: 'medium',
      actionable: true,
      recommendation: 'Consider taking a 10-minute breathing exercise and ensure you\'re well hydrated.',
      timestamp: new Date(),
    });
  }

  // Sleep insight
  if (sleep.sleepScore < 80) {
    insights.push({
      id: 'insight_sleep_1',
      type: 'sleep',
      title: 'Sleep Quality Could Improve',
      description: `Your sleep score was ${sleep.sleepScore}. You got ${Math.round(sleep.deepSleep / 60)} hours of deep sleep, which is below optimal levels.`,
      priority: 'medium',
      actionable: true,
      recommendation: 'Try reducing screen time 1 hour before bed and keep your room temperature around 18°C.',
      timestamp: new Date(),
    });
  }

  // Activity insight
  if (activity.steps < 8000) {
    insights.push({
      id: 'insight_activity_1',
      type: 'activity',
      title: 'Step Goal Progress',
      description: `You've taken ${activity.steps.toLocaleString()} steps today. You're ${(10000 - activity.steps).toLocaleString()} steps away from your daily goal.`,
      priority: 'low',
      actionable: true,
      recommendation: 'A 15-minute evening walk could help you reach your goal and improve sleep quality.',
      timestamp: new Date(),
    });
  }

  // Recovery insight
  if (recovery.recoveryScore < 75) {
    insights.push({
      id: 'insight_recovery_1',
      type: 'recovery',
      title: 'Recovery Day Recommended',
      description: `Your recovery score is ${recovery.recoveryScore}%. Your body needs more rest to perform optimally.`,
      priority: 'high',
      actionable: true,
      recommendation: 'Focus on light stretching, hydration, and consider a protein-rich meal with 500-600 calories.',
      timestamp: new Date(),
    });
  }

  // Stress insight
  if (vitals.stressLevel > 40) {
    insights.push({
      id: 'insight_stress_1',
      type: 'stress',
      title: 'Elevated Stress Detected',
      description: `Your HRV indicates a stress level of ${vitals.stressLevel}%. Taking time for relaxation could help restore balance.`,
      priority: 'medium',
      actionable: true,
      recommendation: 'Enable the calming rain sounds and practice 5 minutes of deep breathing.',
      timestamp: new Date(),
    });
  }

  // Always add a positive insight
  insights.push({
    id: 'insight_positive_1',
    type: 'health',
    title: 'Blood Oxygen Optimal',
    description: `Your SpO2 is at ${vitals.bloodOxygen}%, which is excellent. Your cardiovascular system is functioning well.`,
    priority: 'low',
    actionable: false,
    timestamp: new Date(),
  });

  return insights;
};

// Nutrition recommendations based on activity and recovery
export const getNutritionRecommendation = (activity: ActivityData, recovery: RecoveryData): NutritionRecommendation => {
  const baseCalories = 1800;
  const activityCalories = activity.caloriesBurned;
  const totalCalories = Math.round(baseCalories + activityCalories * 0.5);

  return {
    calories: totalCalories,
    protein: Math.round(totalCalories * 0.25 / 4), // 25% from protein
    carbs: Math.round(totalCalories * 0.45 / 4), // 45% from carbs
    fats: Math.round(totalCalories * 0.30 / 9), // 30% from fats
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
        calories: Math.round(totalCalories * 0.10),
        description: 'Apple with almond butter',
      },
      {
        name: 'Dinner',
        time: '7:00 PM',
        calories: Math.round(totalCalories * 0.30),
        description: 'Salmon with roasted vegetables and brown rice',
      },
    ],
  };
};

// Weekly data for charts
export const getWeeklyHeartRate = () => {
  const data = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    data.push({
      date: date.toLocaleDateString('en-US', { weekday: 'short' }),
      value: 68 + Math.floor(Math.random() * 10),
    });
  }
  return data;
};

export const getWeeklySleep = () => {
  const data = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    data.push({
      date: date.toLocaleDateString('en-US', { weekday: 'short' }),
      value: 6 + Math.random() * 2,
      deepSleep: 1 + Math.random() * 1,
    });
  }
  return data;
};

export const getWeeklySteps = () => {
  const data = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    data.push({
      date: date.toLocaleDateString('en-US', { weekday: 'short' }),
      value: 5000 + Math.floor(Math.random() * 8000),
    });
  }
  return data;
};

// Generate full health summary
export const getHealthSummary = (): HealthSummary => {
  const vitals = getCurrentVitals();
  const sleep = getLastNightSleep();
  const activity = getTodayActivity();
  const recovery = getRecoveryData();

  return {
    date: new Date(),
    overallScore: Math.round((sleep.sleepScore + recovery.recoveryScore + Math.min(100, activity.steps / 100)) / 3),
    vitals,
    sleep,
    activity,
    recovery,
    insights: getAIInsights(vitals, sleep, activity, recovery),
    nutritionPlan: getNutritionRecommendation(activity, recovery),
  };
};

// Mock chat messages with PRD-compliant AI tone
export const getMockChatHistory = (userName: string = 'there'): ChatMessage[] => [
  {
    id: 'msg_1',
    role: 'assistant',
    content: `Good morning, ${userName}. I've noticed your deep sleep was 15% higher than average, but your HRV is recovering slowly. A light session is advised.`,
    timestamp: new Date(Date.now() - 3600000),
  },
];

// AI Coach responses - PRD Compliant
// System Prompt: Calm, supportive, grounded. Brief (under 3 sentences). Data-driven. Nature metaphors.
export const generateAIResponse = (userMessage: string, healthData: HealthSummary): string => {
  const { vitals, sleep, activity, recovery } = healthData;
  const lowercaseMessage = userMessage.toLowerCase();
  
  // Tired/Exhausted
  if (lowercaseMessage.includes('tired') || lowercaseMessage.includes('exhausted')) {
    return `Your deep sleep was ${Math.round(sleep.deepSleep)}min, below your baseline. Your body is prioritizing internal recovery—like roots deepening before new growth. Consider a steady-state walk rather than pushing through.`;
  }
  
  // Workout/Exercise
  if (lowercaseMessage.includes('workout') || lowercaseMessage.includes('exercise')) {
    if (recovery.readinessScore > 70) {
      return `Your readiness score is ${recovery.readinessScore}%. Your HRV at ${vitals.hrv}ms supports high-output work today. The conditions are aligned for intensity.`;
    } else {
      return `Your readiness is ${recovery.readinessScore}%, adjusted for your current recovery phase. Think of this as winter—restorative movement serves you better than force. Try steady-state cardio or mobility work.`;
    }
  }
  
  // Sleep/Rest  
  if (lowercaseMessage.includes('sleep') || lowercaseMessage.includes('rest')) {
    return `You had ${Math.round(sleep.deepSleep)}min of deep sleep—this is your body's repair window. Your nocturnal HRV suggests ${recovery.readinessScore < 70 ? 'you need more recovery time' : 'solid restoration'}. Consider reducing screen time 1 hour before bed.`;
  }
  
  // Stress/Anxiety
  if (lowercaseMessage.includes('stress') || lowercaseMessage.includes('anxious') || lowercaseMessage.includes('calm')) {
    return `Your HRV indicates a stress level of ${vitals.stressLevel}%. Even 5 minutes of grounded breathing can shift your system. Try the rain sounds—they're designed to lower cortisol.`;
  }
  
  // Food/Nutrition
  if (lowercaseMessage.includes('eat') || lowercaseMessage.includes('food') || lowercaseMessage.includes('hungry')) {
    const nutrition = healthData.nutritionPlan;
    return `Your activity burned ${activity.caloriesBurned} calories. Aim for ${nutrition.protein}g protein today to support recovery. Think of nutrition as fuel for the next growth cycle, not just today's energy.`;
  }
  
  // Default response - Brief data summary
  return `Your HRV is ${vitals.hrv}ms and readiness sits at ${recovery.readinessScore}%. ${recovery.readinessScore > 70 ? 'Your system is primed for output.' : 'Your body is asking for gentler input today.'} What would you like to explore?`;
};
