import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  Pressable,
  Alert,
  StatusBar,
  TextInput,
} from 'react-native';
import { Icon, type IconName } from '@/components/ui/icon';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GlassCard } from '@/components/ui/cards';
import { DynamicBackground } from '@/components/ui/dynamic-background';
import { LivePulse } from '@/components/ui/indicators';
import { ElvaLogo } from '@/components/ui/logo';
import { useApp } from '@/context/app-context';
import useTheme from '@/hooks/use-theme';
import { FontSizes, Spacing, LogoSize, type ThemeMode } from '@/constants/theme';
import { clearAllData, getDatabaseSize, getVitalCount, getBraceletState, updateBraceletState } from '@/services/database';
import { getBraceletSimulator } from '@/services/bracelet-simulator';
import { requestNotificationPermissions } from '@/services/notification-service';

const AI_INTERVALS = [
  { label: '1 min', value: 1, description: 'Very frequent (uses more battery)' },
  { label: '3 min', value: 3, description: 'Frequent analysis' },
  { label: '5 min', value: 5, description: 'Balanced (recommended)' },
  { label: '10 min', value: 10, description: 'Conservative' },
  { label: '15 min', value: 15, description: 'Minimal analysis' },
];

const SIM_SPEEDS = [
  { label: '0.5x', value: 0.5 },
  { label: '1x', value: 1 },
  { label: '2x', value: 2 },
  { label: '5x', value: 5 },
];

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const {
    user, setUser, settings, updateSettings, selectedGender,
    braceletConnected, startBracelet, stopBracelet,
    aiEnabled, setAiEnabled, aiAnalysisInterval, setAiAnalysisInterval,
    readinessScore,
  } = useApp();
  const { mode, colors, setMode } = useTheme();

  const [dbSize, setDbSize] = useState('0 KB');
  const [vitalCount, setVitalCount] = useState(0);
  const [simSpeed, setSimSpeed] = useState(1);
  const [batteryLevel, setBatteryLevel] = useState(100);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [heightValue, setHeightValue] = useState(user?.height ? String(user.height) : '');
  const [weightValue, setWeightValue] = useState(user?.weight ? String(user.weight) : '');

  const updateHeight = (text: string) => {
    setHeightValue(text);
    const num = parseFloat(text);
    if (!isNaN(num) && num > 0 && user) {
      setUser({ ...user, height: num });
    }
  };

  const updateWeight = (text: string) => {
    setWeightValue(text);
    const num = parseFloat(text);
    if (!isNaN(num) && num > 0 && user) {
      setUser({ ...user, weight: num });
    }
  };

  useEffect(() => {
    loadStats();
    loadBraceletInfo();
  }, []);

  const loadStats = async () => {
    try {
      const [size, count] = await Promise.all([getDatabaseSize(), getVitalCount()]);
      setDbSize(size);
      setVitalCount(count);
    } catch { }
  };

  const loadBraceletInfo = async () => {
    try {
      const state = await getBraceletState();
      if (state) {
        setSimSpeed(state.simulation_speed);
        setBatteryLevel(state.battery_level);
      }
    } catch { }
  };

  const handleClearData = () => {
    Alert.alert(
      'Clear All Data',
      'This will permanently delete all health data, activity sessions, sleep records, and AI insights. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Everything',
          style: 'destructive',
          onPress: async () => {
            await clearAllData();
            await loadStats();
            Alert.alert('Done', 'All data has been cleared.');
          },
        },
      ]
    );
  };

  const handleToggleBracelet = async () => {
    if (braceletConnected) {
      await stopBracelet();
    } else {
      await startBracelet();
    }
  };

  const handleSimSpeedChange = async (speed: number) => {
    setSimSpeed(speed);
    const sim = getBraceletSimulator();
    sim.setInterval(3000 / speed);
    await updateBraceletState({ simulation_speed: speed });
  };

  const handleNotificationPermission = async () => {
    const granted = await requestNotificationPermissions();
    setNotificationsEnabled(granted);
    if (!granted) {
      Alert.alert('Permissions Required', 'Enable notifications in your device settings to receive AI health alerts.');
    }
  };

  const handleThemeToggle = () => {
    const newMode: ThemeMode = mode === 'dark' ? 'light' : 'dark';
    setMode(newMode);
  };

  return (
    <DynamicBackground readinessScore={readinessScore} plain>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <StatusBar barStyle={mode === 'dark' ? 'light-content' : 'dark-content'} />
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.pageHeader}>
            <ElvaLogo size={LogoSize.header} heartRate={72} variant="solid" />
          </View>

          {/* ── Bracelet ── */}
          <SectionHeader title="ELVA Bracelet" icon="watch" colors={colors} />
          <GlassCard style={styles.card}>
            <SettingRow
              label="Bracelet Connection"
              description={braceletConnected ? 'Simulated • Streaming data' : 'Disconnected'}
              colors={colors}
              right={
                <View style={styles.rowRight}>
                  {braceletConnected && <LivePulse color={colors.success} size={5} />}
                  <Switch
                    value={braceletConnected}
                    onValueChange={handleToggleBracelet}
                    trackColor={{ false: colors.border, true: colors.success + '60' }}
                    thumbColor={braceletConnected ? colors.success : colors.textMuted}
                  />
                </View>
              }
            />
            <Divider colors={colors} />
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={[styles.settingLabel, { color: colors.text }]}>Simulation Speed</Text>
                <Text style={[styles.settingDescription, { color: colors.textMuted }]}>Faster = more data points</Text>
              </View>
              <View style={styles.chipRow}>
                {SIM_SPEEDS.map(s => (
                  <Pressable
                    key={s.value}
                    style={[styles.chip, { backgroundColor: simSpeed === s.value ? colors.accent : colors.surfaceSecondary, borderColor: simSpeed === s.value ? colors.accent : colors.border }]}
                    onPress={() => handleSimSpeedChange(s.value)}
                  >
                    <Text style={[styles.chipText, { color: simSpeed === s.value ? '#fff' : colors.text }]}>{s.label}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
            <Divider colors={colors} />
            <SettingRow
              label="Battery Level"
              description="Simulated bracelet battery"
              colors={colors}
              right={
                <Text style={[styles.valueText, { color: batteryLevel < 20 ? colors.error : colors.success }]}>
                  {Math.round(batteryLevel)}%
                </Text>
              }
            />
          </GlassCard>

          {/* ── AI Coach ── */}
          <SectionHeader title="AI Coach" icon="shimmer" colors={colors} />
          <GlassCard style={styles.card}>
            <SettingRow
              label="AI Analysis"
              description="Automatically analyze health data patterns"
              colors={colors}
              right={
                <Switch
                  value={aiEnabled}
                  onValueChange={setAiEnabled}
                  trackColor={{ false: colors.border, true: colors.accent + '60' }}
                  thumbColor={aiEnabled ? colors.accent : colors.textMuted}
                />
              }
            />
            <Divider colors={colors} />
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={[styles.settingLabel, { color: colors.text }]}>Analysis Interval</Text>
                <Text style={[styles.settingDescription, { color: colors.textMuted }]}>How often AI checks your data</Text>
              </View>
            </View>
            <View style={styles.intervalRow}>
              {AI_INTERVALS.map(interval => (
                <Pressable
                  key={interval.value}
                  style={[styles.intervalChip, {
                    backgroundColor: aiAnalysisInterval === interval.value ? colors.accent : colors.surfaceSecondary,
                    borderColor: aiAnalysisInterval === interval.value ? colors.accent : colors.border,
                    opacity: aiEnabled ? 1 : 0.5,
                  }]}
                  onPress={() => aiEnabled && setAiAnalysisInterval(interval.value)}
                  disabled={!aiEnabled}
                >
                  <Text style={[styles.intervalText, { color: aiAnalysisInterval === interval.value ? '#fff' : colors.text }]}>{interval.label}</Text>
                </Pressable>
              ))}
            </View>
            <Divider colors={colors} />
            <SettingRow
              label="OpenAI Status"
              description={process.env.EXPO_PUBLIC_OPENAI_API_KEY ? 'API key configured' : 'No API key — using local fallback'}
              colors={colors}
              right={
                <View style={[styles.statusDot, { backgroundColor: process.env.EXPO_PUBLIC_OPENAI_API_KEY ? colors.success : colors.warning }]} />
              }
            />
          </GlassCard>

          {/* ── Notifications ── */}
          <SectionHeader title="Notifications" icon="bell" colors={colors} />
          <GlassCard style={styles.card}>
            <SettingRow
              label="Push Notifications"
              description="AI health alerts and reminders"
              colors={colors}
              right={
                <Switch
                  value={notificationsEnabled}
                  onValueChange={(val) => {
                    if (val) handleNotificationPermission();
                    else setNotificationsEnabled(false);
                  }}
                  trackColor={{ false: colors.border, true: colors.accent + '60' }}
                  thumbColor={notificationsEnabled ? colors.accent : colors.textMuted}
                />
              }
            />
            <Divider colors={colors} />
            <SettingRow
              label="Health Alerts"
              description="Critical health metric warnings"
              colors={colors}
              right={<Icon name="alert-circle" size={20} color={colors.error} />}
            />
            <Divider colors={colors} />
            <SettingRow
              label="Activity Reminders"
              description="Movement and exercise suggestions"
              colors={colors}
              right={<Icon name="walk" size={20} color={colors.accent} />}
            />
          </GlassCard>

          {/* ── Appearance ── */}
          <SectionHeader title="Appearance" icon="palette" colors={colors} />
          <GlassCard style={styles.card}>
            <SettingRow
              label="Dark Mode"
              description={mode === 'dark' ? 'On' : 'Off'}
              colors={colors}
              right={
                <Switch
                  value={mode === 'dark'}
                  onValueChange={handleThemeToggle}
                  trackColor={{ false: colors.border, true: colors.accent + '60' }}
                  thumbColor={mode === 'dark' ? colors.accent : colors.textMuted}
                />
              }
            />
            <Divider colors={colors} />
            <SettingRow
              label="Rain Sounds"
              description="Background ambient sounds"
              colors={colors}
              right={
                <Switch
                  value={settings.rainSoundEnabled}
                  onValueChange={(val) => updateSettings({ rainSoundEnabled: val })}
                  trackColor={{ false: colors.border, true: colors.accent + '60' }}
                  thumbColor={settings.rainSoundEnabled ? colors.accent : colors.textMuted}
                />
              }
            />
          </GlassCard>

          {/* ── Data ── */}
          <SectionHeader title="Data & Storage" icon="server" colors={colors} />
          <GlassCard style={styles.card}>
            <SettingRow
              label="Database Size"
              description="Local SQLite storage"
              colors={colors}
              right={<Text style={[styles.valueText, { color: colors.textSecondary }]}>{dbSize}</Text>}
            />
            <Divider colors={colors} />
            <SettingRow
              label="Data Points"
              description="Total vital readings stored"
              colors={colors}
              right={<Text style={[styles.valueText, { color: colors.textSecondary }]}>{vitalCount.toLocaleString()}</Text>}
            />
            <Divider colors={colors} />
            <Pressable style={styles.settingRow} onPress={loadStats}>
              <View style={styles.settingInfo}>
                <Text style={[styles.settingLabel, { color: colors.accent }]}>Refresh Stats</Text>
              </View>
              <Icon name="refresh" size={20} color={colors.accent} />
            </Pressable>
            <Divider colors={colors} />
            <Pressable style={styles.settingRow} onPress={handleClearData}>
              <View style={styles.settingInfo}>
                <Text style={[styles.settingLabel, { color: colors.error }]}>Clear All Data</Text>
                <Text style={[styles.settingDescription, { color: colors.textMuted }]}>Delete all health data permanently</Text>
              </View>
              <Icon name="delete" size={20} color={colors.error} />
            </Pressable>
          </GlassCard>

          {/* ── Profile ── */}
          <SectionHeader title="Profile" icon="account" colors={colors} />
          <GlassCard style={styles.card}>
            <SettingRow
              label="Email"
              description={user?.email || 'Not set'}
              colors={colors}
              right={<Icon name="chevron-right" size={18} color={colors.textMuted} />}
            />
            <Divider colors={colors} />
            <SettingRow
              label="Gender"
              description={selectedGender ? selectedGender.charAt(0).toUpperCase() + selectedGender.slice(1) : 'Not set'}
              colors={colors}
              right={<Icon name="chevron-right" size={18} color={colors.textMuted} />}
            />
            <Divider colors={colors} />
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={[styles.settingLabel, { color: colors.text }]}>Height (cm)</Text>
              </View>
              <TextInput
                style={[styles.profileInput, { color: colors.text, backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}
                value={heightValue}
                onChangeText={updateHeight}
                placeholder="e.g. 170"
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
              />
            </View>
            <Divider colors={colors} />
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={[styles.settingLabel, { color: colors.text }]}>Weight (kg)</Text>
              </View>
              <TextInput
                style={[styles.profileInput, { color: colors.text, backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}
                value={weightValue}
                onChangeText={updateWeight}
                placeholder="e.g. 65"
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
              />
            </View>
          </GlassCard>

          {/* ── About ── */}
          <SectionHeader title="About" icon="information" colors={colors} />
          <GlassCard style={styles.card}>
            <SettingRow label="ELVA Version" description="1.0.0 MVP" colors={colors} right={null} />
            <Divider colors={colors} />
            <SettingRow label="Data Storage" description="100% Local (SQLite)" colors={colors} right={null} />
            <Divider colors={colors} />
            <SettingRow label="AI Model" description="GPT-4o (when configured)" colors={colors} right={null} />
          </GlassCard>

          <View style={{ height: 100 }} />
        </ScrollView>
      </View>
    </DynamicBackground>
  );
}

// ============================================
// SUB-COMPONENTS
// ============================================

interface SectionHeaderProps { title: string; icon: IconName; colors: any; }
const SectionHeader: React.FC<SectionHeaderProps> = ({ title, icon, colors }) => (
  <View style={styles.sectionHeader}>
    <Icon name={icon} size={16} color={colors.accent} />
    <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>{title}</Text>
  </View>
);

interface SettingRowProps { label: string; description: string; colors: any; right: React.ReactNode; }
const SettingRow: React.FC<SettingRowProps> = ({ label, description, colors, right }) => (
  <View style={styles.settingRow}>
    <View style={styles.settingInfo}>
      <Text style={[styles.settingLabel, { color: colors.text }]}>{label}</Text>
      <Text style={[styles.settingDescription, { color: colors.textMuted }]}>{description}</Text>
    </View>
    {right}
  </View>
);

const Divider: React.FC<{ colors: any }> = ({ colors }) => (
  <View style={[styles.divider, { backgroundColor: colors.border + '40' }]} />
);

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  scrollContent: { paddingHorizontal: Spacing.lg, paddingTop: 0, paddingBottom: 120 },
  pageHeader: { marginBottom: Spacing.md },

  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: Spacing.xl, marginBottom: Spacing.sm, paddingHorizontal: 4 },
  sectionTitle: { fontSize: FontSizes.xs, fontWeight: '600', letterSpacing: 1, textTransform: 'uppercase' },

  card: { padding: 0 },
  settingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
  settingInfo: { flex: 1, marginRight: Spacing.md },
  settingLabel: { fontSize: FontSizes.md, fontWeight: '500' },
  settingDescription: { fontSize: FontSizes.xs, marginTop: 2 },
  divider: { height: 0.5, marginHorizontal: Spacing.lg },

  rowRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  valueText: { fontSize: FontSizes.md, fontWeight: '600' },
  statusDot: { width: 10, height: 10, borderRadius: 5 },

  chipRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 18, borderWidth: 0.5 },
  chipText: { fontSize: FontSizes.xs, fontWeight: '600' },

  intervalRow: { flexDirection: 'row', gap: 8, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md, flexWrap: 'wrap' },
  intervalChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 18, borderWidth: 0.5 },
  intervalText: { fontSize: FontSizes.xs, fontWeight: '600' },

  profileInput: { width: 90, fontSize: FontSizes.md, fontWeight: '600', textAlign: 'right', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 14, borderWidth: 0.5 },
});
