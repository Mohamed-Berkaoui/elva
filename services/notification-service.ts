/**
 * ELVA Notification Service
 * Handles push notifications from AI insights.
 * Schedules notifications, manages permissions, delivers AI alerts.
 */

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { insertAINotification } from './database';

// ============================================
// CONFIGURATION
// ============================================

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// ============================================
// PERMISSIONS
// ============================================

export const requestNotificationPermissions = async (): Promise<boolean> => {
  if (Platform.OS === 'web') return false;

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.warn('[Notifications] Permission not granted');
      return false;
    }

    // Android channel setup
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('health-alerts', {
        name: 'Health Alerts',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#64B5F6',
        sound: 'default',
      });

      await Notifications.setNotificationChannelAsync('ai-insights', {
        name: 'AI Insights',
        importance: Notifications.AndroidImportance.DEFAULT,
        sound: 'default',
      });

      await Notifications.setNotificationChannelAsync('activity-reminders', {
        name: 'Activity Reminders',
        importance: Notifications.AndroidImportance.DEFAULT,
        sound: 'default',
      });
    }

    return true;
  }

  // Simulator/emulator
  return true;
};

// ============================================
// SEND NOTIFICATIONS
// ============================================

export type NotificationType = 'health_alert' | 'ai_insight' | 'activity_reminder' | 'sleep_reminder' | 'bracelet_status';

interface NotificationPayload {
  title: string;
  body: string;
  type: NotificationType;
  priority?: 'low' | 'medium' | 'high';
  data?: Record<string, any>;
}

export const sendLocalNotification = async (payload: NotificationPayload): Promise<string | null> => {
  try {
    const channelId = Platform.OS === 'android'
      ? payload.type === 'health_alert' ? 'health-alerts'
        : payload.type === 'ai_insight' ? 'ai-insights'
        : 'activity-reminders'
      : undefined;

    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title: payload.title,
        body: payload.body,
        data: { type: payload.type, ...payload.data },
        sound: 'default',
        ...(Platform.OS === 'android' && channelId ? { channelId } : {}),
      },
      trigger: null, // Send immediately
    });

    // Also save to database
    await insertAINotification({
      title: payload.title,
      body: payload.body,
      type: payload.type,
      priority: payload.priority || 'medium',
      data: payload.data ? JSON.stringify(payload.data) : undefined,
    });

    return identifier;
  } catch (error) {
    console.warn('[Notification] Send error:', error);
    return null;
  }
};

// ============================================
// SCHEDULED NOTIFICATIONS
// ============================================

export const scheduleNotification = async (
  payload: NotificationPayload,
  delaySeconds: number
): Promise<string | null> => {
  try {
    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title: payload.title,
        body: payload.body,
        data: { type: payload.type, ...payload.data },
        sound: 'default',
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: delaySeconds,
      },
    });
    return identifier;
  } catch (error) {
    console.warn('[Notification] Schedule error:', error);
    return null;
  }
};

// ============================================
// AI-TRIGGERED NOTIFICATIONS
// ============================================

export const sendAIHealthAlert = async (title: string, body: string, data?: Record<string, any>): Promise<void> => {
  await sendLocalNotification({
    title: `🌿 ${title}`,
    body,
    type: 'health_alert',
    priority: 'high',
    data,
  });
};

export const sendAIInsightNotification = async (title: string, body: string): Promise<void> => {
  await sendLocalNotification({
    title,
    body,
    type: 'ai_insight',
    priority: 'medium',
  });
};

export const sendActivityReminder = async (message: string): Promise<void> => {
  await sendLocalNotification({
    title: 'Time to Move',
    body: message,
    type: 'activity_reminder',
    priority: 'low',
  });
};

export const sendSleepReminder = async (message: string): Promise<void> => {
  await sendLocalNotification({
    title: 'Wind Down',
    body: message,
    type: 'sleep_reminder',
    priority: 'medium',
  });
};

export const sendBraceletAlert = async (title: string, body: string): Promise<void> => {
  await sendLocalNotification({
    title,
    body,
    type: 'bracelet_status',
    priority: 'low',
  });
};

// ============================================
// NOTIFICATION LISTENERS
// ============================================

export const addNotificationReceivedListener = (
  callback: (notification: Notifications.Notification) => void
) => {
  return Notifications.addNotificationReceivedListener(callback);
};

export const addNotificationResponseListener = (
  callback: (response: Notifications.NotificationResponse) => void
) => {
  return Notifications.addNotificationResponseReceivedListener(callback);
};

// ============================================
// UTILITIES
// ============================================

export const cancelAllNotifications = async (): Promise<void> => {
  await Notifications.cancelAllScheduledNotificationsAsync();
};

export const getBadgeCount = async (): Promise<number> => {
  return Notifications.getBadgeCountAsync();
};

export const setBadgeCount = async (count: number): Promise<void> => {
  await Notifications.setBadgeCountAsync(count);
};

export default {
  requestNotificationPermissions,
  sendLocalNotification,
  scheduleNotification,
  sendAIHealthAlert,
  sendAIInsightNotification,
  sendActivityReminder,
  sendSleepReminder,
  sendBraceletAlert,
  cancelAllNotifications,
};
