/**
 * ELVA Database Service - Web Stub
 * Web platform doesn't support expo-sqlite with WASM bundling.
 * Returns null/empty implementations for web.
 */

// Stub implementations for web - database functions return null or empty data

export const getDatabase = async (): Promise<any> => {
  console.warn('Database not available on web platform. Using mock data.');
  return null;
};

// ============================================
// VITALS
// ============================================

export const insertVital = async (): Promise<number> => {
  return 0;
};

export const createVitalRecord = async (): Promise<number> => {
  console.warn('Database not available on web');
  return 0;
};

export const getLatestVital = async (): Promise<any> => null;

export const getRecentVitals = async (): Promise<any[]> => [];

export const getVitalsForPeriod = async (): Promise<any[]> => [];

export const getHourlyAverages = async (): Promise<any[]> => [];

export const getVitalStats = async (): Promise<any> => null;

// ============================================
// SLEEP
// ============================================

export const startSleepSession = async (): Promise<number> => {
  console.warn('Database not available on web');
  return 0;
};

export const endSleepSession = async (): Promise<void> => {
  console.warn('Database not available on web');
};

export const getActiveSleepSession = async (): Promise<any> => null;

export const getLastSleepSession = async (): Promise<any> => null;

export const getRecentSleepSessions = async (): Promise<any[]> => [];

// ============================================
// ACTIVITIES
// ============================================

export type ActivityType = 'running' | 'walking' | 'cycling' | 'strength' | 'yoga' | 'meditation' | 'swimming' | 'hiit' | 'stretching' | 'other';

export const logActivity = async (): Promise<number> => {
  console.warn('Database not available on web');
  return 0;
};

export const startActivity = async (): Promise<number> => {
  console.warn('Database not available on web');
  return 0;
};

export const updateActiveActivity = async (): Promise<void> => {};

export const endActivity = async (): Promise<void> => {};

export const getActiveActivity = async (): Promise<any> => null;

export const getRecentActivities = async (): Promise<any[]> => [];

export const getActivityStats = async (): Promise<any> => null;

// ============================================
// AI INSIGHTS & SUMMARIES
// ============================================

export const addAIInsight = async (): Promise<number> => {
  console.warn('Database not available on web');
  return 0;
};

export const insertAIInsight = async (): Promise<number> => {
  return 0;
};

export const insertAINotification = async (): Promise<number> => {
  return 0;
};

export const getUnreadInsights = async (): Promise<any[]> => [];

export const getRecentInsights = async (): Promise<any[]> => [];

export const markInsightRead = async (): Promise<void> => {};

export const dismissInsight = async (): Promise<void> => {};

export const markInsightAsRead = async (): Promise<void> => {
  console.warn('Database not available on web');
};

export const getDailySummary = async (): Promise<any> => null;

export const getDailySummaries = async (): Promise<any[]> => [];

export const getTodaySummary = async (): Promise<any> => null;

export const upsertDailySummary = async (): Promise<void> => {};

export const getUnreadNotifications = async (): Promise<any[]> => [];

export const markNotificationRead = async (): Promise<void> => {};

export const markAllNotificationsRead = async (): Promise<void> => {};

export const setSetting = async (): Promise<void> => {};

export const getSetting = async (): Promise<string | null> => null;

export const getAllSettings = async (): Promise<Record<string, string>> => ({});

export const getVitalCount = async (): Promise<number> => 0;

export const clearAllData = async (): Promise<void> => {};

export const getDatabaseSize = async (): Promise<string> => '0 B';

export interface AIInsightRecord {
  id?: number;
  timestamp: string;
  type: string;
  title: string;
  description: string;
  priority: string;
  actionable: number;
  recommendation?: string;
  read: number;
  dismissed: number;
}

export interface AINotificationRecord {
  id?: number;
  timestamp: string;
  title: string;
  body: string;
  type: string;
  priority: string;
  read: number;
  data?: string;
}

export interface DailySummaryRecord {
  id?: number;
  date: string;
  total_steps: number;
  total_calories: number;
  total_active_min: number;
  total_distance_km: number;
  avg_heart_rate: number;
  avg_hrv: number;
  avg_stress: number;
  avg_spo2: number;
  readiness_score: number;
  recovery_score: number;
}

// ============================================
// TYPES (Must match database.ts)
// ============================================

export interface VitalRecord {
  id?: number;
  timestamp: string;
  heart_rate: number;
  hrv: number;
  blood_oxygen: number;
  skin_temperature: number;
  stress_level: number;
  muscle_oxygen?: number;
  muscle_fatigue?: string;
  source?: string;
}

export interface SleepRecord {
  id?: number;
  start_time: string;
  end_time?: string;
  total_duration_min: number;
  deep_sleep_min: number;
  light_sleep_min: number;
  rem_sleep_min: number;
  awake_min: number;
  sleep_score: number;
  is_active: number;
  source?: string;
}

export interface ActivityRecord {
  id?: number;
  start_time: string;
  end_time?: string;
  activity_type: ActivityType;
  intensity: string;
  duration_min: number;
  calories: number;
  heart_rate_avg: number;
  source?: string;
}

export interface ActivityLogRecord {
  id?: number;
  activity_session_id: number;
  timestamp: string;
  heart_rate: number;
  steps: number;
  calories: number;
}

// ============================================
// BRACELET STATE
// ============================================

export interface BraceletState {
  is_connected: number;
  battery_level: number;
  firmware_version: string;
  last_sync?: string;
  simulation_speed: number;
  is_simulating: number;
}

export const getBraceletState = async (): Promise<BraceletState | null> => {
  return null;
};

export const updateBraceletState = async (state: Partial<BraceletState>): Promise<void> => {
  // no-op for web
};
