import React, { createContext, useContext, useState, useEffect, useRef, ReactNode, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, AppSettings, Gender } from '@/types';
import { getBraceletSimulator, type BraceletReading } from '@/services/bracelet-simulator';
import { getDatabase, getLatestVital, getVitalStats, getLastSleepSession, getUnreadNotifications, getBraceletState, type VitalRecord, type AINotificationRecord } from '@/services/database';
import { analyzeNewData, calculateReadinessScore } from '@/services/ai-service';
import { requestNotificationPermissions, sendAIHealthAlert } from '@/services/notification-service';

interface AppContextType {
  // User
  user: User | null;
  setUser: (user: User | null) => void;
  isLoggedIn: boolean;
  setIsLoggedIn: (value: boolean) => void;
  hasDevice: boolean;
  setHasDevice: (value: boolean) => void;
  onboardingComplete: boolean;
  setOnboardingComplete: (value: boolean) => void;
  selectedGender: Gender | null;
  setSelectedGender: (gender: Gender) => void;

  // Settings
  settings: AppSettings;
  updateSettings: (settings: Partial<AppSettings>) => void;

  // Bracelet
  braceletConnected: boolean;
  latestReading: BraceletReading | null;
  startBracelet: () => Promise<void>;
  stopBracelet: () => Promise<void>;

  // Health data (from SQLite)
  latestVital: VitalRecord | null;
  readinessScore: number;
  refreshHealthData: () => Promise<void>;

  // Notifications
  unreadCount: number;
  notifications: AINotificationRecord[];
  refreshNotifications: () => Promise<void>;

  // AI Analysis
  aiEnabled: boolean;
  setAiEnabled: (enabled: boolean) => void;
  aiAnalysisInterval: number; // minutes
  setAiAnalysisInterval: (minutes: number) => void;

  // Global tracking (persists across navigation)
  activeTracking: { type: 'sleep' | 'sport'; startTime: number; sessionId: number | null } | null;
  trackingElapsed: number;
  trackingHrHistory: number[];
  trackingHrvHistory: number[];
  trackingSmo2History: number[];
  trackingCalories: number;
  trackingSteps: number;
  startTracking: (type: 'sleep' | 'sport', sessionId: number | null) => void;
  stopTracking: () => { hrHistory: number[]; hrvHistory: number[]; smo2History: number[]; calories: number; steps: number; elapsed: number };
  resetTracking: () => void;
}

const defaultSettings: AppSettings = {
  rainSoundEnabled: false,
  rainVolume: 0.5,
  notificationsEnabled: true,
  dataRefreshInterval: 5,
  theme: 'light',
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [hasDevice, setHasDevice] = useState(true);
  const [onboardingComplete, setOnboardingComplete] = useState(false);
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [selectedGender, setSelectedGender] = useState<Gender | null>(null);

  // Bracelet state
  const [braceletConnected, setBraceletConnected] = useState(false);
  const [latestReading, setLatestReading] = useState<BraceletReading | null>(null);

  // Health data
  const [latestVital, setLatestVital] = useState<VitalRecord | null>(null);
  const [readinessScore, setReadinessScore] = useState(68);

  // Notifications
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<AINotificationRecord[]>([]);

  // AI settings
  const [aiEnabled, setAiEnabled] = useState(true);
  const [aiAnalysisInterval, setAiAnalysisInterval] = useState(5);

  // Global tracking state
  const [activeTracking, setActiveTracking] = useState<{ type: 'sleep' | 'sport'; startTime: number; sessionId: number | null } | null>(null);
  const [trackingElapsed, setTrackingElapsed] = useState(0);
  const [trackingHrHistory, setTrackingHrHistory] = useState<number[]>([]);
  const [trackingHrvHistory, setTrackingHrvHistory] = useState<number[]>([]);
  const [trackingSmo2History, setTrackingSmo2History] = useState<number[]>([]);
  const [trackingCalories, setTrackingCalories] = useState(0);
  const [trackingSteps, setTrackingSteps] = useState(0);
  const trackingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const trackingReadingsRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const analysisTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ============================================
  // INITIALIZATION
  // ============================================

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    // Initialize database
    await getDatabase();

    // Load stored data
    await loadStoredData();

    // Request notification permissions
    await requestNotificationPermissions();
  };

  const loadStoredData = async () => {
    try {
      const storedSettings = await AsyncStorage.getItem('elva_settings');
      if (storedSettings) setSettings(JSON.parse(storedSettings));

      const storedUser = await AsyncStorage.getItem('elva_user');
      if (storedUser) {
        setUser(JSON.parse(storedUser));
        setIsLoggedIn(true);
        setOnboardingComplete(true);
      }

      const storedGender = await AsyncStorage.getItem('elva_gender');
      if (storedGender) setSelectedGender(storedGender as Gender);

      const storedAiEnabled = await AsyncStorage.getItem('elva_ai_enabled');
      if (storedAiEnabled !== null) setAiEnabled(storedAiEnabled === 'true');

      const storedAiInterval = await AsyncStorage.getItem('elva_ai_interval');
      if (storedAiInterval) setAiAnalysisInterval(parseInt(storedAiInterval, 10));
    } catch (error) {
      console.error('Error loading stored data:', error);
    }
  };

  // ============================================
  // BRACELET SIMULATOR
  // ============================================

  const startBracelet = useCallback(async () => {
    const simulator = getBraceletSimulator({
      intervalMs: 3000,
      realisticNoise: true,
      onReading: (reading) => {
        setLatestReading(reading);
      },
      onBatteryLow: (level) => {
        sendAIHealthAlert('Low Battery', `ELVA Bracelet battery is at ${level}%. Please charge soon.`);
      },
    });

    await simulator.start();
    setBraceletConnected(true);
  }, []);

  const stopBracelet = useCallback(async () => {
    const simulator = getBraceletSimulator();
    await simulator.stop();
    setBraceletConnected(false);
    setLatestReading(null);
  }, []);

  // Auto-start bracelet on login
  useEffect(() => {
    if (isLoggedIn && !braceletConnected) {
      startBracelet();
    }

    return () => {
      if (braceletConnected) {
        const simulator = getBraceletSimulator();
        simulator.stop();
      }
    };
  }, [isLoggedIn]);

  // ============================================
  // GLOBAL TRACKING TIMER & READINGS
  // ============================================

  useEffect(() => {
    if (!activeTracking) {
      if (trackingTimerRef.current) clearInterval(trackingTimerRef.current);
      if (trackingReadingsRef.current) clearInterval(trackingReadingsRef.current);
      return;
    }
    // 1-second elapsed timer
    trackingTimerRef.current = setInterval(() => {
      setTrackingElapsed(Math.floor((Date.now() - activeTracking.startTime) / 1000));
    }, 1000);
    // 2-second readings accumulator
    trackingReadingsRef.current = setInterval(() => {
      try {
        const r = getBraceletSimulator().getLastReading();
        setTrackingHrHistory(prev => [...prev.slice(-59), r.heartRate]);
        if (activeTracking.type === 'sleep') {
          setTrackingHrvHistory(prev => [...prev.slice(-59), r.hrv]);
        } else {
          setTrackingSmo2History(prev => [...prev.slice(-59), r.muscleOxygen]);
          setTrackingCalories(prev => prev + 10 / 30);
          setTrackingSteps(prev => prev + Math.round(140 / 30));
        }
      } catch {}
    }, 2000);
    return () => {
      if (trackingTimerRef.current) clearInterval(trackingTimerRef.current);
      if (trackingReadingsRef.current) clearInterval(trackingReadingsRef.current);
    };
  }, [activeTracking]);

  const startTracking = useCallback((type: 'sleep' | 'sport', sessionId: number | null) => {
    setActiveTracking({ type, startTime: Date.now(), sessionId });
    setTrackingElapsed(0);
    setTrackingHrHistory([]);
    setTrackingHrvHistory([]);
    setTrackingSmo2History([]);
    setTrackingCalories(0);
    setTrackingSteps(0);
  }, []);

  const stopTracking = useCallback(() => {
    const data = {
      hrHistory: trackingHrHistory,
      hrvHistory: trackingHrvHistory,
      smo2History: trackingSmo2History,
      calories: trackingCalories,
      steps: trackingSteps,
      elapsed: trackingElapsed,
    };
    setActiveTracking(null);
    return data;
  }, [trackingHrHistory, trackingHrvHistory, trackingSmo2History, trackingCalories, trackingSteps, trackingElapsed]);

  const resetTracking = useCallback(() => {
    setActiveTracking(null);
    setTrackingElapsed(0);
    setTrackingHrHistory([]);
    setTrackingHrvHistory([]);
    setTrackingSmo2History([]);
    setTrackingCalories(0);
    setTrackingSteps(0);
  }, []);

  // ============================================
  // AI ANALYSIS LOOP
  // ============================================

  useEffect(() => {
    if (!isLoggedIn || !aiEnabled) {
      if (analysisTimerRef.current) clearInterval(analysisTimerRef.current);
      return;
    }

    // Run analysis on interval
    const runAnalysis = async () => {
      const gender = selectedGender || 'male';
      const handleNotification = settings.notificationsEnabled
        ? (title: string, body: string) => {
            sendAIHealthAlert(title, body);
          }
        : undefined;

      await analyzeNewData(gender, handleNotification);
      await refreshHealthData();
      await refreshNotifications();
    };

    // Initial analysis
    const timeout = setTimeout(runAnalysis, 10000); // Wait 10s after login

    // Periodic analysis
    analysisTimerRef.current = setInterval(runAnalysis, aiAnalysisInterval * 60 * 1000);

    return () => {
      clearTimeout(timeout);
      if (analysisTimerRef.current) clearInterval(analysisTimerRef.current);
    };
  }, [isLoggedIn, aiEnabled, aiAnalysisInterval, selectedGender, settings.notificationsEnabled]);

  // ============================================
  // HEALTH DATA REFRESH
  // ============================================

  const refreshHealthData = useCallback(async () => {
    try {
      const [vital, readiness] = await Promise.all([
        getLatestVital(),
        calculateReadinessScore(),
      ]);
      if (vital) setLatestVital(vital);
      setReadinessScore(readiness);
    } catch {
      // DB might not be ready yet
    }
  }, []);

  const refreshNotifications = useCallback(async () => {
    try {
      const unread = await getUnreadNotifications();
      setNotifications(unread);
      setUnreadCount(unread.length);
    } catch {
      // DB not ready
    }
  }, []);

  // Refresh health data periodically
  useEffect(() => {
    if (!isLoggedIn) return;

    const interval = setInterval(refreshHealthData, 10000); // Every 10 seconds
    refreshHealthData();
    refreshNotifications();

    return () => clearInterval(interval);
  }, [isLoggedIn, refreshHealthData]);

  // ============================================
  // SETTERS WITH PERSISTENCE
  // ============================================

  const updateSettings = async (newSettings: Partial<AppSettings>) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    await AsyncStorage.setItem('elva_settings', JSON.stringify(updated));
  };

  const handleSetUser = async (newUser: User | null) => {
    setUser(newUser);
    if (newUser) {
      await AsyncStorage.setItem('elva_user', JSON.stringify(newUser));
    } else {
      await AsyncStorage.removeItem('elva_user');
    }
  };

  const handleSetGender = async (gender: Gender) => {
    setSelectedGender(gender);
    await AsyncStorage.setItem('elva_gender', gender);
    if (user) {
      const updatedUser = { ...user, gender };
      handleSetUser(updatedUser);
    }
  };

  const handleSetAiEnabled = async (enabled: boolean) => {
    setAiEnabled(enabled);
    await AsyncStorage.setItem('elva_ai_enabled', String(enabled));
  };

  const handleSetAiInterval = async (minutes: number) => {
    setAiAnalysisInterval(minutes);
    await AsyncStorage.setItem('elva_ai_interval', String(minutes));
  };

  return (
    <AppContext.Provider
      value={{
        user,
        setUser: handleSetUser,
        isLoggedIn,
        setIsLoggedIn,
        hasDevice,
        setHasDevice,
        onboardingComplete,
        setOnboardingComplete,
        selectedGender,
        setSelectedGender: handleSetGender,
        settings,
        updateSettings,
        braceletConnected,
        latestReading,
        startBracelet,
        stopBracelet,
        latestVital,
        readinessScore,
        refreshHealthData,
        unreadCount,
        notifications,
        refreshNotifications,
        aiEnabled,
        setAiEnabled: handleSetAiEnabled,
        aiAnalysisInterval,
        setAiAnalysisInterval: handleSetAiInterval,
        activeTracking,
        trackingElapsed,
        trackingHrHistory,
        trackingHrvHistory,
        trackingSmo2History,
        trackingCalories,
        trackingSteps,
        startTracking,
        stopTracking,
        resetTracking,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
