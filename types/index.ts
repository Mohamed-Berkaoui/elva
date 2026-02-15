/**
 * ELVA App Type Definitions
 */

export type Gender = 'male' | 'female';

export interface User {
  id: string;
  name: string;
  email: string;
  gender: Gender;
  age: number;
  weight: number; // kg
  height: number; // cm
  deviceConnected: boolean;
  createdAt: Date;
}

export interface VitalData {
  timestamp: Date;
  heartRate: number; // bpm - PPG sensor @ 50Hz
  hrv: number; // ms (RMSSD) - Heart Rate Variability for recovery/stress tracking
  bloodOxygen: number; // SpO2 percentage - IR PPG @ 1Hz
  skinTemperature: number; // Celsius - Thermistor @ 0.003Hz for hormonal/immune monitoring
  stressLevel: number; // 0-100
  muscleOxygen?: number; // SmO2 percentage - NIRS @ 10Hz for real-time muscle fatigue
  muscleFatigue?: 'Low' | 'Medium' | 'High'; // Derived from SmO2
}

// Readiness calculation constants (per PRD)
export const READINESS_WEIGHTS = {
  HRV_WEIGHT: 0.4,
  SLEEP_WEIGHT: 0.4,
  STRAIN_WEIGHT: 0.2,
};

// Hormonal thresholds for female cycle detection
export const HORMONAL_THRESHOLDS = {
  OVULATION_TEMP_RISE: 0.3, // Celsius - minimum
  OVULATION_TEMP_RISE_MAX: 0.5, // Celsius - maximum
  LUTEAL_READINESS_DAMPENING: 0.85, // 15% reduction during luteal phase
};

export interface SleepData {
  date: Date;
  totalDuration: number; // minutes
  deepSleep: number; // minutes
  lightSleep: number; // minutes
  remSleep: number; // minutes
  awakeTime: number; // minutes
  sleepScore: number; // 0-100
  bedTime: Date;
  wakeTime: Date;
}

export interface ActivityData {
  date: Date;
  steps: number;
  distance: number; // km
  caloriesBurned: number;
  activeMinutes: number;
  standingHours: number;
  floors: number;
}

export interface RecoveryData {
  date: Date;
  recoveryScore: number; // 0-100
  readinessScore: number; // 0-100 - Calculated using PRD formula
  muscleRecovery: number; // 0-100
  energyLevel: number; // 0-100
  recommendation: string;
  // Readiness calculation components
  hrvNormalized?: number; // 0-1 normalized HRV
  sleepQuality?: number; // 0-1 normalized sleep quality
  dailyStrain?: number; // 0-1 normalized strain
}

// Women's Health specific types
export interface CycleData {
  cycleDay: number;
  phase: 'menstrual' | 'follicular' | 'ovulation' | 'luteal';
  estimatedOvulation: Date | null;
  nextPeriod: Date | null;
  symptoms: string[];
  fertileWindow: boolean;
  basalBodyTemp?: number; // Celsius - for ovulation detection
  tempRiseFromBaseline?: number; // Celsius - 0.3-0.5°C indicates post-ovulation
}

export interface HormoneInsight {
  date: Date;
  estrogenTrend: 'low' | 'rising' | 'peak' | 'falling';
  progesteroneTrend: 'low' | 'rising' | 'peak' | 'falling';
  recommendation: string;
  lutealPhaseActive?: boolean; // For readiness dampening
  performanceWindow?: 'optimal' | 'moderate' | 'restorative'; // Reframed as performance tool
}



export interface WorkoutRecommendation {
  type: 'strength' | 'cardio' | 'flexibility' | 'rest';
  intensity: 'low' | 'moderate' | 'high';
  duration: number; // minutes
  description: string;
  exercises: string[];
}

// AI Chat types
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  dataContext?: {
    vitals?: VitalData;
    sleep?: SleepData;
    activity?: ActivityData;
    recovery?: RecoveryData;
    last48Hours?: HealthSummary[]; // RAG context window per PRD
  };
}

// AI System configuration per PRD
export const AI_CONFIG = {
  TONE: 'calm, supportive, grounded',
  MAX_RESPONSE_LENGTH: 3, // sentences
  USE_NATURE_METAPHORS: true,
  DATA_DRIVEN: true,
  CONTEXT_WINDOW_HOURS: 48,
};

export interface AIInsight {
  id: string;
  type: 'health' | 'sleep' | 'activity' | 'recovery' | 'nutrition' | 'stress';
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  actionable: boolean;
  recommendation?: string;
  timestamp: Date;
}

export interface NutritionRecommendation {
  calories: number;
  protein: number; // grams
  carbs: number; // grams
  fats: number; // grams
  hydration: number; // liters
  meals: {
    name: string;
    time: string;
    calories: number;
    description: string;
  }[];
}

// App state types
export interface AppSettings {
  rainSoundEnabled: boolean;
  rainVolume: number;
  notificationsEnabled: boolean;
  dataRefreshInterval: number; // minutes
  theme: 'dark' | 'light' | 'auto';
}

export interface HealthSummary {
  date: Date;
  overallScore: number; // 0-100
  vitals: VitalData;
  sleep: SleepData;
  activity: ActivityData;
  recovery: RecoveryData;
  insights: AIInsight[];
  nutritionPlan: NutritionRecommendation;
}
