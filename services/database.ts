/**
 * ELVA SQLite Database Service
 * All health data stored locally in SQLite.
 * Tables: vitals, sleep_sessions, activities, activity_logs, ai_insights, ai_notifications, settings
 */

import * as SQLite from 'expo-sqlite';

// ============================================
// DATABASE INITIALIZATION
// ============================================

let db: SQLite.SQLiteDatabase | null = null;

export const getDatabase = async (): Promise<SQLite.SQLiteDatabase> => {
  if (db) return db;
  db = await SQLite.openDatabaseAsync('elva_health.db');
  await initializeDatabase(db);
  return db;
};

const initializeDatabase = async (database: SQLite.SQLiteDatabase): Promise<void> => {
  await database.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS vitals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp TEXT NOT NULL DEFAULT (datetime('now')),
      heart_rate REAL NOT NULL,
      hrv REAL NOT NULL,
      blood_oxygen REAL NOT NULL,
      skin_temperature REAL NOT NULL,
      stress_level REAL NOT NULL,
      muscle_oxygen REAL,
      muscle_fatigue TEXT,
      source TEXT DEFAULT 'bracelet',
      activity_session_id INTEGER,
      FOREIGN KEY (activity_session_id) REFERENCES activity_sessions(id)
    );

    CREATE TABLE IF NOT EXISTS sleep_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      start_time TEXT NOT NULL,
      end_time TEXT,
      total_duration_min REAL DEFAULT 0,
      deep_sleep_min REAL DEFAULT 0,
      light_sleep_min REAL DEFAULT 0,
      rem_sleep_min REAL DEFAULT 0,
      awake_min REAL DEFAULT 0,
      sleep_score REAL DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      source TEXT DEFAULT 'bracelet'
    );

    CREATE TABLE IF NOT EXISTS activity_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      start_time TEXT NOT NULL DEFAULT (datetime('now')),
      end_time TEXT,
      duration_sec REAL DEFAULT 0,
      calories_burned REAL DEFAULT 0,
      avg_heart_rate REAL DEFAULT 0,
      max_heart_rate REAL DEFAULT 0,
      avg_muscle_oxygen REAL,
      steps INTEGER DEFAULT 0,
      distance_km REAL DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      notes TEXT
    );

    CREATE TABLE IF NOT EXISTS daily_summary (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL UNIQUE,
      total_steps INTEGER DEFAULT 0,
      total_calories REAL DEFAULT 0,
      total_active_min REAL DEFAULT 0,
      total_distance_km REAL DEFAULT 0,
      avg_heart_rate REAL DEFAULT 0,
      avg_hrv REAL DEFAULT 0,
      avg_stress REAL DEFAULT 0,
      avg_spo2 REAL DEFAULT 0,
      readiness_score REAL DEFAULT 0,
      recovery_score REAL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS ai_insights (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp TEXT NOT NULL DEFAULT (datetime('now')),
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      priority TEXT DEFAULT 'medium',
      actionable INTEGER DEFAULT 1,
      recommendation TEXT,
      read INTEGER DEFAULT 0,
      dismissed INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS ai_notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp TEXT NOT NULL DEFAULT (datetime('now')),
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      type TEXT DEFAULT 'insight',
      priority TEXT DEFAULT 'medium',
      read INTEGER DEFAULT 0,
      data TEXT
    );

    CREATE TABLE IF NOT EXISTS bracelet_state (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      is_connected INTEGER DEFAULT 0,
      battery_level REAL DEFAULT 100,
      firmware_version TEXT DEFAULT '1.0.0',
      last_sync TEXT,
      simulation_speed REAL DEFAULT 1.0,
      is_simulating INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS user_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_vitals_timestamp ON vitals(timestamp);
    CREATE INDEX IF NOT EXISTS idx_vitals_activity ON vitals(activity_session_id);
    CREATE INDEX IF NOT EXISTS idx_sleep_start ON sleep_sessions(start_time);
    CREATE INDEX IF NOT EXISTS idx_activity_start ON activity_sessions(start_time);
    CREATE INDEX IF NOT EXISTS idx_daily_date ON daily_summary(date);
    CREATE INDEX IF NOT EXISTS idx_insights_timestamp ON ai_insights(timestamp);
    CREATE INDEX IF NOT EXISTS idx_notifications_timestamp ON ai_notifications(timestamp);

    -- Initialize bracelet state if not exists
    INSERT OR IGNORE INTO bracelet_state (id, is_connected, battery_level, is_simulating)
    VALUES (1, 0, 100, 1);
  `);
};

// ============================================
// VITALS
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
  activity_session_id?: number;
}

export const insertVital = async (vital: Omit<VitalRecord, 'id'>): Promise<number> => {
  const db = await getDatabase();
  const result = await db.runAsync(
    `INSERT INTO vitals (timestamp, heart_rate, hrv, blood_oxygen, skin_temperature, stress_level, muscle_oxygen, muscle_fatigue, source, activity_session_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    vital.timestamp,
    vital.heart_rate,
    vital.hrv,
    vital.blood_oxygen,
    vital.skin_temperature,
    vital.stress_level,
    vital.muscle_oxygen ?? null,
    vital.muscle_fatigue ?? null,
    vital.source ?? 'bracelet',
    vital.activity_session_id ?? null
  );
  return result.lastInsertRowId;
};

export const getRecentVitals = async (limitMinutes: number = 60): Promise<VitalRecord[]> => {
  const db = await getDatabase();
  return db.getAllAsync<VitalRecord>(
    `SELECT * FROM vitals WHERE timestamp >= datetime('now', ?) ORDER BY timestamp DESC`,
    `-${limitMinutes} minutes`
  );
};

export const getLatestVital = async (): Promise<VitalRecord | null> => {
  const db = await getDatabase();
  return db.getFirstAsync<VitalRecord>(
    `SELECT * FROM vitals ORDER BY timestamp DESC LIMIT 1`
  );
};

export const getVitalsForPeriod = async (startDate: string, endDate: string): Promise<VitalRecord[]> => {
  const db = await getDatabase();
  return db.getAllAsync<VitalRecord>(
    `SELECT * FROM vitals WHERE timestamp BETWEEN ? AND ? ORDER BY timestamp ASC`,
    startDate, endDate
  );
};

export const getHourlyAverages = async (hours: number = 24): Promise<Array<{
  hour: string;
  avg_hr: number;
  avg_hrv: number;
  avg_stress: number;
  avg_spo2: number;
  count: number;
}>> => {
  const db = await getDatabase();
  return db.getAllAsync(
    `SELECT 
       strftime('%Y-%m-%d %H:00', timestamp) as hour,
       AVG(heart_rate) as avg_hr,
       AVG(hrv) as avg_hrv,
       AVG(stress_level) as avg_stress,
       AVG(blood_oxygen) as avg_spo2,
       COUNT(*) as count
     FROM vitals 
     WHERE timestamp >= datetime('now', ?)
     GROUP BY strftime('%Y-%m-%d %H', timestamp)
     ORDER BY hour ASC`,
    `-${hours} hours`
  );
};

export const getVitalStats = async (days: number = 7): Promise<{
  avg_hr: number;
  avg_hrv: number;
  avg_stress: number;
  avg_spo2: number;
  min_hr: number;
  max_hr: number;
  total_readings: number;
} | null> => {
  const db = await getDatabase();
  return db.getFirstAsync(
    `SELECT 
       AVG(heart_rate) as avg_hr,
       AVG(hrv) as avg_hrv,
       AVG(stress_level) as avg_stress,
       AVG(blood_oxygen) as avg_spo2,
       MIN(heart_rate) as min_hr,
       MAX(heart_rate) as max_hr,
       COUNT(*) as total_readings
     FROM vitals 
     WHERE timestamp >= datetime('now', ?)`,
    `-${days} days`
  );
};

// ============================================
// SLEEP SESSIONS
// ============================================

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

export const startSleepSession = async (): Promise<number> => {
  const db = await getDatabase();
  const result = await db.runAsync(
    `INSERT INTO sleep_sessions (start_time, is_active) VALUES (datetime('now'), 1)`
  );
  return result.lastInsertRowId;
};

export const endSleepSession = async (sessionId: number, sleepData: {
  deep_sleep_min: number;
  light_sleep_min: number;
  rem_sleep_min: number;
  awake_min: number;
  sleep_score: number;
}): Promise<void> => {
  const db = await getDatabase();
  const totalDuration = sleepData.deep_sleep_min + sleepData.light_sleep_min + sleepData.rem_sleep_min + sleepData.awake_min;
  await db.runAsync(
    `UPDATE sleep_sessions SET 
       end_time = datetime('now'), 
       total_duration_min = ?, 
       deep_sleep_min = ?, 
       light_sleep_min = ?, 
       rem_sleep_min = ?, 
       awake_min = ?, 
       sleep_score = ?,
       is_active = 0
     WHERE id = ?`,
    totalDuration,
    sleepData.deep_sleep_min,
    sleepData.light_sleep_min,
    sleepData.rem_sleep_min,
    sleepData.awake_min,
    sleepData.sleep_score,
    sessionId
  );
};

export const getActiveSleepSession = async (): Promise<SleepRecord | null> => {
  const db = await getDatabase();
  return db.getFirstAsync<SleepRecord>(
    `SELECT * FROM sleep_sessions WHERE is_active = 1 ORDER BY start_time DESC LIMIT 1`
  );
};

export const getRecentSleepSessions = async (days: number = 30): Promise<SleepRecord[]> => {
  const db = await getDatabase();
  return db.getAllAsync<SleepRecord>(
    `SELECT * FROM sleep_sessions WHERE is_active = 0 AND start_time >= datetime('now', ?) ORDER BY start_time DESC`,
    `-${days} days`
  );
};

export const getLastSleepSession = async (): Promise<SleepRecord | null> => {
  const db = await getDatabase();
  return db.getFirstAsync<SleepRecord>(
    `SELECT * FROM sleep_sessions WHERE is_active = 0 ORDER BY start_time DESC LIMIT 1`
  );
};

// ============================================
// ACTIVITY SESSIONS
// ============================================

export type ActivityType = 'running' | 'walking' | 'cycling' | 'strength' | 'yoga' | 'meditation' | 'swimming' | 'hiit' | 'stretching' | 'other';

export interface ActivityRecord {
  id?: number;
  type: ActivityType;
  start_time: string;
  end_time?: string;
  duration_sec: number;
  calories_burned: number;
  avg_heart_rate: number;
  max_heart_rate: number;
  avg_muscle_oxygen?: number;
  steps: number;
  distance_km: number;
  is_active: number;
  notes?: string;
}

export const startActivity = async (type: ActivityType): Promise<number> => {
  const db = await getDatabase();
  const result = await db.runAsync(
    `INSERT INTO activity_sessions (type, start_time, is_active) VALUES (?, datetime('now'), 1)`,
    type
  );
  return result.lastInsertRowId;
};

export const updateActiveActivity = async (sessionId: number, data: Partial<ActivityRecord>): Promise<void> => {
  const db = await getDatabase();
  const fields: string[] = [];
  const values: any[] = [];

  if (data.duration_sec !== undefined) { fields.push('duration_sec = ?'); values.push(data.duration_sec); }
  if (data.calories_burned !== undefined) { fields.push('calories_burned = ?'); values.push(data.calories_burned); }
  if (data.avg_heart_rate !== undefined) { fields.push('avg_heart_rate = ?'); values.push(data.avg_heart_rate); }
  if (data.max_heart_rate !== undefined) { fields.push('max_heart_rate = ?'); values.push(data.max_heart_rate); }
  if (data.avg_muscle_oxygen !== undefined) { fields.push('avg_muscle_oxygen = ?'); values.push(data.avg_muscle_oxygen); }
  if (data.steps !== undefined) { fields.push('steps = ?'); values.push(data.steps); }
  if (data.distance_km !== undefined) { fields.push('distance_km = ?'); values.push(data.distance_km); }

  if (fields.length > 0) {
    values.push(sessionId);
    await db.runAsync(
      `UPDATE activity_sessions SET ${fields.join(', ')} WHERE id = ?`,
      ...values
    );
  }
};

export const endActivity = async (sessionId: number): Promise<void> => {
  const db = await getDatabase();
  await db.runAsync(
    `UPDATE activity_sessions SET end_time = datetime('now'), is_active = 0 WHERE id = ?`,
    sessionId
  );
};

export const getActiveActivity = async (): Promise<ActivityRecord | null> => {
  const db = await getDatabase();
  return db.getFirstAsync<ActivityRecord>(
    `SELECT * FROM activity_sessions WHERE is_active = 1 ORDER BY start_time DESC LIMIT 1`
  );
};

export const getRecentActivities = async (days: number = 30): Promise<ActivityRecord[]> => {
  const db = await getDatabase();
  return db.getAllAsync<ActivityRecord>(
    `SELECT * FROM activity_sessions WHERE is_active = 0 AND start_time >= datetime('now', ?) ORDER BY start_time DESC`,
    `-${days} days`
  );
};

export const getActivityStats = async (days: number = 7): Promise<{
  total_sessions: number;
  total_duration_min: number;
  total_calories: number;
  total_steps: number;
  total_distance: number;
  avg_hr: number;
} | null> => {
  const db = await getDatabase();
  return db.getFirstAsync(
    `SELECT 
       COUNT(*) as total_sessions,
       COALESCE(SUM(duration_sec) / 60.0, 0) as total_duration_min,
       COALESCE(SUM(calories_burned), 0) as total_calories,
       COALESCE(SUM(steps), 0) as total_steps,
       COALESCE(SUM(distance_km), 0) as total_distance,
       COALESCE(AVG(avg_heart_rate), 0) as avg_hr
     FROM activity_sessions 
     WHERE is_active = 0 AND start_time >= datetime('now', ?)`,
    `-${days} days`
  );
};

// ============================================
// DAILY SUMMARY
// ============================================

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

export const upsertDailySummary = async (summary: Omit<DailySummaryRecord, 'id'>): Promise<void> => {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT INTO daily_summary (date, total_steps, total_calories, total_active_min, total_distance_km, avg_heart_rate, avg_hrv, avg_stress, avg_spo2, readiness_score, recovery_score)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(date) DO UPDATE SET
       total_steps = excluded.total_steps,
       total_calories = excluded.total_calories,
       total_active_min = excluded.total_active_min,
       total_distance_km = excluded.total_distance_km,
       avg_heart_rate = excluded.avg_heart_rate,
       avg_hrv = excluded.avg_hrv,
       avg_stress = excluded.avg_stress,
       avg_spo2 = excluded.avg_spo2,
       readiness_score = excluded.readiness_score,
       recovery_score = excluded.recovery_score`,
    summary.date,
    summary.total_steps,
    summary.total_calories,
    summary.total_active_min,
    summary.total_distance_km,
    summary.avg_heart_rate,
    summary.avg_hrv,
    summary.avg_stress,
    summary.avg_spo2,
    summary.readiness_score,
    summary.recovery_score
  );
};

export const getDailySummaries = async (days: number = 30): Promise<DailySummaryRecord[]> => {
  const db = await getDatabase();
  return db.getAllAsync<DailySummaryRecord>(
    `SELECT * FROM daily_summary WHERE date >= date('now', ?) ORDER BY date ASC`,
    `-${days} days`
  );
};

export const getTodaySummary = async (): Promise<DailySummaryRecord | null> => {
  const db = await getDatabase();
  return db.getFirstAsync<DailySummaryRecord>(
    `SELECT * FROM daily_summary WHERE date = date('now')`
  );
};

// ============================================
// AI INSIGHTS & NOTIFICATIONS
// ============================================

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

export const insertAIInsight = async (insight: Omit<AIInsightRecord, 'id' | 'timestamp' | 'read' | 'dismissed'>): Promise<number> => {
  const db = await getDatabase();
  const result = await db.runAsync(
    `INSERT INTO ai_insights (type, title, description, priority, actionable, recommendation)
     VALUES (?, ?, ?, ?, ?, ?)`,
    insight.type,
    insight.title,
    insight.description,
    insight.priority,
    insight.actionable,
    insight.recommendation ?? null
  );
  return result.lastInsertRowId;
};

export const getUnreadInsights = async (): Promise<AIInsightRecord[]> => {
  const db = await getDatabase();
  return db.getAllAsync<AIInsightRecord>(
    `SELECT * FROM ai_insights WHERE read = 0 AND dismissed = 0 ORDER BY timestamp DESC LIMIT 20`
  );
};

export const getRecentInsights = async (days: number = 7): Promise<AIInsightRecord[]> => {
  const db = await getDatabase();
  return db.getAllAsync<AIInsightRecord>(
    `SELECT * FROM ai_insights WHERE timestamp >= datetime('now', ?) ORDER BY timestamp DESC`,
    `-${days} days`
  );
};

export const markInsightRead = async (id: number): Promise<void> => {
  const db = await getDatabase();
  await db.runAsync(`UPDATE ai_insights SET read = 1 WHERE id = ?`, id);
};

export const dismissInsight = async (id: number): Promise<void> => {
  const db = await getDatabase();
  await db.runAsync(`UPDATE ai_insights SET dismissed = 1 WHERE id = ?`, id);
};

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

export const insertAINotification = async (notification: Omit<AINotificationRecord, 'id' | 'timestamp' | 'read'>): Promise<number> => {
  const db = await getDatabase();
  const result = await db.runAsync(
    `INSERT INTO ai_notifications (title, body, type, priority, data)
     VALUES (?, ?, ?, ?, ?)`,
    notification.title,
    notification.body,
    notification.type ?? 'insight',
    notification.priority ?? 'medium',
    notification.data ?? null
  );
  return result.lastInsertRowId;
};

export const getUnreadNotifications = async (): Promise<AINotificationRecord[]> => {
  const db = await getDatabase();
  return db.getAllAsync<AINotificationRecord>(
    `SELECT * FROM ai_notifications WHERE read = 0 ORDER BY timestamp DESC LIMIT 50`
  );
};

export const markNotificationRead = async (id: number): Promise<void> => {
  const db = await getDatabase();
  await db.runAsync(`UPDATE ai_notifications SET read = 1 WHERE id = ?`, id);
};

export const markAllNotificationsRead = async (): Promise<void> => {
  const db = await getDatabase();
  await db.runAsync(`UPDATE ai_notifications SET read = 1 WHERE read = 0`);
};

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
  const db = await getDatabase();
  return db.getFirstAsync<BraceletState>(`SELECT * FROM bracelet_state WHERE id = 1`);
};

export const updateBraceletState = async (state: Partial<BraceletState>): Promise<void> => {
  const db = await getDatabase();
  const fields: string[] = [];
  const values: any[] = [];

  if (state.is_connected !== undefined) { fields.push('is_connected = ?'); values.push(state.is_connected); }
  if (state.battery_level !== undefined) { fields.push('battery_level = ?'); values.push(state.battery_level); }
  if (state.firmware_version !== undefined) { fields.push('firmware_version = ?'); values.push(state.firmware_version); }
  if (state.last_sync !== undefined) { fields.push('last_sync = ?'); values.push(state.last_sync); }
  if (state.simulation_speed !== undefined) { fields.push('simulation_speed = ?'); values.push(state.simulation_speed); }
  if (state.is_simulating !== undefined) { fields.push('is_simulating = ?'); values.push(state.is_simulating); }

  if (fields.length > 0) {
    values.push(1);
    await db.runAsync(
      `UPDATE bracelet_state SET ${fields.join(', ')} WHERE id = ?`,
      ...values
    );
  }
};

// ============================================
// USER SETTINGS (key-value store)
// ============================================

export const setSetting = async (key: string, value: string): Promise<void> => {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT OR REPLACE INTO user_settings (key, value) VALUES (?, ?)`,
    key, value
  );
};

export const getSetting = async (key: string): Promise<string | null> => {
  const db = await getDatabase();
  const result = await db.getFirstAsync<{ value: string }>(
    `SELECT value FROM user_settings WHERE key = ?`,
    key
  );
  return result?.value ?? null;
};

export const getAllSettings = async (): Promise<Record<string, string>> => {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{ key: string; value: string }>(
    `SELECT * FROM user_settings`
  );
  const settings: Record<string, string> = {};
  for (const row of rows) {
    settings[row.key] = row.value;
  }
  return settings;
};

// ============================================
// DATA UTILITIES
// ============================================

export const getVitalCount = async (): Promise<number> => {
  const db = await getDatabase();
  const result = await db.getFirstAsync<{ count: number }>(`SELECT COUNT(*) as count FROM vitals`);
  return result?.count ?? 0;
};

export const clearAllData = async (): Promise<void> => {
  const db = await getDatabase();
  await db.execAsync(`
    DELETE FROM vitals;
    DELETE FROM sleep_sessions;
    DELETE FROM activity_sessions;
    DELETE FROM daily_summary;
    DELETE FROM ai_insights;
    DELETE FROM ai_notifications;
  `);
};

export const getDatabaseSize = async (): Promise<string> => {
  const count = await getVitalCount();
  // Rough estimate: each vital ~100 bytes
  const bytes = count * 100;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};
