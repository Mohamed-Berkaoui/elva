/**
 * ELVA Supabase Service
 * Edge function stubs for backend features.
 * In production, these call Supabase Edge Functions.
 * In development, they return synthetic data.
 *
 * Supabase Edge Functions support:
 * - AI-powered analysis with database context
 * - Real-time telemetry ingestion
 * - User profile and settings management
 * - Historical data aggregation
 */

import {
  HealthSummary,
  VitalData,
  SleepData,
  ActivityData,
  RecoveryData,
  Gender,
  CycleData,
  AIInsight,
  NutritionRecommendation,
  User,
} from '@/types';
import {
  generate30DayHistory,
  computeAnalytics,
  generateCycleHistory,
  simulateRealTimeVitals,
  DEFAULT_FEMALE_PROFILE,
  DEFAULT_MALE_PROFILE,
  DailySnapshot,
  AnalyticsSummary,
  CycleHistory,
  RealTimeVitals,
} from '@/data/synthetic-telemetry';

// ============================================
// CONFIGURATION
// ============================================

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';
const USE_MOCK = process.env.EXPO_PUBLIC_USE_MOCK_DATA === 'true' || !SUPABASE_URL;

// ============================================
// API CLIENT
// ============================================

interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  status: number;
}

const callEdgeFunction = async <T>(
  functionName: string,
  body: Record<string, unknown> = {},
  method: 'GET' | 'POST' = 'POST'
): Promise<ApiResponse<T>> => {
  if (USE_MOCK) {
    // Return mock data — handled by individual functions below
    return { data: null, error: 'MOCK_MODE', status: 200 };
  }

  try {
    const url = `${SUPABASE_URL}/functions/v1/${functionName}`;
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        apikey: SUPABASE_ANON_KEY,
      },
      body: method === 'POST' ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        data: null,
        error: errorData.message || `HTTP ${response.status}`,
        status: response.status,
      };
    }

    const data = await response.json();
    return { data: data as T, error: null, status: response.status };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Network error',
      status: 0,
    };
  }
};

// ============================================
// CACHED DATA STORE
// ============================================
// In-memory cache for synthetic data to avoid regenerating
let _historyCache: DailySnapshot[] | null = null;
let _analyticsCache: AnalyticsSummary | null = null;
let _cycleCache: CycleHistory | null = null;
let _lastVitals: VitalData | null = null;

const getHistory = (gender: Gender): DailySnapshot[] => {
  if (!_historyCache) {
    const profile = gender === 'female' ? DEFAULT_FEMALE_PROFILE : DEFAULT_MALE_PROFILE;
    _historyCache = generate30DayHistory(profile);
  }
  return _historyCache;
};

const getAnalytics = (gender: Gender): AnalyticsSummary => {
  if (!_analyticsCache) {
    _analyticsCache = computeAnalytics(getHistory(gender));
  }
  return _analyticsCache;
};

export const invalidateCache = () => {
  _historyCache = null;
  _analyticsCache = null;
  _cycleCache = null;
  _lastVitals = null;
};

// ============================================
// EDGE FUNCTION STUBS
// ============================================

/**
 * POST /functions/v1/ingest-telemetry
 * Ingests real-time telemetry data from the ELVA bracelet.
 * In production: stores in Supabase Realtime + Timescale.
 */
export const ingestTelemetry = async (
  userId: string,
  vitals: VitalData
): Promise<ApiResponse<{ received: boolean; alertsTriggered: string[] }>> => {
  const result = await callEdgeFunction<{ received: boolean; alertsTriggered: string[] }>(
    'ingest-telemetry',
    { userId, vitals }
  );

  if (result.error === 'MOCK_MODE') {
    // Simulate alert detection
    const alerts: string[] = [];
    if (vitals.heartRate > 100) alerts.push('elevated_heart_rate');
    if ((vitals.muscleOxygen || 100) < 15) alerts.push('critical_smo2');
    if (vitals.stressLevel > 80) alerts.push('high_stress');
    if (vitals.bloodOxygen < 94) alerts.push('low_spo2');

    return { data: { received: true, alertsTriggered: alerts }, error: null, status: 200 };
  }

  return result;
};

/**
 * POST /functions/v1/get-health-summary
 * Returns the current day's health summary with AI insights.
 */
export const getHealthSummary = async (
  userId: string,
  gender: Gender
): Promise<ApiResponse<HealthSummary>> => {
  const result = await callEdgeFunction<HealthSummary>('get-health-summary', { userId, gender });

  if (result.error === 'MOCK_MODE') {
    const history = getHistory(gender);
    const today = history[history.length - 1];
    const summary: HealthSummary = {
      date: today.date,
      overallScore: Math.round(
        (today.sleep.sleepScore + today.recovery.recoveryScore + Math.min(100, today.activity.steps / 100)) / 3
      ),
      vitals: today.vitals,
      sleep: today.sleep,
      activity: today.activity,
      recovery: today.recovery,
      insights: today.insights,
      nutritionPlan: today.nutritionPlan,
    };
    return { data: summary, error: null, status: 200 };
  }

  return result;
};

/**
 * POST /functions/v1/get-analytics
 * Returns 30-day analytics aggregation for detailed insights.
 */
export const getAnalyticsSummary = async (
  userId: string,
  gender: Gender,
  period: '7d' | '14d' | '30d' = '30d'
): Promise<ApiResponse<AnalyticsSummary>> => {
  const result = await callEdgeFunction<AnalyticsSummary>('get-analytics', { userId, gender, period });

  if (result.error === 'MOCK_MODE') {
    const analytics = getAnalytics(gender);
    return { data: analytics, error: null, status: 200 };
  }

  return result;
};

/**
 * POST /functions/v1/get-history
 * Returns daily snapshots for charting and trend analysis.
 */
export const getHistoricalData = async (
  userId: string,
  gender: Gender,
  days: number = 30
): Promise<ApiResponse<DailySnapshot[]>> => {
  const result = await callEdgeFunction<DailySnapshot[]>('get-history', { userId, gender, days });

  if (result.error === 'MOCK_MODE') {
    const history = getHistory(gender);
    return { data: history.slice(-days), error: null, status: 200 };
  }

  return result;
};

/**
 * POST /functions/v1/ai-coach
 * AI-powered coaching response using biometric context.
 * In production: uses Supabase pgvector for RAG + OpenAI.
 */
export const getAICoachResponse = async (
  userId: string,
  message: string,
  gender: Gender,
  healthContext: HealthSummary
): Promise<ApiResponse<{ response: string; suggestions: string[] }>> => {
  const result = await callEdgeFunction<{ response: string; suggestions: string[] }>(
    'ai-coach',
    { userId, message, gender, healthContext }
  );

  if (result.error === 'MOCK_MODE') {
    // Use local AI service or mock
    return {
      data: {
        response: '',  // Will be handled by ai-service.ts
        suggestions: [
          'How is my recovery trending?',
          'What should I eat today?',
          'Am I ready for a workout?',
          'How can I improve my sleep?',
        ],
      },
      error: null,
      status: 200,
    };
  }

  return result;
};

/**
 * POST /functions/v1/ai-insights
 * Generates AI-powered insights based on multi-day trends.
 * In production: uses vector similarity search across historical data.
 */
export const getAIInsights = async (
  userId: string,
  gender: Gender,
  lookbackDays: number = 7
): Promise<ApiResponse<AIInsight[]>> => {
  const result = await callEdgeFunction<AIInsight[]>('ai-insights', { userId, gender, lookbackDays });

  if (result.error === 'MOCK_MODE') {
    const history = getHistory(gender);
    const today = history[history.length - 1];
    return { data: today.insights, error: null, status: 200 };
  }

  return result;
};

/**
 * POST /functions/v1/get-cycle-data
 * Returns women's cycle tracking history and predictions.
 */
export const getCycleTrackingData = async (
  userId: string
): Promise<ApiResponse<CycleHistory>> => {
  const result = await callEdgeFunction<CycleHistory>('get-cycle-data', { userId });

  if (result.error === 'MOCK_MODE') {
    if (!_cycleCache) {
      _cycleCache = generateCycleHistory();
    }
    return { data: _cycleCache, error: null, status: 200 };
  }

  return result;
};

/**
 * POST /functions/v1/get-realtime-vitals
 * Returns simulated real-time vitals (for live dashboard feel).
 */
export const getRealTimeVitals = async (
  userId: string,
  previousVitals?: VitalData
): Promise<ApiResponse<RealTimeVitals>> => {
  const result = await callEdgeFunction<RealTimeVitals>('get-realtime-vitals', { userId });

  if (result.error === 'MOCK_MODE') {
    const baseline: VitalData = previousVitals || _lastVitals || {
      timestamp: new Date(),
      heartRate: 72,
      hrv: 50,
      bloodOxygen: 98,
      skinTemperature: 36.5,
      stressLevel: 25,
      muscleOxygen: 70,
      muscleFatigue: 'Low',
    };

    const realtime = simulateRealTimeVitals(baseline, 1000);
    _lastVitals = realtime;
    return { data: realtime, error: null, status: 200 };
  }

  return result;
};

/**
 * POST /functions/v1/update-profile
 * Updates user profile on the backend.
 */
export const updateUserProfile = async (
  userId: string,
  updates: Partial<User>
): Promise<ApiResponse<User>> => {
  const result = await callEdgeFunction<User>('update-profile', { userId, ...updates });

  if (result.error === 'MOCK_MODE') {
    return {
      data: { ...updates, id: userId } as User,
      error: null,
      status: 200,
    };
  }

  return result;
};

/**
 * POST /functions/v1/nutrition-plan
 * Generates personalized nutrition plan using AI + biometrics.
 */
export const getNutritionPlan = async (
  userId: string,
  gender: Gender,
  activity: ActivityData,
  recovery: RecoveryData
): Promise<ApiResponse<NutritionRecommendation>> => {
  const result = await callEdgeFunction<NutritionRecommendation>(
    'nutrition-plan',
    { userId, gender, activity, recovery }
  );

  if (result.error === 'MOCK_MODE') {
    const history = getHistory(gender);
    const today = history[history.length - 1];
    return { data: today.nutritionPlan, error: null, status: 200 };
  }

  return result;
};

/**
 * POST /functions/v1/export-data
 * Exports user health data (for sharing with healthcare providers).
 */
export const exportHealthData = async (
  userId: string,
  gender: Gender,
  format: 'json' | 'csv' = 'json'
): Promise<ApiResponse<{ url: string; expiresAt: string }>> => {
  const result = await callEdgeFunction<{ url: string; expiresAt: string }>(
    'export-data',
    { userId, gender, format }
  );

  if (result.error === 'MOCK_MODE') {
    return {
      data: {
        url: 'https://storage.example.com/exports/health-data-demo.json',
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
      },
      error: null,
      status: 200,
    };
  }

  return result;
};

// ============================================
// SERVICE STATUS
// ============================================

export const getServiceStatus = () => ({
  supabaseConfigured: !!SUPABASE_URL && !!SUPABASE_ANON_KEY,
  usingMockData: USE_MOCK,
  cacheWarmed: !!_historyCache,
  endpoints: [
    'ingest-telemetry',
    'get-health-summary',
    'get-analytics',
    'get-history',
    'ai-coach',
    'ai-insights',
    'get-cycle-data',
    'get-realtime-vitals',
    'update-profile',
    'nutrition-plan',
    'export-data',
  ],
});

export default {
  ingestTelemetry,
  getHealthSummary,
  getAnalyticsSummary,
  getHistoricalData,
  getAICoachResponse,
  getAIInsights,
  getCycleTrackingData,
  getRealTimeVitals,
  updateUserProfile,
  getNutritionPlan,
  exportHealthData,
  getServiceStatus,
  invalidateCache,
};
