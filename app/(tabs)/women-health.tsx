import React, { useState, useCallback, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, StatusBar, Pressable, Modal, TextInput, Keyboard } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Icon } from '@/components/ui/icon';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GlassCard, MetricCard } from '@/components/ui/cards';
import { CircularProgress } from '@/components/ui/charts';
import { DynamicBackground } from '@/components/ui/dynamic-background';
import { ElvaLogo } from '@/components/ui/logo';
import { useApp } from '@/context/app-context';
import useTheme from '@/hooks/use-theme';
import { getCycleData, getHormoneInsights } from '@/data/mock-data';
import { generateChatResponse, isAIAvailable, analyzeSymptoms } from '@/services/ai-service';
import { FontSizes, Spacing, BorderRadius, LogoSize, type ThemeColors } from '@/constants/theme';

export default function WomenHealthScreen() {
  const insets = useSafeAreaInsets();
  const { readinessScore, selectedGender } = useApp();
  const { mode, colors } = useTheme();
  const cycleData = getCycleData();
  const hormoneInsights = getHormoneInsights();

  // Symptom logging
  const [loggedSymptoms, setLoggedSymptoms] = useState<string[]>([...cycleData.symptoms]);
  const [showSymptomPicker, setShowSymptomPicker] = useState(false);
  const [customSymptom, setCustomSymptom] = useState('');

  // AI Coach
  const [aiQuestion, setAiQuestion] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  // Auto AI symptom analysis
  const [symptomInsight, setSymptomInsight] = useState('');
  const [symptomInsightLoading, setSymptomInsightLoading] = useState(false);
  const prevSymptomCount = useRef(loggedSymptoms.length);

  // ── Cycle history (past 6 cycles) ──
  const cycleHistory = [
    { startDate: 'Jan 19', length: 28, phase: 'luteal', symptoms: ['Bloating', 'Fatigue'] },
    { startDate: 'Dec 22', length: 27, phase: 'completed', symptoms: ['Cramps', 'Headache'] },
    { startDate: 'Nov 25', length: 29, phase: 'completed', symptoms: ['Mood Swings', 'Back Pain'] },
    { startDate: 'Oct 27', length: 28, phase: 'completed', symptoms: ['Cramps', 'Bloating', 'Fatigue'] },
    { startDate: 'Sep 29', length: 28, phase: 'completed', symptoms: ['Headache'] },
    { startDate: 'Sep 1', length: 28, phase: 'completed', symptoms: ['Nausea', 'Cramps'] },
  ];

  // Auto-analyze symptoms when new ones are added
  useEffect(() => {
    if (loggedSymptoms.length > prevSymptomCount.current && loggedSymptoms.length > 0) {
      (async () => {
        setSymptomInsightLoading(true);
        try {
          const analysis = await analyzeSymptoms(
            loggedSymptoms,
            selectedGender || 'female',
            cycleData,
          );
          setSymptomInsight(analysis);
        } catch {
          setSymptomInsight('Could not analyze symptoms right now.');
        }
        setSymptomInsightLoading(false);
      })();
    }
    prevSymptomCount.current = loggedSymptoms.length;
  }, [loggedSymptoms, selectedGender, cycleData]);

  const COMMON_SYMPTOMS = [
    'Cramps', 'Bloating', 'Headache', 'Fatigue', 'Mood Swings',
    'Back Pain', 'Nausea', 'Breast Tenderness', 'Acne', 'Insomnia',
    'Cravings', 'Anxiety', 'Hot Flashes', 'Dizziness',
  ];

  const toggleSymptom = (symptom: string) => {
    setLoggedSymptoms(prev =>
      prev.includes(symptom) ? prev.filter(s => s !== symptom) : [...prev, symptom]
    );
  };

  const addCustomSymptom = () => {
    if (!customSymptom.trim()) return;
    const s = customSymptom.trim();
    if (!loggedSymptoms.includes(s)) setLoggedSymptoms(prev => [...prev, s]);
    setCustomSymptom('');
  };

  const askAI = useCallback(async (text: string) => {
    if (!text.trim() || aiLoading) return;
    Keyboard.dismiss();
    setAiLoading(true);
    setAiResponse('');
    try {
      const resp = await generateChatResponse(
        text.trim(),
        selectedGender || 'female',
        cycleData,
        []
      );
      setAiResponse(resp);
    } catch {
      setAiResponse('Sorry, I couldn\'t process that. Please try again.');
    }
    setAiLoading(false);
  }, [aiLoading, selectedGender, cycleData]);

  const getPhaseInfo = (phase: string) => {
    switch (phase) {
      case 'menstrual':
        return {
          color: colors.womenHealth,
          title: 'Menstrual Phase',
          description: 'Focus on rest and gentle movement. Iron-rich foods recommended.',
          icon: 'water' as const,
        };
      case 'follicular':
        return {
          color: colors.success,
          title: 'Follicular Phase',
          description: 'Energy is building. Great time for new activities and challenges.',
          icon: 'trending-up' as const,
        };
      case 'ovulation':
        return {
          color: colors.warning,
          title: 'Ovulation Phase',
          description: 'Peak energy and fertility. Ideal for high-intensity workouts.',
          icon: 'weather-sunny' as const,
        };
      case 'luteal':
        return {
          color: colors.sleep,
          title: 'Luteal Phase',
          description: 'Energy may decrease. Focus on stress management and rest.',
          icon: 'moon-waning-crescent' as const,
        };
      default:
        return {
          color: colors.text,
          title: 'Tracking',
          description: 'Continue tracking for personalized insights.',
          icon: 'chart-line' as const,
        };
    }
  };

  const phaseInfo = getPhaseInfo(cycleData.phase);
  const cycleProgress = (cycleData.cycleDay / 28) * 100;

  return (
    <DynamicBackground readinessScore={readinessScore} plain>
      <View style={styles.container}>
        <StatusBar barStyle={mode === 'dark' ? 'light-content' : 'dark-content'} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.pageHeader}>
          <ElvaLogo size={LogoSize.header} heartRate={72} variant="solid" />
        </View>



        {/* Cycle Overview Card */}
        <Animated.View entering={FadeIn.delay(200)}>
          <GlassCard style={styles.cycleCard}>
            <View style={styles.cycleHeader}>
              <View style={styles.cycleInfo}>
                <View style={[styles.phaseIcon, { backgroundColor: phaseInfo.color + '30' }]}>
                  <Icon name={phaseInfo.icon} size={24} color={phaseInfo.color} />
                </View>
                <View>
                  <Text style={[styles.cycleDay, { color: colors.text }]}>
                    Day {cycleData.cycleDay}
                  </Text>
                  <Text style={[styles.phaseName, { color: phaseInfo.color }]}>
                    {phaseInfo.title}
                  </Text>
                </View>
              </View>
              <CircularProgress
                progress={cycleProgress}
                size={70}
                strokeWidth={6}
                color={phaseInfo.color}
                showValue={false}
              />
            </View>
            <Text style={[styles.phaseDescription, { color: colors.textSecondary }]}>
              {phaseInfo.description}
            </Text>

            {cycleData.fertileWindow && (
              <View style={[styles.fertileAlert, { backgroundColor: colors.womenHealth + '20' }]}>
                <Icon name="heart" size={16} color={colors.womenHealth} />
                <Text style={[styles.fertileText, { color: colors.womenHealth }]}>
                  You're in your fertile window
                </Text>
              </View>
            )}
          </GlassCard>
        </Animated.View>

        {/* Cycle Timeline */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Cycle Timeline</Text>
        <GlassCard style={styles.timelineCard}>
          <View style={styles.timeline}>
            <CyclePhaseBar phase="menstrual" current={cycleData.phase} colors={colors} />
            <CyclePhaseBar phase="follicular" current={cycleData.phase} colors={colors} />
            <CyclePhaseBar phase="ovulation" current={cycleData.phase} colors={colors} />
            <CyclePhaseBar phase="luteal" current={cycleData.phase} colors={colors} />
          </View>
          <View style={styles.timelineLabels}>
            <Text style={[styles.timelineLabel, { color: colors.textMuted }]}>1</Text>
            <Text style={[styles.timelineLabel, { color: colors.textMuted }]}>7</Text>
            <Text style={[styles.timelineLabel, { color: colors.textMuted }]}>14</Text>
            <Text style={[styles.timelineLabel, { color: colors.textMuted }]}>21</Text>
            <Text style={[styles.timelineLabel, { color: colors.textMuted }]}>28</Text>
          </View>
        </GlassCard>

        {/* Hormone Insights */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Hormone Trends</Text>
        <View style={styles.hormoneGrid}>
          <MetricCard
            title="Estrogen"
            value={
              hormoneInsights.estrogenTrend.charAt(0).toUpperCase() +
              hormoneInsights.estrogenTrend.slice(1)
            }
            color={colors.womenHealth}
            icon={<Icon name="trending-up" size={18} color={colors.womenHealth} />}
            delay={400}
            style={styles.hormoneCard}
          />
          <MetricCard
            title="Progesterone"
            value={
              hormoneInsights.progesteroneTrend.charAt(0).toUpperCase() +
              hormoneInsights.progesteroneTrend.slice(1)
            }
            color={colors.sleep}
            icon={<Icon name="trending-up" size={18} color={colors.sleep} />}
            delay={500}
            style={styles.hormoneCard}
          />
        </View>

        {/* AI Recommendation */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Today's Recommendation</Text>
        <GlassCard style={styles.recommendationCard}>
          <View style={styles.recommendationHeader}>
            <View style={[styles.aiIcon, { backgroundColor: colors.surfaceSecondary }]}>
              <Text style={[styles.aiIconText, { color: colors.text }]}>E</Text>
            </View>
            <Text style={[styles.recommendationTitle, { color: colors.text }]}>AI Coach Says</Text>
          </View>
          <Text style={[styles.recommendationText, { color: colors.textSecondary }]}>
            {hormoneInsights.recommendation}
          </Text>
        </GlassCard>

        {/* Symptoms Log */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Current Symptoms</Text>
        <GlassCard style={styles.symptomsCard}>
          {loggedSymptoms.length > 0 ? (
            <View style={styles.symptomsContainer}>
              {loggedSymptoms.map((symptom, index) => (
                <Pressable key={index} onPress={() => toggleSymptom(symptom)}>
                  <View style={[styles.symptomTag, { backgroundColor: colors.womenHealth + '20' }]}>
                    <Text style={[styles.symptomText, { color: colors.womenHealth }]}>{symptom}</Text>
                    <Icon name="close" size={12} color={colors.womenHealth} />
                  </View>
                </Pressable>
              ))}
            </View>
          ) : (
            <Text style={[styles.noSymptomsText, { color: colors.textMuted }]}>
              No symptoms logged today
            </Text>
          )}
          <Pressable
            style={[styles.addSymptomButton, { borderTopColor: colors.divider }]}
            onPress={() => setShowSymptomPicker(true)}
          >
            <Icon name="plus-circle-outline" size={20} color={colors.womenHealth} />
            <Text style={[styles.addSymptomText, { color: colors.womenHealth }]}>Log Symptom</Text>
          </Pressable>
        </GlassCard>

        {/* Auto AI Symptom Insight */}
        {(symptomInsight || symptomInsightLoading) && (
          <GlassCard style={styles.symptomInsightCard}>
            <View style={styles.symptomInsightHeader}>
              <View style={[styles.aiIcon, { backgroundColor: colors.womenHealth + '20' }]}>
                <Text style={[styles.aiIconText, { color: colors.womenHealth }]}>E</Text>
              </View>
              <Text style={[styles.symptomInsightTitle, { color: colors.text }]}>Symptom Analysis</Text>
            </View>
            {symptomInsightLoading ? (
              <Text style={[styles.symptomInsightText, { color: colors.textMuted }]}>Analyzing your symptoms...</Text>
            ) : (
              <Text style={[styles.symptomInsightText, { color: colors.textSecondary }]}>{symptomInsight}</Text>
            )}
          </GlassCard>
        )}

        {/* Symptom Picker Modal */}
        <Modal visible={showSymptomPicker} transparent animationType="slide" onRequestClose={() => setShowSymptomPicker(false)}>
          <View style={styles.symptomModalOverlay}>
            <View style={[styles.symptomModalContent, { backgroundColor: colors.surface }]}>
              <Text style={[styles.symptomModalTitle, { color: colors.text }]}>Log Symptoms</Text>
              <View style={styles.symptomModalGrid}>
                {COMMON_SYMPTOMS.map((s) => {
                  const active = loggedSymptoms.includes(s);
                  return (
                    <Pressable key={s} onPress={() => toggleSymptom(s)}
                      style={[styles.symptomModalTag, { backgroundColor: active ? colors.womenHealth + '30' : colors.surfaceSecondary }]}
                    >
                      <Text style={[styles.symptomModalTagText, { color: active ? colors.womenHealth : colors.text }]}>{s}</Text>
                      {active && <Icon name="check" size={12} color={colors.womenHealth} />}
                    </Pressable>
                  );
                })}
              </View>
              <View style={styles.customSymptomRow}>
                <TextInput
                  style={[styles.customSymptomInput, { color: colors.text, borderColor: colors.border }]}
                  placeholder="Custom symptom..."
                  placeholderTextColor={colors.textMuted}
                  value={customSymptom}
                  onChangeText={setCustomSymptom}
                  onSubmitEditing={addCustomSymptom}
                />
                <Pressable style={[styles.customSymptomAdd, { backgroundColor: colors.womenHealth }]} onPress={addCustomSymptom}>
                  <Icon name="plus" size={18} color="#FFF" />
                </Pressable>
              </View>
              <Pressable
                style={[styles.symptomDoneBtn, { backgroundColor: colors.womenHealth }]}
                onPress={() => setShowSymptomPicker(false)}
              >
                <Text style={styles.symptomDoneBtnText}>Done ({loggedSymptoms.length} logged)</Text>
              </Pressable>
            </View>
          </View>
        </Modal>

        {/* AI Coach for Women's Health */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>AI Coach</Text>
        <GlassCard style={styles.aiCoachCard}>
          <View style={styles.aiCoachHeader}>
            <View style={[styles.aiIcon, { backgroundColor: colors.womenHealth + '20' }]}>
              <Text style={[styles.aiIconText, { color: colors.womenHealth }]}>E</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.aiCoachTitle, { color: colors.text }]}>Ask ELVA about your cycle</Text>
              <Text style={[styles.aiCoachSub, { color: colors.textMuted }]}>
                {isAIAvailable() ? 'AI-powered insights' : 'Offline insights from your data'}
              </Text>
            </View>
          </View>

          {/* Quick questions */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.aiQuickRow}>
            {[
              'How does my cycle affect energy?',
              'What exercises suit this phase?',
              'Why am I feeling fatigued?',
              'Diet tips for my current phase?',
            ].map((q, i) => (
              <Pressable
                key={i}
                style={[styles.aiQuickBtn, { backgroundColor: colors.surfaceSecondary }]}
                onPress={() => { setAiQuestion(q); askAI(q); }}
              >
                <Text style={[styles.aiQuickBtnText, { color: colors.text }]}>{q}</Text>
              </Pressable>
            ))}
          </ScrollView>

          <View style={styles.aiInputRow}>
            <TextInput
              style={[styles.aiInput, { color: colors.text, borderColor: colors.border }]}
              placeholder="Ask about your health..."
              placeholderTextColor={colors.textMuted}
              value={aiQuestion}
              onChangeText={setAiQuestion}
              onSubmitEditing={() => askAI(aiQuestion)}
            />
            <Pressable
              style={[styles.aiSendBtn, { backgroundColor: colors.womenHealth, opacity: aiLoading ? 0.5 : 1 }]}
              onPress={() => askAI(aiQuestion)}
              disabled={aiLoading}
            >
              <Icon name={aiLoading ? 'dots-horizontal' : 'send'} size={18} color="#FFF" />
            </Pressable>
          </View>

          {aiResponse ? (
            <View style={[styles.aiResponseBox, { backgroundColor: colors.surfaceSecondary }]}>
              <Text style={[styles.aiResponseText, { color: colors.text }]}>{aiResponse}</Text>
            </View>
          ) : null}
        </GlassCard>

        {/* Upcoming Events */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Upcoming</Text>
        <GlassCard style={styles.upcomingCard}>
          {cycleData.estimatedOvulation && (
            <View style={styles.upcomingItem}>
              <View style={[styles.upcomingIcon, { backgroundColor: colors.warning + '20' }]}>
                <Icon name="weather-sunny" size={18} color={colors.warning} />
              </View>
              <View style={styles.upcomingInfo}>
                <Text style={[styles.upcomingTitle, { color: colors.text }]}>
                  Estimated Ovulation
                </Text>
                <Text style={[styles.upcomingDate, { color: colors.textSecondary }]}>
                  {cycleData.estimatedOvulation.toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  })}
                </Text>
              </View>
            </View>
          )}
          {cycleData.nextPeriod && (
            <View style={styles.upcomingItem}>
              <View style={[styles.upcomingIcon, { backgroundColor: colors.womenHealth + '20' }]}>
                <Icon name="water" size={18} color={colors.womenHealth} />
              </View>
              <View style={styles.upcomingInfo}>
                <Text style={[styles.upcomingTitle, { color: colors.text }]}>Next Period</Text>
                <Text style={[styles.upcomingDate, { color: colors.textSecondary }]}>
                  {cycleData.nextPeriod.toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  })}
                </Text>
              </View>
            </View>
          )}
        </GlassCard>

        {/* Cycle History */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Cycle History</Text>
        {cycleHistory.map((cycle, idx) => (
          <GlassCard key={idx} style={styles.historyCard}>
            <View style={styles.historyRow}>
              <View style={[styles.historyDot, { backgroundColor: idx === 0 ? colors.womenHealth : colors.textMuted }]} />
              <View style={styles.historyInfo}>
                <View style={styles.historyTop}>
                  <Text style={[styles.historyDate, { color: colors.text }]}>
                    {cycle.startDate}
                  </Text>
                  <Text style={[styles.historyLength, { color: colors.textMuted }]}>
                    {cycle.length} days
                  </Text>
                </View>
                {cycle.symptoms.length > 0 && (
                  <View style={styles.historySymptoms}>
                    {cycle.symptoms.map((s, si) => (
                      <View key={si} style={[styles.historySymptomTag, { backgroundColor: colors.womenHealth + '15' }]}>
                        <Text style={[styles.historySymptomText, { color: colors.womenHealth }]}>{s}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
              {idx === 0 && (
                <View style={[styles.currentBadge, { backgroundColor: colors.womenHealth + '20' }]}>
                  <Text style={[styles.currentBadgeText, { color: colors.womenHealth }]}>Current</Text>
                </View>
              )}
            </View>
          </GlassCard>
        ))}

        <View style={styles.bottomSpacer} />
      </ScrollView>
      </View>
    </DynamicBackground>
  );
}

// ===========================================
// Helper Components
// ===========================================

interface CyclePhaseBarProps {
  phase: 'menstrual' | 'follicular' | 'ovulation' | 'luteal';
  current: string;
  colors: ThemeColors;
}

const CyclePhaseBar: React.FC<CyclePhaseBarProps> = ({ phase, current, colors }) => {
  const phaseColors = {
    menstrual: colors.womenHealth,
    follicular: colors.success,
    ovulation: colors.warning,
    luteal: colors.sleep,
  };

  const isActive = phase === current;
  const color = phaseColors[phase];

  return (
    <View
      style={[
        styles.phaseBar,
        { backgroundColor: isActive ? color : color + '30' },
        isActive && styles.activePhaseBar,
      ]}
    />
  );
};

// ===========================================
// Styles (no colors - all colors are inline)
// ===========================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: 100,
  },
  pageHeader: {
    marginBottom: Spacing.md,
  },

  // Date navigation bar
  dateBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 16, borderWidth: 1, marginBottom: Spacing.md } as any,
  dateCenter: { alignItems: 'center' } as any,
  dateText: { fontSize: FontSizes.md, fontWeight: '700' } as any,
  dateSub: { fontSize: 11, marginTop: 2 } as any,

  // Symptom insight card
  symptomInsightCard: { marginTop: Spacing.sm } as any,
  symptomInsightHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 } as any,
  symptomInsightTitle: { fontSize: FontSizes.md, fontWeight: '600' } as any,
  symptomInsightText: { fontSize: FontSizes.sm, lineHeight: 20 } as any,

  sectionTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '600',
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  cycleCard: {
    marginTop: Spacing.sm,
  },
  cycleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  cycleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  phaseIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  cycleDay: {
    fontSize: FontSizes.xl,
    fontWeight: '700',
  },
  phaseName: {
    fontSize: FontSizes.sm,
    fontWeight: '500',
  },
  phaseDescription: {
    fontSize: FontSizes.md,
    lineHeight: 22,
  },
  fertileAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.md,
  },
  fertileText: {
    fontSize: FontSizes.sm,
    marginLeft: Spacing.sm,
    fontWeight: '500',
  },
  timelineCard: {
    marginTop: Spacing.xs,
  },
  timeline: {
    flexDirection: 'row',
    height: 24,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: Spacing.sm,
  },
  phaseBar: {
    flex: 1,
  },
  activePhaseBar: {
    transform: [{ scaleY: 1.2 }],
  },
  timelineLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xs,
  },
  timelineLabel: {
    fontSize: FontSizes.xs,
  },
  hormoneGrid: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  hormoneCard: {
    flex: 1,
  },
  recommendationCard: {
    marginTop: Spacing.xs,
  },
  recommendationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  aiIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  aiIconText: {
    fontSize: 14,
    fontWeight: '300',
  },
  recommendationTitle: {
    fontSize: FontSizes.md,
    fontWeight: '600',
  },
  recommendationText: {
    fontSize: FontSizes.md,
    lineHeight: 22,
  },
  symptomsCard: {
    marginTop: Spacing.xs,
  },
  symptomsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  symptomTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  symptomText: {
    fontSize: FontSizes.sm,
    fontWeight: '500',
  },
  noSymptomsText: {
    fontSize: FontSizes.sm,
    marginBottom: Spacing.md,
  },
  addSymptomButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
    borderTopWidth: 1,
  },
  addSymptomText: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    marginLeft: Spacing.xs,
  },
  // Symptom picker modal
  symptomModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  symptomModalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: Spacing.lg,
    paddingTop: Spacing.xl,
    maxHeight: '75%',
  },
  symptomModalTitle: {
    fontSize: FontSizes.xl,
    fontWeight: '700',
    marginBottom: Spacing.lg,
    textAlign: 'center',
  },
  symptomModalGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: Spacing.lg,
  },
  symptomModalTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  symptomModalTagText: {
    fontSize: 13,
    fontWeight: '500',
  },
  customSymptomRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: Spacing.lg,
  },
  customSymptomInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
  },
  customSymptomAdd: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  symptomDoneBtn: {
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  symptomDoneBtnText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
  },
  // AI Coach
  aiCoachCard: {
    marginTop: Spacing.xs,
  },
  aiCoachHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  aiCoachTitle: {
    fontSize: FontSizes.md,
    fontWeight: '600',
  },
  aiCoachSub: {
    fontSize: 11,
    marginTop: 2,
  },
  aiQuickRow: {
    marginBottom: Spacing.md,
  },
  aiQuickBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    marginRight: 8,
  },
  aiQuickBtnText: {
    fontSize: 12,
    fontWeight: '500',
  },
  aiInputRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: Spacing.sm,
  },
  aiInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
  },
  aiSendBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiResponseBox: {
    borderRadius: 12,
    padding: Spacing.md,
    marginTop: Spacing.sm,
  },
  aiResponseText: {
    fontSize: FontSizes.sm,
    lineHeight: 22,
  },
  upcomingCard: {
    marginTop: Spacing.xs,
  },
  upcomingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  upcomingIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  upcomingInfo: {
    flex: 1,
  },
  upcomingTitle: {
    fontSize: FontSizes.md,
    fontWeight: '500',
  },
  upcomingDate: {
    fontSize: FontSizes.sm,
  },

  // Cycle History
  historyCard: {
    marginBottom: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
  } as any,
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  } as any,
  historyDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  } as any,
  historyInfo: {
    flex: 1,
    gap: 6,
  } as any,
  historyTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  } as any,
  historyDate: {
    fontSize: FontSizes.md,
    fontWeight: '600',
  } as any,
  historyLength: {
    fontSize: FontSizes.sm,
  } as any,
  historySymptoms: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  } as any,
  historySymptomTag: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  } as any,
  historySymptomText: {
    fontSize: 11,
    fontWeight: '500',
  } as any,
  currentBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  } as any,
  currentBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  } as any,

  bottomSpacer: {
    height: Spacing.xxl + 80,
  },
});
