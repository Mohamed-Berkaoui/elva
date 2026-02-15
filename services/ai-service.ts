/**
 * ELVA AI Service v2
 * Real OpenAI integration with SQLite-backed context.
 * Runs analysis on each new bracelet data batch and generates notifications.
 * 
 * PRD: Calm, supportive, grounded. Under 3 sentences. Data first. Nature metaphors.
 */

import { Gender, CycleData } from '@/types';
import {
  getRecentVitals,
  getLastSleepSession,
  getRecentActivities,
  getVitalStats,
  getDailySummaries,
  insertAIInsight,
  insertAINotification,
  getLatestVital,
  getActivityStats,
  type VitalRecord,
  type SleepRecord,
} from './database';

// ============================================
// CONFIG
// ============================================

// For Vercel/web deployment: set EXPO_PUBLIC_OPENAI_API_KEY in your
// Vercel project → Settings → Environment Variables.
// Locally: set it in mobile/.env (already gitignored).
const OPENAI_API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY || '';
const OPENAI_MODEL = process.env.EXPO_PUBLIC_OPENAI_MODEL || 'gpt-4o';

// Log at module load time so we can verify key is picked up
if (typeof window !== 'undefined') {
  console.log('[ELVA AI] API key loaded:', OPENAI_API_KEY ? `${OPENAI_API_KEY.substring(0, 10)}... (${OPENAI_API_KEY.length} chars)` : '(empty)');
}

export const isAIAvailable = (): boolean => {
  const available = OPENAI_API_KEY.length > 10;
  return available;
};

// ============================================
// SYSTEM PROMPT
// ============================================

const ELVA_SYSTEM_PROMPT = `You are the ELVA Wellness Assistant — a personal AI health coach built into the ELVA wearable bracelet app. You have FULL ACCESS to the user's real-time biometric data (heart rate, HRV, blood oxygen, skin temperature, muscle oxygen, stress level), sleep data (duration, deep/REM/light stages, sleep score), activity/workout data (sessions, calories, steps, distance), recovery scores, readiness scores, and — for women — menstrual cycle phase and hormone trends.

SCOPE:
- You ONLY answer questions related to health, wellness, fitness, sleep, stress, recovery, nutrition, exercise, the user's biometric data, and the ELVA app.
- If the user asks about something unrelated (politics, coding, recipes, etc.), politely redirect them: "I'm your health coach — I can only help with wellness, fitness, and your ELVA data. Try asking about your sleep, readiness, or recovery!"

GUIDELINES:
1. Supportive, not Clinical: Validate feelings but do not provide medical diagnoses.
2. Data First: Always reference specific metrics (HRV, Deep Sleep %, RHR, SpO2, SmO2, stress %) with actual numbers from the user's data when giving advice.
3. Nature-Inspired: Use metaphors related to nature (e.g., "seasonal shifts," "grounding," "rhythms," "winter/spring phases," "roots deepening").
4. Brief by Default: Keep responses under 3 sentences unless the user asks for a deep dive or detailed explanation.
5. Personalized: Never give generic advice — always tie recommendations to the user's actual numbers.
6. Frame as Optimization: For women, refer to cycle phases as "Performance Windows." For men, focus on recovery-to-strain ratios.

NEVER:
- Give medical diagnoses or prescriptions
- Answer questions outside health/wellness/fitness/ELVA scope
- Be overly clinical or cold
- Use emoji excessively (max 1 per response)
- Give generic advice without referencing data
- Write responses longer than 3 sentences unless specifically asked`;

// ============================================
// CONTEXT BUILDER (reads from SQLite)
// ============================================

export const buildContextFromDatabase = async (
  gender: Gender,
  cycleData?: CycleData
): Promise<string> => {
  let latestVital: any, vitalStats7d: any, lastSleep: any, recentActivities: any[], dailySummaries: any[], activityStats: any;

  try {
    [latestVital, vitalStats7d, lastSleep, recentActivities, dailySummaries, activityStats] = await Promise.all([
      getLatestVital(),
      getVitalStats(7),
      getLastSleepSession(),
      getRecentActivities(7),
      getDailySummaries(30),
      getActivityStats(7),
    ]);
  } catch (e) {
    console.warn('[ELVA AI] Database read failed, using mock context:', e);
    latestVital = null;
    vitalStats7d = null;
    lastSleep = null;
    recentActivities = [];
    dailySummaries = [];
    activityStats = null;
  }

  // ── Web/offline fallback: provide realistic mock vitals when database is empty ──
  if (!latestVital) {
    latestVital = {
      heart_rate: 68,
      hrv: 52,
      blood_oxygen: 98,
      skin_temperature: 36.6,
      muscle_oxygen: 72,
      muscle_fatigue: 'Low',
      stress_level: 22,
    };
  }
  if (!vitalStats7d) {
    vitalStats7d = {
      avg_hr: 71,
      min_hr: 54,
      max_hr: 142,
      avg_hrv: 48,
      avg_stress: 28,
      total_readings: 1680,
    };
  }
  if (!lastSleep) {
    lastSleep = {
      total_duration_min: 462,
      deep_sleep_min: 94,
      rem_sleep_min: 108,
      sleep_score: 82,
    };
  }
  if (!activityStats || activityStats.total_sessions === 0) {
    activityStats = {
      total_sessions: 5,
      total_duration_min: 245,
      total_calories: 1820,
      total_steps: 52400,
      total_distance: 38.2,
    };
  }

  // Calculate trends from daily summaries
  let trendContext = '';
  if (dailySummaries.length >= 7) {
    const recent7 = dailySummaries.slice(-7);
    const prev7 = dailySummaries.slice(-14, -7);
    
    if (prev7.length > 0) {
      const recentAvgHRV = recent7.reduce((s, d) => s + d.avg_hrv, 0) / recent7.length;
      const prevAvgHRV = prev7.reduce((s, d) => s + d.avg_hrv, 0) / prev7.length;
      const hrvTrend = prevAvgHRV > 0 ? ((recentAvgHRV - prevAvgHRV) / prevAvgHRV * 100).toFixed(1) : '0';
      
      const recentAvgReadiness = recent7.reduce((s, d) => s + d.readiness_score, 0) / recent7.length;
      const avgStress = recent7.reduce((s, d) => s + d.avg_stress, 0) / recent7.length;

      trendContext = `
TRENDS (7-Day):
- Avg HRV: ${recentAvgHRV.toFixed(0)}ms (${Number(hrvTrend) >= 0 ? '+' : ''}${hrvTrend}% vs previous week)
- Avg Readiness: ${recentAvgReadiness.toFixed(0)}%
- Avg Stress: ${avgStress.toFixed(0)}%
- Total Steps (7d): ${recent7.reduce((s, d) => s + d.total_steps, 0).toLocaleString()}`;
    }
  }

  let context = `USER BIOMETRIC CONTEXT (Real-Time from ELVA Bracelet):
- Heart Rate: ${latestVital?.heart_rate || 'N/A'} BPM
- HRV (RMSSD): ${latestVital?.hrv || 'N/A'} ms
- Blood Oxygen (SpO2): ${latestVital?.blood_oxygen || 'N/A'}%
- Skin Temperature: ${latestVital?.skin_temperature?.toFixed(1) || 'N/A'}°C
- Muscle Oxygen (SmO2): ${latestVital?.muscle_oxygen || 'N/A'}%
- Muscle Fatigue: ${latestVital?.muscle_fatigue || 'N/A'}
- Stress Level: ${latestVital?.stress_level || 'N/A'}%

WEEKLY STATS:
- Avg HR: ${vitalStats7d?.avg_hr?.toFixed(0) || 'N/A'} BPM (min: ${vitalStats7d?.min_hr || 'N/A'}, max: ${vitalStats7d?.max_hr || 'N/A'})
- Avg HRV: ${vitalStats7d?.avg_hrv?.toFixed(0) || 'N/A'} ms
- Avg Stress: ${vitalStats7d?.avg_stress?.toFixed(0) || 'N/A'}%
- Total Readings: ${vitalStats7d?.total_readings || 0}`;

  if (lastSleep) {
    context += `

LAST SLEEP:
- Duration: ${Math.round(lastSleep.total_duration_min / 60)}h ${Math.round(lastSleep.total_duration_min % 60)}m
- Deep Sleep: ${Math.round(lastSleep.deep_sleep_min)}m
- REM: ${Math.round(lastSleep.rem_sleep_min)}m
- Score: ${lastSleep.sleep_score}/100`;
  }

  if (activityStats && activityStats.total_sessions > 0) {
    context += `

ACTIVITY (7-Day):
- Sessions: ${activityStats.total_sessions}
- Active Time: ${Math.round(activityStats.total_duration_min)}min
- Calories: ${Math.round(activityStats.total_calories)} kcal
- Steps: ${activityStats.total_steps.toLocaleString()}
- Distance: ${activityStats.total_distance.toFixed(1)} km`;
  }

  if (recentActivities.length > 0) {
    const last3 = recentActivities.slice(0, 3);
    context += `

RECENT ACTIVITIES:`;
    for (const a of last3) {
      context += `\n- ${a.type}: ${Math.round(a.duration_sec / 60)}min, ${Math.round(a.calories_burned)} cal, avg HR ${Math.round(a.avg_heart_rate)}`;
    }
  }

  context += `

USER PROFILE:
- Gender: ${gender === 'female' ? 'Woman' : 'Man'}${trendContext}`;

  if (gender === 'female' && cycleData) {
    context += `

HORMONAL CONTEXT:
- Cycle Day: ${cycleData.cycleDay}
- Phase: ${cycleData.phase} (Performance Window: ${getPerformanceWindow(cycleData.phase)})
- Basal Temp: ${cycleData.basalBodyTemp?.toFixed(1) || 'N/A'}°C`;
  }

  return context;
};

const getPerformanceWindow = (phase: string): string => {
  switch (phase) {
    case 'menstrual': return 'Restoration';
    case 'follicular': return 'Rising Energy';
    case 'ovulation': return 'Peak Output';
    case 'luteal': return 'Internal Recovery';
    default: return 'Active';
  }
};

// ============================================
// OPENAI API CALL
// ============================================

const callOpenAI = async (
  systemPrompt: string,
  context: string,
  userMessage: string,
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>
): Promise<string> => {
  const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
    { role: 'system', content: systemPrompt },
    { role: 'assistant', content: `Current biometric context:\n${context}` },
  ];

  if (conversationHistory) {
    messages.push(...conversationHistory.map(msg => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
    })));
  }

  messages.push({ role: 'user', content: userMessage });

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      messages,
      max_tokens: 400,
      temperature: 0.7,
      presence_penalty: 0.1,
      frequency_penalty: 0.1,
    }),
  });

  if (!response.ok) {
    let errorMsg = `OpenAI API Error (${response.status})`;
    try {
      const error = await response.json();
      errorMsg = error.error?.message || errorMsg;
    } catch {}
    console.error('[ELVA AI]', errorMsg);
    throw new Error(errorMsg);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || 'I could not generate a response.';
};

// ============================================
// CHAT RESPONSE
// ============================================

export const generateChatResponse = async (
  userMessage: string,
  gender: Gender,
  cycleData?: CycleData,
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>
): Promise<string> => {
  let context: string;
  try {
    context = await buildContextFromDatabase(gender, cycleData);
  } catch (e) {
    console.warn('[ELVA AI] Context build failed:', e);
    context = 'User biometric data temporarily unavailable.';
  }

  if (!isAIAvailable()) {
    console.log('[ELVA AI] No API key — using mock response');
    return generateMockResponse(userMessage);
  }

  try {
    console.log('[ELVA AI] Calling OpenAI...');
    const result = await callOpenAI(ELVA_SYSTEM_PROMPT, context, userMessage, conversationHistory);
    console.log('[ELVA AI] OpenAI responded successfully');
    return result;
  } catch (error) {
    console.error('[ELVA AI] OpenAI Error:', error);
    return generateMockResponse(userMessage);
  }
};

// ============================================
// SYMPTOM ANALYSIS (Women's Health)
// ============================================

export const analyzeSymptoms = async (
  symptoms: string[],
  gender: Gender,
  cycleData?: CycleData,
): Promise<string> => {
  if (symptoms.length === 0) return '';

  let context: string;
  try {
    context = await buildContextFromDatabase(gender, cycleData);
  } catch {
    context = 'User biometric data temporarily unavailable.';
  }

  const prompt = `The user has logged these current symptoms: ${symptoms.join(', ')}. Based on their biometric data and cycle phase, provide a brief, supportive analysis of what these symptoms may indicate and one actionable recommendation. Keep it under 3 sentences.`;

  if (!isAIAvailable()) {
    // Offline fallback
    const phase = cycleData?.phase || 'unknown';
    return `You've logged ${symptoms.join(', ')} during your ${phase} phase. These are common during this part of your cycle. Stay hydrated, prioritize rest, and listen to your body's natural rhythm.`;
  }

  try {
    console.log('[ELVA AI] Analyzing symptoms via OpenAI...');
    return await callOpenAI(ELVA_SYSTEM_PROMPT, context, prompt);
  } catch {
    const phase = cycleData?.phase || 'current';
    return `You've logged ${symptoms.join(', ')} during your ${phase} phase. These are common during this part of your cycle. Stay hydrated, prioritize rest, and listen to your body's natural rhythm.`;
  }
};

// ============================================
// MORNING GREETING
// ============================================

export const generateMorningGreeting = async (
  userName: string,
  gender: Gender,
  cycleData?: CycleData
): Promise<string> => {
  let context: string;
  try {
    context = await buildContextFromDatabase(gender, cycleData);
  } catch {
    context = 'User biometric data temporarily unavailable.';
  }
  
  if (!isAIAvailable()) {
    let latestVital: any = null;
    let lastSleep: any = null;
    try {
      latestVital = await getLatestVital();
      lastSleep = await getLastSleepSession();
    } catch {}
    const hr = latestVital?.heart_rate || 68;
    const hrv = latestVital?.hrv || 52;
    const deepSleep = lastSleep ? Math.round(lastSleep.deep_sleep_min) : 94;
    const sleepScore = lastSleep?.sleep_score || 82;
    
    if (sleepScore >= 80) {
      return `Good morning, ${userName}. Your deep sleep was ${deepSleep}min with a score of ${sleepScore}—like a river fully replenished. Your HRV of ${hrv}ms says you're ready to flow today.`;
    } else if (sleepScore >= 50) {
      return `Good morning, ${userName}. You logged ${deepSleep}min of deep sleep with a score of ${sleepScore}. Your body is rebuilding—consider taking the first hour gently, like mist settling before the sun fully rises.`;
    }
    return `Good morning, ${userName}. Your resting HR is ${hr} BPM and HRV is ${hrv}ms. Your body is in a quieter season—honor that rhythm with steady movement today.`;
  }

  try {
    const prompt = `Generate a calm, nature-inspired morning greeting for ${userName}. Reference their overnight metrics. Keep it under 3 sentences.`;
    return await callOpenAI(ELVA_SYSTEM_PROMPT, context, prompt);
  } catch {
    return `Good morning, ${userName}. Your body has valuable data to share today.`;
  }
};

// ============================================
// AI ANALYSIS (runs on new data batches)
// ============================================

let lastAnalysisTimestamp = 0;
const ANALYSIS_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes between analyses

export const analyzeNewData = async (
  gender: Gender,
  onNotification?: (title: string, body: string) => void
): Promise<void> => {
  const now = Date.now();
  if (now - lastAnalysisTimestamp < ANALYSIS_COOLDOWN_MS) return;
  lastAnalysisTimestamp = now;

  try {
    const [recentVitals, vitalStats, lastSleep] = await Promise.all([
      getRecentVitals(30),
      getVitalStats(1),
      getLastSleepSession(),
    ]);

    if (recentVitals.length < 5) return;

    const insights = detectPatterns(recentVitals, vitalStats, lastSleep);

    for (const insight of insights) {
      await insertAIInsight(insight);

      if (insight.priority === 'high') {
        await insertAINotification({
          title: insight.title,
          body: insight.description,
          type: insight.type,
          priority: insight.priority,
        });
        onNotification?.(insight.title, insight.description);
      }
    }

    if (isAIAvailable() && recentVitals.length >= 10) {
      await generateAIInsight(gender, onNotification);
    }
  } catch (error) {
    console.warn('[AI Analysis] Error:', error);
  }
};

// ============================================
// PATTERN DETECTION (local, no API needed)
// ============================================

interface DetectedInsight {
  type: string;
  title: string;
  description: string;
  priority: string;
  actionable: number;
  recommendation?: string;
}

const detectPatterns = (
  recentVitals: VitalRecord[],
  _stats: any,
  lastSleep: SleepRecord | null
): DetectedInsight[] => {
  const insights: DetectedInsight[] = [];
  if (recentVitals.length === 0) return insights;

  const latestHR = recentVitals[0].heart_rate;
  const latestHRV = recentVitals[0].hrv;
  const latestStress = recentVitals[0].stress_level;
  const latestSpO2 = recentVitals[0].blood_oxygen;

  if (latestHR > 90 && recentVitals.slice(0, 5).every(v => v.heart_rate > 85)) {
    insights.push({
      type: 'health',
      title: 'Elevated Heart Rate Detected',
      description: `Your heart rate has been consistently above 85 BPM (currently ${latestHR} BPM). This could indicate stress, dehydration, or insufficient recovery.`,
      priority: 'high',
      actionable: 1,
      recommendation: 'Try 5 minutes of deep breathing or drink water.',
    });
  }

  if (latestHRV < 25) {
    insights.push({
      type: 'recovery',
      title: 'Low HRV — Recovery Needed',
      description: `Your HRV is ${latestHRV}ms, below the healthy range. Your autonomic nervous system may be under strain.`,
      priority: 'high',
      actionable: 1,
      recommendation: 'Avoid intense exercise today. Focus on restorative activities.',
    });
  }

  if (latestStress > 70 && recentVitals.slice(0, 3).every(v => v.stress_level > 65)) {
    insights.push({
      type: 'stress',
      title: 'Sustained High Stress',
      description: `Stress has been above 65% for the past several readings (currently ${latestStress}%).`,
      priority: 'high',
      actionable: 1,
      recommendation: 'Take a break. Try the rain sounds feature or step outside.',
    });
  }

  if (latestSpO2 < 94) {
    insights.push({
      type: 'health',
      title: 'Low Blood Oxygen',
      description: `SpO2 at ${latestSpO2}% is below normal range.`,
      priority: 'high',
      actionable: 1,
      recommendation: 'Take several deep breaths. If consistently low, consult a healthcare provider.',
    });
  }

  if (latestHRV > 60 && latestStress < 25 && latestHR < 65) {
    insights.push({
      type: 'recovery',
      title: 'Excellent Recovery State',
      description: `HRV at ${latestHRV}ms, stress ${latestStress}%, HR ${latestHR} BPM. Your body is deeply recovered.`,
      priority: 'low',
      actionable: 1,
      recommendation: 'Great time for challenging workouts or deep focus work.',
    });
  }

  if (lastSleep && lastSleep.sleep_score < 50 && lastSleep.deep_sleep_min < 30) {
    insights.push({
      type: 'sleep',
      title: 'Poor Sleep Recovery',
      description: `Last night's sleep score was ${lastSleep.sleep_score} with only ${Math.round(lastSleep.deep_sleep_min)}min deep sleep.`,
      priority: 'medium',
      actionable: 1,
      recommendation: 'Avoid caffeine after 2 PM. Consider a 20-minute power nap.',
    });
  }

  return insights;
};

// ============================================
// AI-POWERED INSIGHT GENERATION
// ============================================

const generateAIInsight = async (
  gender: Gender,
  onNotification?: (title: string, body: string) => void
): Promise<void> => {
  const context = await buildContextFromDatabase(gender);
  
  const analysisPrompt = `Based on the user's current biometric data, generate ONE specific, actionable health insight. 
Format your response exactly as:
TITLE: [concise title]
INSIGHT: [2-sentence data-driven insight with specific numbers]
ACTION: [1-sentence recommendation]`;

  try {
    const response = await callOpenAI(
      ELVA_SYSTEM_PROMPT + '\nYou are generating a proactive health notification. Be specific with data.',
      context,
      analysisPrompt
    );

    const titleMatch = response.match(/TITLE:\s*(.+)/);
    const insightMatch = response.match(/INSIGHT:\s*(.+)/);
    const actionMatch = response.match(/ACTION:\s*(.+)/);

    if (titleMatch && insightMatch) {
      const title = titleMatch[1].trim();
      const description = insightMatch[1].trim();
      const recommendation = actionMatch?.[1].trim();

      await insertAIInsight({
        type: 'ai_generated',
        title,
        description,
        priority: 'medium',
        actionable: 1,
        recommendation,
      });

      await insertAINotification({
        title,
        body: description,
        type: 'ai_insight',
        priority: 'medium',
      });

      onNotification?.(title, description);
    }
  } catch (error) {
    console.warn('[AI Insight] Generation failed:', error);
  }
};

// ============================================
// READINESS SCORE CALCULATION
// ============================================

export const calculateReadinessScore = async (): Promise<number> => {
  const [vitalStats, lastSleep, activityStats] = await Promise.all([
    getVitalStats(1),
    getLastSleepSession(),
    getActivityStats(1),
  ]);

  const avgHRV = vitalStats?.avg_hrv || 40;
  const hrvNormalized = Math.min(avgHRV / 80, 1);
  const hrvScore = hrvNormalized * 40;

  const sleepScore = lastSleep?.sleep_score || 50;
  const sleepNormalized = sleepScore / 100;
  const sleepComponent = sleepNormalized * 40;

  const activeMin = activityStats?.total_duration_min || 0;
  const strainNormalized = Math.min(activeMin / 120, 1);
  const strainComponent = (1 - strainNormalized * 0.5) * 20;

  return Math.round(hrvScore + sleepComponent + strainComponent);
};

// ============================================
// MOCK RESPONSE (when no API key)
// ============================================

const generateMockResponse = async (
  userMessage: string,
): Promise<string> => {
  const lower = userMessage.toLowerCase();
  let latestVital: any = null;
  let lastSleep: any = null;

  try {
    latestVital = await getLatestVital();
    lastSleep = await getLastSleepSession();
  } catch {
    // Database not available (web) — use fallback values below
  }

  const hr = latestVital?.heart_rate || 68;
  const hrv = latestVital?.hrv || 52;
  const stress = latestVital?.stress_level || 22;

  if (lower.includes('tired') || lower.includes('exhausted') || lower.includes('fatigue')) {
    const deepSleep = lastSleep ? Math.round(lastSleep.deep_sleep_min) : 0;
    return `Your deep sleep was ${deepSleep}min and HRV is ${hrv}ms. Your body is prioritizing internal recovery—like roots deepening before new growth. Consider a gentle walk rather than pushing through.`;
  }

  if (lower.includes('workout') || lower.includes('exercise') || lower.includes('train')) {
    if (hrv > 45 && stress < 40) {
      return `Your HRV at ${hrv}ms and stress at ${stress}% suggest your system is ready for output. The soil is fertile for growth today.`;
    }
    return `Your HRV is ${hrv}ms with stress at ${stress}%. Consider restorative movement—think of it as winter preparation, where growth happens beneath the surface.`;
  }

  if (lower.includes('sleep') || lower.includes('rest') || lower.includes('insomnia')) {
    if (lastSleep) {
      return `You logged ${Math.round(lastSleep.total_duration_min / 60)}h ${Math.round(lastSleep.total_duration_min % 60)}m with ${Math.round(lastSleep.deep_sleep_min)}min deep sleep (score: ${lastSleep.sleep_score}). Reduce screen time 1 hour before bed to find your natural evening rhythm.`;
    }
    return `Track your sleep tonight using the sleep button—I'll have detailed insights in the morning, like reading the rings of a tree.`;
  }

  if (lower.includes('stress') || lower.includes('anxious') || lower.includes('calm')) {
    return `Your stress level is ${stress}% and HRV is ${hrv}ms. Try 5 minutes of grounded breathing—inhale 4, hold 4, exhale 6. The rain sounds feature is designed to lower cortisol.`;
  }

  if (lower.includes('heart') || lower.includes('hrv') || lower.includes('pulse')) {
    return `Heart rate is ${hr} BPM with HRV at ${hrv}ms. ${hrv > 50 ? 'Your autonomic balance looks healthy—like a calm forest after rain.' : 'HRV suggests recovery focus—prioritize rest to bring this baseline up.'}`;
  }

  if (lower.includes('meditation') || lower.includes('meditate')) {
    return `Great choice with stress at ${stress}%. Start a meditation session from the Activity tab—I'll monitor your HRV and stress response in real-time. Even 5 minutes can shift your nervous system.`;
  }

  return `HR is ${hr} BPM, HRV is ${hrv}ms, stress at ${stress}%. ${hrv > 50 ? 'Your system is primed for output—like spring emerging.' : 'Your body asks for gentler input—honor that rhythm.'} What would you like to explore?`;
};

export default {
  isAIAvailable,
  generateChatResponse,
  analyzeSymptoms,
  generateMorningGreeting,
  analyzeNewData,
  calculateReadinessScore,
  buildContextFromDatabase,
};
