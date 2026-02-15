/**
 * ELVA Bracelet Simulator — Enhanced
 * Simulates a BLE health bracelet with extended physiological channels.
 * Channels: HR · HRV · SpO₂ · Skin Temp · Stress · SmO₂ · Muscle Fatigue
 *           Respiratory Rate · VO₂ Estimate · Lactate Estimate
 *           Cadence · Training Load · Recovery Time · Hydration Level
 * Data is written to SQLite on each tick.
 */

import {
  insertVital,
  getActiveActivity,
  getActiveSleepSession,
  updateBraceletState,
  getBraceletState,
  type ActivityType,
} from './database';

// ============================================
// TYPES
// ============================================

export type PhysiologicalState =
  | 'resting'
  | 'sleeping'
  | 'light_activity'     // walking, stretching
  | 'moderate_activity'   // cycling, yoga
  | 'intense_activity'    // running, HIIT
  | 'recovery'            // post-workout cooldown
  | 'stressed'
  | 'warmup'              // first few minutes of exercise
  | 'cooldown';           // transitioning from exercise to rest

export interface BraceletReading {
  heartRate: number;
  hrv: number;
  bloodOxygen: number;
  skinTemperature: number;
  stressLevel: number;
  muscleOxygen: number;
  muscleFatigue: 'Low' | 'Medium' | 'High';
  timestamp: string;
  state: PhysiologicalState;
  batteryLevel: number;
  // ── Extended channels ──
  respiratoryRate: number;       // breaths per minute
  vo2Estimate: number;           // ml/kg/min — rough VO₂ approximation
  lactateEstimate: number;       // mmol/L — simulated blood lactate proxy
  cadence: number;               // steps/strokes per minute (activity-dependent)
  trainingLoad: number;          // 0–100 cumulative session intensity score
  recoveryTimeMin: number;       // estimated minutes until full recovery
  hydrationLevel: number;        // 0–100 — decreases during exercise
}

export interface SimulatorConfig {
  intervalMs: number;        // How often to generate readings (default: 3000ms = 3s)
  realisticNoise: boolean;   // Add physiological noise
  onReading?: (reading: BraceletReading) => void;
  onBatteryLow?: (level: number) => void;
}

// ============================================
// PHYSIOLOGICAL BASELINES
// ============================================

interface PhysiologicalBaseline {
  hrRange: [number, number];
  hrvRange: [number, number];
  spo2Range: [number, number];
  tempRange: [number, number];
  stressRange: [number, number];
  smo2Range: [number, number];
  fatigue: 'Low' | 'Medium' | 'High';
  rrRange: [number, number];       // respiratory rate
  vo2Range: [number, number];      // VO₂ ml/kg/min
  lactateRange: [number, number];  // mmol/L
  cadenceRange: [number, number];  // RPM / steps per min
}

const STATE_BASELINES: Record<PhysiologicalState, PhysiologicalBaseline> = {
  resting: {
    hrRange: [58, 72],
    hrvRange: [45, 70],
    spo2Range: [96, 99],
    tempRange: [36.2, 36.8],
    stressRange: [10, 30],
    smo2Range: [70, 80],
    fatigue: 'Low',
    rrRange: [12, 16],
    vo2Range: [3, 5],
    lactateRange: [0.5, 1.2],
    cadenceRange: [0, 0],
  },
  sleeping: {
    hrRange: [48, 60],
    hrvRange: [55, 85],
    spo2Range: [95, 98],
    tempRange: [35.8, 36.4],
    stressRange: [5, 15],
    smo2Range: [72, 82],
    fatigue: 'Low',
    rrRange: [10, 14],
    vo2Range: [2.5, 3.5],
    lactateRange: [0.4, 0.8],
    cadenceRange: [0, 0],
  },
  warmup: {
    hrRange: [90, 115],
    hrvRange: [30, 45],
    spo2Range: [95, 98],
    tempRange: [36.5, 37.0],
    stressRange: [20, 35],
    smo2Range: [58, 70],
    fatigue: 'Low',
    rrRange: [18, 24],
    vo2Range: [15, 25],
    lactateRange: [1.0, 2.0],
    cadenceRange: [60, 100],
  },
  light_activity: {
    hrRange: [80, 105],
    hrvRange: [30, 50],
    spo2Range: [95, 98],
    tempRange: [36.5, 37.2],
    stressRange: [20, 40],
    smo2Range: [60, 72],
    fatigue: 'Low',
    rrRange: [16, 22],
    vo2Range: [10, 20],
    lactateRange: [0.8, 1.8],
    cadenceRange: [80, 120],
  },
  moderate_activity: {
    hrRange: [110, 140],
    hrvRange: [20, 40],
    spo2Range: [94, 97],
    tempRange: [37.0, 37.8],
    stressRange: [35, 55],
    smo2Range: [50, 65],
    fatigue: 'Medium',
    rrRange: [22, 32],
    vo2Range: [25, 40],
    lactateRange: [2.0, 4.0],
    cadenceRange: [70, 100],
  },
  intense_activity: {
    hrRange: [150, 185],
    hrvRange: [10, 25],
    spo2Range: [92, 96],
    tempRange: [37.5, 38.5],
    stressRange: [55, 80],
    smo2Range: [35, 55],
    fatigue: 'High',
    rrRange: [30, 45],
    vo2Range: [40, 60],
    lactateRange: [4.0, 8.0],
    cadenceRange: [140, 180],
  },
  recovery: {
    hrRange: [75, 95],
    hrvRange: [35, 55],
    spo2Range: [95, 98],
    tempRange: [36.8, 37.4],
    stressRange: [25, 45],
    smo2Range: [60, 75],
    fatigue: 'Medium',
    rrRange: [14, 20],
    vo2Range: [8, 15],
    lactateRange: [1.5, 3.0],
    cadenceRange: [0, 20],
  },
  cooldown: {
    hrRange: [85, 110],
    hrvRange: [28, 45],
    spo2Range: [95, 98],
    tempRange: [37.0, 37.6],
    stressRange: [25, 40],
    smo2Range: [55, 68],
    fatigue: 'Medium',
    rrRange: [18, 26],
    vo2Range: [12, 22],
    lactateRange: [2.0, 4.0],
    cadenceRange: [30, 60],
  },
  stressed: {
    hrRange: [78, 95],
    hrvRange: [20, 35],
    spo2Range: [95, 98],
    tempRange: [36.5, 37.2],
    stressRange: [60, 85],
    smo2Range: [62, 74],
    fatigue: 'Medium',
    rrRange: [18, 26],
    vo2Range: [5, 10],
    lactateRange: [0.8, 1.5],
    cadenceRange: [0, 0],
  },
};

// Map activity types to physiological states
const ACTIVITY_TO_STATE: Record<ActivityType, PhysiologicalState> = {
  running: 'intense_activity',
  walking: 'light_activity',
  cycling: 'moderate_activity',
  strength: 'intense_activity',
  yoga: 'light_activity',
  meditation: 'resting',
  swimming: 'moderate_activity',
  hiit: 'intense_activity',
  stretching: 'light_activity',
  other: 'moderate_activity',
};

// ============================================
// SIMULATOR ENGINE
// ============================================

class BraceletSimulator {
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private config: SimulatorConfig;
  private currentState: PhysiologicalState = 'resting';
  private batteryLevel: number = 100;
  private tickCount: number = 0;

  // Smoothed previous values
  private prevHR: number = 65;
  private prevHRV: number = 55;
  private prevSpO2: number = 97;
  private prevTemp: number = 36.5;
  private prevStress: number = 20;
  private prevSmO2: number = 72;
  private prevRR: number = 14;         // respiratory rate
  private prevVO2: number = 4;          // VO₂ estimate
  private prevLactate: number = 0.8;    // lactate
  private prevCadence: number = 0;      // steps/strokes per min

  // Session-level accumulators
  private sessionStartTime: number | null = null;
  private trainingLoad: number = 0;        // cumulative, 0-100
  private hydrationLevel: number = 95;     // starts high, drains during exercise
  private activityTickCount: number = 0;   // ticks in current activity session

  // Circadian rhythm offset based on time of day
  private getCircadianModifier(): { hrMod: number; hrvMod: number; stressMod: number } {
    const hour = new Date().getHours();
    // HR peaks in afternoon, lowest at 3-4 AM
    const hrMod = Math.sin((hour - 4) * Math.PI / 12) * 5;
    // HRV higher during sleep hours
    const hrvMod = hour >= 22 || hour <= 6 ? 8 : -3;
    // Stress typically lower in morning, peaks mid-afternoon
    const stressMod = Math.sin((hour - 8) * Math.PI / 10) * 8;
    return { hrMod, hrvMod, stressMod };
  }

  constructor(config: Partial<SimulatorConfig> = {}) {
    this.config = {
      intervalMs: 3000,
      realisticNoise: true,
      ...config,
    };
  }

  private lerp(current: number, target: number, factor: number): number {
    return current + (target - current) * factor;
  }

  private noise(amplitude: number): number {
    if (!this.config.realisticNoise) return 0;
    // Box-Muller transform for Gaussian noise
    const u1 = Math.random();
    const u2 = Math.random();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2) * amplitude;
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }

  private determineState = async (): Promise<PhysiologicalState> => {
    try {
      const activeActivity = await getActiveActivity();
      if (activeActivity) {
        const elapsedSec = (Date.now() - new Date(activeActivity.start_time).getTime()) / 1000;
        const baseState = ACTIVITY_TO_STATE[activeActivity.type as ActivityType] || 'moderate_activity';

        // Track session start for training-load accumulation
        if (!this.sessionStartTime) {
          this.sessionStartTime = Date.now();
          this.activityTickCount = 0;
          this.trainingLoad = 0;
        }
        this.activityTickCount++;

        // Phase transitions: warmup → peak → (state stays until stopped)
        if (elapsedSec < 180 && baseState !== 'resting') {
          return 'warmup';  // first 3 minutes
        }
        return baseState;
      }

      // Just ended an activity → cooldown for ~5 min
      if (this.sessionStartTime) {
        const sinceEnd = Date.now() - (this.sessionStartTime + this.activityTickCount * this.config.intervalMs);
        this.sessionStartTime = null;
        this.activityTickCount = 0;
        if (sinceEnd < 300_000) return 'cooldown';
        return 'recovery';
      }

      const activeSleep = await getActiveSleepSession();
      if (activeSleep) return 'sleeping';
    } catch {
      // DB not ready
    }

    const hour = new Date().getHours();
    if (hour >= 23 || hour <= 5) return 'resting';
    return 'resting';
  };

  private generateReading = async (): Promise<BraceletReading> => {
    this.currentState = await this.determineState();
    const baseline = STATE_BASELINES[this.currentState];
    const circadian = this.getCircadianModifier();
    const smoothFactor = 0.3;

    // ── Core channels ──
    const targetHR = (baseline.hrRange[0] + baseline.hrRange[1]) / 2 + circadian.hrMod;
    const targetHRV = (baseline.hrvRange[0] + baseline.hrvRange[1]) / 2 + circadian.hrvMod;
    const targetSpO2 = (baseline.spo2Range[0] + baseline.spo2Range[1]) / 2;
    const targetTemp = (baseline.tempRange[0] + baseline.tempRange[1]) / 2;
    const targetStress = (baseline.stressRange[0] + baseline.stressRange[1]) / 2 + circadian.stressMod;
    const targetSmO2 = (baseline.smo2Range[0] + baseline.smo2Range[1]) / 2;

    // ── Extended channels ──
    const targetRR = (baseline.rrRange[0] + baseline.rrRange[1]) / 2;
    const targetVO2 = (baseline.vo2Range[0] + baseline.vo2Range[1]) / 2;
    const targetLactate = (baseline.lactateRange[0] + baseline.lactateRange[1]) / 2;
    const targetCadence = (baseline.cadenceRange[0] + baseline.cadenceRange[1]) / 2;

    // Smooth + noise
    this.prevHR = this.clamp(this.lerp(this.prevHR, targetHR, smoothFactor) + this.noise(2), baseline.hrRange[0] - 5, baseline.hrRange[1] + 5);
    this.prevHRV = this.clamp(this.lerp(this.prevHRV, targetHRV, smoothFactor) + this.noise(3), baseline.hrvRange[0] - 5, baseline.hrvRange[1] + 5);
    this.prevSpO2 = this.clamp(this.lerp(this.prevSpO2, targetSpO2, smoothFactor) + this.noise(0.3), baseline.spo2Range[0], baseline.spo2Range[1]);
    this.prevTemp = this.clamp(this.lerp(this.prevTemp, targetTemp, smoothFactor * 0.5) + this.noise(0.05), baseline.tempRange[0], baseline.tempRange[1]);
    this.prevStress = this.clamp(this.lerp(this.prevStress, targetStress, smoothFactor) + this.noise(3), baseline.stressRange[0], baseline.stressRange[1]);
    this.prevSmO2 = this.clamp(this.lerp(this.prevSmO2, targetSmO2, smoothFactor) + this.noise(2), baseline.smo2Range[0], baseline.smo2Range[1]);
    this.prevRR = this.clamp(this.lerp(this.prevRR, targetRR, smoothFactor) + this.noise(1), baseline.rrRange[0], baseline.rrRange[1]);
    this.prevVO2 = this.clamp(this.lerp(this.prevVO2, targetVO2, smoothFactor * 0.4) + this.noise(1.5), baseline.vo2Range[0], baseline.vo2Range[1]);
    this.prevLactate = this.clamp(this.lerp(this.prevLactate, targetLactate, smoothFactor * 0.3) + this.noise(0.2), 0.3, 12);
    this.prevCadence = this.clamp(this.lerp(this.prevCadence, targetCadence, smoothFactor) + this.noise(3), 0, 200);

    // ── Training load: accumulates with intensity ──
    const isActive = ['warmup', 'light_activity', 'moderate_activity', 'intense_activity'].includes(this.currentState);
    if (isActive) {
      const intensityFactor = this.currentState === 'intense_activity' ? 0.6 : this.currentState === 'moderate_activity' ? 0.35 : this.currentState === 'warmup' ? 0.2 : 0.15;
      this.trainingLoad = Math.min(100, this.trainingLoad + intensityFactor);
    }

    // ── Hydration: drains during exercise, slowly recovers at rest ──
    if (isActive) {
      const drainRate = this.currentState === 'intense_activity' ? 0.15 : 0.06;
      this.hydrationLevel = Math.max(0, this.hydrationLevel - drainRate);
    } else {
      this.hydrationLevel = Math.min(100, this.hydrationLevel + 0.02);
    }

    // ── Recovery time estimate (minutes) — based on training load + HR ──
    const recoveryTimeMin = Math.round(this.trainingLoad * 2.5 + Math.max(0, this.prevHR - 80) * 0.5);

    // Battery
    this.batteryLevel = Math.max(0, this.batteryLevel - 0.01);
    this.tickCount++;

    let fatigue: 'Low' | 'Medium' | 'High' = baseline.fatigue;
    if (this.prevSmO2 < 45) fatigue = 'High';
    else if (this.prevSmO2 < 60) fatigue = 'Medium';

    const reading: BraceletReading = {
      heartRate: Math.round(this.prevHR),
      hrv: Math.round(this.prevHRV),
      bloodOxygen: Math.round(this.prevSpO2 * 10) / 10,
      skinTemperature: Math.round(this.prevTemp * 100) / 100,
      stressLevel: Math.round(this.prevStress),
      muscleOxygen: Math.round(this.prevSmO2 * 10) / 10,
      muscleFatigue: fatigue,
      timestamp: new Date().toISOString(),
      state: this.currentState,
      batteryLevel: Math.round(this.batteryLevel * 10) / 10,
      // Extended
      respiratoryRate: Math.round(this.prevRR),
      vo2Estimate: Math.round(this.prevVO2 * 10) / 10,
      lactateEstimate: Math.round(this.prevLactate * 10) / 10,
      cadence: Math.round(this.prevCadence),
      trainingLoad: Math.round(this.trainingLoad),
      recoveryTimeMin,
      hydrationLevel: Math.round(this.hydrationLevel),
    };

    return reading;
  };

  private tick = async (): Promise<void> => {
    try {
      const reading = await this.generateReading();

      // Write to SQLite
      const activeActivity = await getActiveActivity().catch(() => null);
      await insertVital({
        timestamp: reading.timestamp,
        heart_rate: reading.heartRate,
        hrv: reading.hrv,
        blood_oxygen: reading.bloodOxygen,
        skin_temperature: reading.skinTemperature,
        stress_level: reading.stressLevel,
        muscle_oxygen: reading.muscleOxygen,
        muscle_fatigue: reading.muscleFatigue,
        source: 'bracelet_sim',
        activity_session_id: activeActivity?.id,
      });

      // Update bracelet state
      await updateBraceletState({
        battery_level: reading.batteryLevel,
        last_sync: reading.timestamp,
        is_connected: 1,
      });

      // Notify listeners
      this.config.onReading?.(reading);

      // Battery warning
      if (reading.batteryLevel <= 15 && reading.batteryLevel > 14.9) {
        this.config.onBatteryLow?.(reading.batteryLevel);
      }
    } catch (error) {
      console.warn('[BraceletSim] Tick error:', error);
    }
  };

  // ============================================
  // PUBLIC API
  // ============================================

  start = async (): Promise<void> => {
    if (this.intervalId) return; // Already running

    await updateBraceletState({ is_connected: 1, is_simulating: 1 });

    // Initial reading
    await this.tick();

    this.intervalId = setInterval(this.tick, this.config.intervalMs);
  };

  stop = async (): Promise<void> => {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    await updateBraceletState({ is_connected: 0, is_simulating: 0 });
  };

  isRunning = (): boolean => {
    return this.intervalId !== null;
  };

  getLastReading = (): BraceletReading => {
    const recoveryTimeMin = Math.round(this.trainingLoad * 2.5 + Math.max(0, this.prevHR - 80) * 0.5);
    return {
      heartRate: Math.round(this.prevHR),
      hrv: Math.round(this.prevHRV),
      bloodOxygen: Math.round(this.prevSpO2 * 10) / 10,
      skinTemperature: Math.round(this.prevTemp * 100) / 100,
      stressLevel: Math.round(this.prevStress),
      muscleOxygen: Math.round(this.prevSmO2 * 10) / 10,
      muscleFatigue: this.prevSmO2 < 45 ? 'High' : this.prevSmO2 < 60 ? 'Medium' : 'Low',
      timestamp: new Date().toISOString(),
      state: this.currentState,
      batteryLevel: Math.round(this.batteryLevel * 10) / 10,
      respiratoryRate: Math.round(this.prevRR),
      vo2Estimate: Math.round(this.prevVO2 * 10) / 10,
      lactateEstimate: Math.round(this.prevLactate * 10) / 10,
      cadence: Math.round(this.prevCadence),
      trainingLoad: Math.round(this.trainingLoad),
      recoveryTimeMin,
      hydrationLevel: Math.round(this.hydrationLevel),
    };
  };

  getCurrentState = (): PhysiologicalState => this.currentState;

  getBatteryLevel = (): number => Math.round(this.batteryLevel * 10) / 10;

  resetBattery = (): void => {
    this.batteryLevel = 100;
  };

  setInterval = (ms: number): void => {
    this.config.intervalMs = ms;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = setInterval(this.tick, ms);
    }
  };

  // Force a specific state (for testing/demo)
  forceState = (state: PhysiologicalState): void => {
    this.currentState = state;
  };
}

// ============================================
// SINGLETON INSTANCE
// ============================================

let simulatorInstance: BraceletSimulator | null = null;

export const getBraceletSimulator = (config?: Partial<SimulatorConfig>): BraceletSimulator => {
  if (!simulatorInstance) {
    simulatorInstance = new BraceletSimulator(config);
  }
  return simulatorInstance;
};

export const resetBraceletSimulator = (): void => {
  if (simulatorInstance) {
    simulatorInstance.stop();
    simulatorInstance = null;
  }
};

export default BraceletSimulator;
