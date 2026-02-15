import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ActivityIndicator,
  Keyboard,
} from 'react-native';
import { Icon } from '@/components/ui/icon';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GlassCard } from '@/components/ui/cards';
import { ElvaLogo } from '@/components/ui/logo';
import { DynamicBackground } from '@/components/ui/dynamic-background';
import { useApp } from '@/context/app-context';
import useTheme from '@/hooks/use-theme';
import { FontSizes, Spacing, LogoSize } from '@/constants/theme';
import { generateChatResponse, isAIAvailable } from '@/services/ai-service';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const QUICK_ACTIONS = [
  { label: '💪 Readiness', message: 'What is my readiness score and what does it mean?' },
  { label: '😴 Sleep', message: 'How was my recent sleep quality?' },
  { label: '❤️ Heart', message: 'What are my heart rate and HRV trends showing?' },
  { label: '🧘 Stress', message: 'How are my stress levels looking? Any advice?' },
  { label: '🏃 Recovery', message: 'Am I recovered enough for an intense workout?' },
  { label: '🌙 Tonight', message: 'What should I do tonight for better recovery?' },
];

export default function CoachScreen() {
  const insets = useSafeAreaInsets();
  const { user, selectedGender, readinessScore } = useApp();
  const { colors } = useTheme();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);

  // Send welcome message on mount
  useEffect(() => {
    const welcome: ChatMessage = {
      id: 'welcome',
      role: 'assistant',
      content: `Hey! I'm your ELVA AI coach. I have full access to your bracelet data — heart rate, HRV, stress, sleep stages, recovery, workouts, and more.\n\nAsk me anything about your health and I'll give you personalized insights based on your real data. Try typing a question below or tap a quick action to get started!${!isAIAvailable() ? '\n\n⚡ Running in offline mode. Responses use your local data.' : ''}`,
      timestamp: new Date(),
    };
    setMessages([welcome]);
  }, []);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isLoading) return;
    Keyboard.dismiss();

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text.trim(),
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setIsLoading(true);

    // Build conversation history for context
    const history = messages
      .filter(m => m.id !== 'welcome')
      .slice(-8)
      .map(m => ({ role: m.role, content: m.content }));

    try {
      const response = await generateChatResponse(
        text.trim(),
        selectedGender || 'male',
        undefined, // cycleData
        history
      );

      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        content: response,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, aiMsg]);
    } catch (err) {
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: 'I had trouble processing that. Please try again in a moment.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, messages, selectedGender]);

  const handleQuickAction = (message: string) => {
    sendMessage(message);
  };

  const renderMessage = useCallback(({ item }: { item: ChatMessage }) => {
    const isUser = item.role === 'user';
    return (
      <View style={[styles.messageRow, isUser && styles.messageRowUser]}>
        {!isUser && (
          <View style={[styles.avatar, { backgroundColor: colors.accent + '20' }]}>
            <ElvaLogo size={18} heartRate={72} variant="solid" />
          </View>
        )}
        <View
          style={[
            styles.messageBubble,
            isUser
              ? { backgroundColor: colors.buttonPrimary }
              : { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
          ]}
        >
          <Text
            style={[
              styles.messageText,
              { color: isUser ? colors.buttonPrimaryText : colors.text },
            ]}
          >
            {item.content}
          </Text>
          <Text
            style={[
              styles.messageTime,
              { color: isUser ? colors.buttonPrimaryText + '80' : colors.textMuted },
            ]}
          >
            {item.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
        {isUser && <View style={styles.avatarSpacer} />}
      </View>
    );
  }, [colors]);

  const renderFooter = () => {
    if (!isLoading) return null;
    return (
      <View style={[styles.messageRow]}>
        <View style={[styles.avatar, { backgroundColor: colors.accent + '20' }]}>
          <ElvaLogo size={18} heartRate={72} variant="solid" />
        </View>
        <View style={[styles.typingBubble, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.typingDots}>
            <TypingDot color={colors.textMuted} delay={0} />
            <TypingDot color={colors.textMuted} delay={150} />
            <TypingDot color={colors.textMuted} delay={300} />
          </View>
        </View>
      </View>
    );
  };

  return (
    <DynamicBackground readinessScore={readinessScore} plain>
      <KeyboardAvoidingView
        style={[styles.container, { paddingTop: Math.max(insets.top, 8) }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 25}
      >
        {/* Header */}
        <View style={styles.pageHeader}>
          <ElvaLogo size={LogoSize.header} heartRate={72} variant="solid" />
        </View>

        {/* Messages */}
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.messageList}
          ListFooterComponent={renderFooter}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
          showsVerticalScrollIndicator={false}
        />

        {/* Quick Actions */}
        {messages.length <= 1 && (
          <View style={styles.quickActions}>
            {QUICK_ACTIONS.map((action, i) => (
              <Pressable
                key={i}
                onPress={() => handleQuickAction(action.message)}
                style={[styles.quickActionBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
              >
                <Text style={[styles.quickActionText, { color: colors.text }]}>{action.label}</Text>
              </Pressable>
            ))}
          </View>
        )}

        {/* Input bar — sits above tab bar */}
        <View style={[
          styles.inputContainer,
          {
            backgroundColor: colors.surface,
            borderTopColor: colors.border,
            paddingBottom: Platform.OS === 'ios' ? Math.max(insets.bottom, 12) : Platform.OS === 'android' ? 12 : 80,
          },
        ]}>
          <TextInput
            ref={inputRef}
            style={[styles.input, { backgroundColor: colors.surfaceSecondary, color: colors.text }]}
            placeholder="Ask me anything about your health..."
            placeholderTextColor={colors.textMuted}
            value={inputText}
            onChangeText={setInputText}
            onSubmitEditing={() => sendMessage(inputText)}
            returnKeyType="send"
            multiline
            maxLength={500}
          />
          <Pressable
            style={[
              styles.sendButton,
              { backgroundColor: inputText.trim() && !isLoading ? colors.buttonPrimary : colors.surfaceSecondary },
            ]}
            onPress={() => sendMessage(inputText)}
            disabled={!inputText.trim() || isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color={colors.textMuted} />
            ) : (
              <Icon
                name="arrow-up"
                size={20}
                color={inputText.trim() ? colors.buttonPrimaryText : colors.textMuted}
              />
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </DynamicBackground>
  );
}

// Typing dot with delayed pulse
const TypingDot: React.FC<{ color: string; delay: number }> = ({ color, delay }) => {
  const [opacity, setOpacity] = useState(0.3);

  useEffect(() => {
    const interval = setInterval(() => {
      setOpacity(prev => (prev === 0.3 ? 1 : 0.3));
    }, 600);
    const timeout = setTimeout(() => {}, delay);
    return () => { clearInterval(interval); clearTimeout(timeout); };
  }, [delay]);

  return <View style={[styles.dot, { backgroundColor: color, opacity }]} />;
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  pageHeader: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, marginBottom: Spacing.xs },

  messageList: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md, flexGrow: 1 },
  messageRow: { flexDirection: 'row', marginBottom: Spacing.md, alignItems: 'flex-end', gap: 8 },
  messageRowUser: { justifyContent: 'flex-end' },
  avatar: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  avatarSpacer: { width: 36 },
  messageBubble: { maxWidth: '75%', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm + 2, borderRadius: 20 },
  messageText: { fontSize: FontSizes.md, lineHeight: 22 },
  messageTime: { fontSize: FontSizes.xs, marginTop: 4, textAlign: 'right' },

  typingBubble: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, borderRadius: 20, borderWidth: 0.5 },
  typingDots: { flexDirection: 'row', gap: 4 },
  dot: { width: 8, height: 8, borderRadius: 4 },

  quickActions: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: Spacing.lg, gap: 8, marginBottom: Spacing.md },
  quickActionBtn: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 22, borderWidth: 0.5 },
  quickActionText: { fontSize: FontSizes.sm },

  inputContainer: { flexDirection: 'row', paddingHorizontal: Spacing.md, paddingTop: Spacing.sm, gap: 8, borderTopWidth: 1 },
  input: { flex: 1, borderRadius: 24, paddingHorizontal: Spacing.md, paddingVertical: 10, fontSize: FontSizes.md, maxHeight: 100, minHeight: 44 },
  sendButton: { width: 42, height: 42, borderRadius: 21, justifyContent: 'center', alignItems: 'center', alignSelf: 'flex-end' },
});
