/**
 * Performance Detail Page
 * Deep-dive into muscle oxygen, VO₂, lactate thresholds,
 * and training intensity analysis.
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { Icon } from '@/components/ui/icon';
import { NatureHeader } from '@/components/ui/nature-header';
import { GlassCard } from '@/components/ui/cards';
import { useApp } from '@/context/app-context';
import useTheme from '@/hooks/use-theme';
import { FontSizes, Spacing } from '@/constants/theme';

const { width } = Dimensions.get('window');

export default function PerformanceDetailScreen() {
  const { latestReading, readinessScore } = useApp();
  const { colors } = useTheme();

  const hr = latestReading?.heartRate || 72;
  const hrv = latestReading?.hrv || 48;
  const smo2 = latestReading?.muscleOxygen || 65;
  const vo2 = latestReading?.vo2Estimate || 42;
  const lactate = latestReading?.lactateEstimate || 1.2;
  const trainingLoad = latestReading?.trainingLoad || 0;
  const recoveryTime = latestReading?.recoveryTimeMin || 0;
  const cadence = latestReading?.cadence || 0;
  const hydration = latestReading?.hydrationLevel || 85;
  const spo2 = latestReading?.bloodOxygen || 97;
  const stress = latestReading?.stressLevel || 30;
  const state = latestReading?.state || 'resting';

  // Derived
  const maxHR = 220 - 28; // ~192 for age 28
  const hrZone = Math.min(5, Math.max(1, Math.ceil((hr / maxHR) * 5)));
  const hrZonePct = Math.round((hr / maxHR) * 100);

  const getSmO2Color = () => {
    if (smo2 >= 60) return '#4CAF50';
    if (smo2 >= 40) return '#FF9800';
    return '#F44336';
  };

  const getVO2Category = (val: number) => {
    if (val >= 50) return { label: 'Excellent', color: '#4CAF50' };
    if (val >= 40) return { label: 'Good', color: '#66BB6A' };
    if (val >= 30) return { label: 'Average', color: '#FF9800' };
    return { label: 'Below Average', color: '#F44336' };
  };

  const vo2Cat = getVO2Category(vo2);

  const getLactateZone = (val: number) => {
    if (val < 2) return { zone: 'Zone 1 — Aerobic', color: '#4CAF50', desc: 'Fat burning, easy effort' };
    if (val < 4) return { zone: 'Zone 2 — Threshold', color: '#FF9800', desc: 'Tempo pace, manageable discomfort' };
    return { zone: 'Zone 3 — Anaerobic', color: '#F44336', desc: 'High intensity, limited sustainability' };
  };

  const lactateZone = getLactateZone(lactate);

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <ScrollView bounces={false} showsVerticalScrollIndicator={false}>
        <NatureHeader
          title="Performance"
          subtitle="Real-time body output analysis"
          variant="performance"
          icon="trending-up"
        />

        <View style={styles.content}>
          {/* Primary Performance Card */}
          <GlassCard style={styles.primaryCard}>
            <View style={styles.primaryGrid}>
              <View style={styles.primaryItem}>
                <Text style={[styles.primaryValue, { color: getSmO2Color() }]}>
                  {smo2.toFixed(0)}
                  <Text style={[styles.primaryUnit, { color: colors.textMuted }]}>%</Text>
                </Text>
                <Text style={[styles.primaryLabel, { color: colors.textMuted }]}>Muscle O₂</Text>
              </View>
              <View style={[styles.primaryDivider, { backgroundColor: colors.border }]} />
              <View style={styles.primaryItem}>
                <Text style={[styles.primaryValue, { color: vo2Cat.color }]}>
                  {vo2.toFixed(1)}
                </Text>
                <Text style={[styles.primaryLabel, { color: colors.textMuted }]}>VO₂ ml/kg/min</Text>
              </View>
              <View style={[styles.primaryDivider, { backgroundColor: colors.border }]} />
              <View style={styles.primaryItem}>
                <Text style={[styles.primaryValue, { color: lactateZone.color }]}>
                  {lactate.toFixed(1)}
                </Text>
                <Text style={[styles.primaryLabel, { color: colors.textMuted }]}>Lactate mmol/L</Text>
              </View>
            </View>
          </GlassCard>

          {/* Heart Rate Zones */}
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Heart Rate Zone</Text>
          <GlassCard style={styles.zoneCard}>
            <View style={styles.hrZoneHeader}>
              <Text style={[styles.hrZoneValue, { color: colors.heartRate }]}>{hr} bpm</Text>
              <View style={[styles.hrZoneBadge, { backgroundColor: getZoneColor(hrZone) + '20' }]}>
                <Text style={[styles.hrZoneBadgeText, { color: getZoneColor(hrZone) }]}>Zone {hrZone}</Text>
              </View>
            </View>
            <View style={styles.zonesGrid}>
              {[1,2,3,4,5].map(z => (
                <View key={z} style={styles.zoneItem}>
                  <View style={[styles.zoneBar, { 
                    backgroundColor: hrZone >= z ? getZoneColor(z) : colors.surfaceSecondary,
                    height: 6 + z * 8 
                  }]} />
                  <Text style={[styles.zoneNum, { color: hrZone === z ? getZoneColor(z) : colors.textMuted }]}>Z{z}</Text>
                </View>
              ))}
            </View>
            <View style={styles.zoneLabels}>
              <Text style={[styles.zoneLabelText, { color: colors.textMuted }]}>Recovery</Text>
              <Text style={[styles.zoneLabelText, { color: colors.textMuted }]}>Max</Text>
            </View>
          </GlassCard>

          {/* VO₂ & Aerobic Capacity */}
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Aerobic Capacity</Text>
          <GlassCard style={styles.vo2Card}>
            <View style={styles.vo2Header}>
              <View>
                <Text style={[styles.vo2Value, { color: vo2Cat.color }]}>{vo2.toFixed(1)}</Text>
                <Text style={[styles.vo2Unit, { color: colors.textMuted }]}>ml/kg/min</Text>
              </View>
              <View style={[styles.vo2Badge, { backgroundColor: vo2Cat.color + '20' }]}>
                <Text style={[styles.vo2BadgeText, { color: vo2Cat.color }]}>{vo2Cat.label}</Text>
              </View>
            </View>
            <View style={[styles.vo2Scale, { backgroundColor: colors.surfaceSecondary }]}>
              <View style={[styles.vo2Fill, { width: `${Math.min(100, (vo2 / 60) * 100)}%` }]}>
                <View style={styles.vo2Gradient}>
                  <View style={[styles.vo2Seg, { flex: 1, backgroundColor: '#F44336' }]} />
                  <View style={[styles.vo2Seg, { flex: 1, backgroundColor: '#FF9800' }]} />
                  <View style={[styles.vo2Seg, { flex: 1, backgroundColor: '#66BB6A' }]} />
                  <View style={[styles.vo2Seg, { flex: 1, backgroundColor: '#4CAF50' }]} />
                </View>
              </View>
            </View>
            <View style={styles.vo2Labels}>
              <Text style={[styles.vo2LabelText, { color: colors.textMuted }]}>20</Text>
              <Text style={[styles.vo2LabelText, { color: colors.textMuted }]}>30</Text>
              <Text style={[styles.vo2LabelText, { color: colors.textMuted }]}>40</Text>
              <Text style={[styles.vo2LabelText, { color: colors.textMuted }]}>50</Text>
              <Text style={[styles.vo2LabelText, { color: colors.textMuted }]}>60+</Text>
            </View>
          </GlassCard>

          {/* Lactate Analysis */}
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Lactate Threshold</Text>
          <GlassCard style={styles.lactateCard}>
            <View style={styles.lactateHeader}>
              <Text style={[styles.lactateValue, { color: lactateZone.color }]}>{lactate.toFixed(1)} mmol/L</Text>
              <View style={[styles.lactateBadge, { backgroundColor: lactateZone.color + '20' }]}>
                <Text style={[styles.lactateBadgeText, { color: lactateZone.color }]}>{lactateZone.zone}</Text>
              </View>
            </View>
            <Text style={[styles.lactateDesc, { color: colors.textSecondary }]}>{lactateZone.desc}</Text>
            
            <View style={styles.lactateZones}>
              <LactateZoneRow zone="Aerobic" range="< 2.0" color="#4CAF50" active={lactate < 2} colors={colors} />
              <LactateZoneRow zone="Threshold" range="2.0 – 4.0" color="#FF9800" active={lactate >= 2 && lactate < 4} colors={colors} />
              <LactateZoneRow zone="Anaerobic" range="> 4.0" color="#F44336" active={lactate >= 4} colors={colors} />
            </View>
          </GlassCard>

          {/* Training Status */}
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Training Status</Text>
          <GlassCard style={styles.statusCard}>
            <StatusRow label="Training Load" value={`${Math.round(trainingLoad)}`} 
              badge={trainingLoad > 70 ? 'Overreaching' : trainingLoad > 30 ? 'Optimal' : 'Detraining'} 
              badgeColor={trainingLoad > 70 ? '#F44336' : trainingLoad > 30 ? '#4CAF50' : '#FF9800'} colors={colors} />
            <StatusRow label="Recovery Time" value={`${Math.round(recoveryTime)} min`} 
              badge={recoveryTime > 120 ? 'Extended' : 'Normal'} 
              badgeColor={recoveryTime > 120 ? '#FF9800' : '#4CAF50'} colors={colors} />
            <StatusRow label="Hydration" value={`${Math.round(hydration)}%`} 
              badge={hydration > 70 ? 'Optimal' : 'Low'} 
              badgeColor={hydration > 70 ? '#4CAF50' : '#FF9800'} colors={colors} />
            <StatusRow label="SpO₂" value={`${spo2.toFixed(0)}%`} 
              badge={spo2 >= 95 ? 'Normal' : 'Low'} 
              badgeColor={spo2 >= 95 ? '#4CAF50' : '#F44336'} colors={colors} />
            <StatusRow label="Stress Impact" value={`${stress}%`}
              badge={stress < 40 ? 'Low' : stress < 70 ? 'Moderate' : 'High'}
              badgeColor={stress < 40 ? '#4CAF50' : stress < 70 ? '#FF9800' : '#F44336'} colors={colors} />
            <StatusRow label="Current State" value={state.replace('_', ' ')}
              badge={state === 'resting' ? 'Rest' : state === 'sleeping' ? 'Sleep' : 'Active'}
              badgeColor={state === 'resting' ? '#42A5F5' : state === 'sleeping' ? '#7986CB' : '#FF7043'} colors={colors} />
          </GlassCard>

          <View style={{ height: 40 }} />
        </View>
      </ScrollView>
    </View>
  );
}

// ── Sub-components ──

const getZoneColor = (zone: number) => {
  const c = ['#42A5F5', '#66BB6A', '#FFA726', '#FF7043', '#EF5350'];
  return c[zone - 1] || '#42A5F5';
};

const LactateZoneRow = ({ zone, range, color, active, colors }: { zone: string; range: string; color: string; active: boolean; colors: any }) => (
  <View style={styles.lactateZoneRow}>
    <View style={[styles.lactateIndicator, { backgroundColor: active ? color : colors.surfaceSecondary }]} />
    <Text style={[styles.lactateZoneName, { color: active ? colors.text : colors.textMuted }]}>{zone}</Text>
    <Text style={[styles.lactateRange, { color: colors.textMuted }]}>{range}</Text>
    {active && <Icon name="radiobox-marked" size={14} color={color} />}
  </View>
);

const StatusRow = ({ label, value, badge, badgeColor, colors }: { label: string; value: string; badge: string; badgeColor: string; colors: any }) => (
  <View style={styles.statusRow}>
    <Text style={[styles.statusLabel, { color: colors.text }]}>{label}</Text>
    <View style={styles.statusRight}>
      <Text style={[styles.statusValue, { color: colors.text }]}>{value}</Text>
      <View style={[styles.statusBadge, { backgroundColor: badgeColor + '20' }]}>
        <Text style={[styles.statusBadgeText, { color: badgeColor }]}>{badge}</Text>
      </View>
    </View>
  </View>
);

// ── Styles ──

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg },

  primaryCard: { marginBottom: Spacing.md },
  primaryGrid: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' },
  primaryItem: { alignItems: 'center' },
  primaryValue: { fontSize: 32, fontWeight: '300', letterSpacing: -1 },
  primaryUnit: { fontSize: 16 },
  primaryLabel: { fontSize: 11, marginTop: 4 },
  primaryDivider: { width: 1, height: 48 },

  sectionTitle: { fontSize: FontSizes.lg, fontWeight: '700', marginBottom: Spacing.md, marginTop: Spacing.lg, letterSpacing: -0.3 },

  zoneCard: { marginBottom: Spacing.md },
  hrZoneHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.lg },
  hrZoneValue: { fontSize: 28, fontWeight: '300' },
  hrZoneBadge: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 16 },
  hrZoneBadgeText: { fontSize: FontSizes.sm, fontWeight: '600' },
  zonesGrid: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-end', height: 60 },
  zoneItem: { alignItems: 'center', gap: 4 },
  zoneBar: { width: 28, borderRadius: 4 },
  zoneNum: { fontSize: 11, fontWeight: '600' },
  zoneLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  zoneLabelText: { fontSize: 10 },

  vo2Card: { marginBottom: Spacing.md },
  vo2Header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  vo2Value: { fontSize: 32, fontWeight: '300' },
  vo2Unit: { fontSize: FontSizes.sm, marginTop: 2 },
  vo2Badge: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 16 },
  vo2BadgeText: { fontSize: FontSizes.sm, fontWeight: '600' },
  vo2Scale: { height: 10, borderRadius: 5, overflow: 'hidden' },
  vo2Fill: { height: '100%' },
  vo2Gradient: { flexDirection: 'row', flex: 1 },
  vo2Seg: { height: '100%' },
  vo2Labels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  vo2LabelText: { fontSize: 10 },

  lactateCard: { marginBottom: Spacing.md },
  lactateHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  lactateValue: { fontSize: 24, fontWeight: '300' },
  lactateBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 14 },
  lactateBadgeText: { fontSize: 12, fontWeight: '600' },
  lactateDesc: { fontSize: FontSizes.sm, marginBottom: Spacing.md },
  lactateZones: { gap: 10 },
  lactateZoneRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  lactateIndicator: { width: 8, height: 28, borderRadius: 4 },
  lactateZoneName: { flex: 1, fontSize: FontSizes.md, fontWeight: '500' },
  lactateRange: { fontSize: FontSizes.sm },

  statusCard: { marginBottom: Spacing.md, gap: 16 },
  statusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statusLabel: { fontSize: FontSizes.md },
  statusRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusValue: { fontSize: FontSizes.md, fontWeight: '600' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  statusBadgeText: { fontSize: 11, fontWeight: '600' },
});
