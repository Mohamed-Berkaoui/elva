import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Button } from '@/components/ui/buttons';
import { ElvaLogo } from '@/components/ui/logo';
import useTheme from '@/hooks/use-theme';
import { FontSizes, Spacing, BorderRadius } from '@/constants/theme';

export default function NameInputScreen() {
  const { colors, isDark } = useTheme();
  const [email, setEmail] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  const logoOpacity = useSharedValue(0);
  const contentOpacity = useSharedValue(0);
  const contentTranslateY = useSharedValue(30);
  const buttonOpacity = useSharedValue(0);

  useEffect(() => {
    logoOpacity.value = withDelay(200, withTiming(1, { duration: 500 }));
    contentOpacity.value = withDelay(400, withTiming(1, { duration: 500 }));
    contentTranslateY.value = withDelay(300, withTiming(0, { duration: 500 }));
    buttonOpacity.value = withDelay(600, withTiming(1, { duration: 500 }));
  }, []);

  const logoStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
  }));

  const contentStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
    transform: [{ translateY: contentTranslateY.value }],
  }));

  const buttonStyle = useAnimatedStyle(() => ({
    opacity: buttonOpacity.value,
  }));

  const isValidEmail = (text: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text.trim());
  };

  const handleContinue = () => {
    if (isValidEmail(email)) {
      router.push({
        pathname: '/onboarding/gender-select',
        params: { userEmail: email.trim() },
      });
    }
  };

  const gradientColors: readonly [string, string, string] = isDark
    ? [colors.background, colors.surface, '#1A1A1A']
    : [colors.background, colors.surface, '#E5E5E5'];

  return (
    <LinearGradient colors={gradientColors} style={styles.container}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.content}>
          {/* Logo */}
          <Animated.View style={[styles.logoContainer, logoStyle]}>
            <ElvaLogo size={90} heartRate={72} variant="solid" />
          </Animated.View>

          {/* Title & Input */}
          <Animated.View style={[styles.inputContainer, contentStyle]}>
            <Text style={[styles.title, { color: colors.text }]}>
              Sign in with your email
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Enter your email address to continue{'\n'}with your personalized health journey
            </Text>

            <View
              style={[
                styles.inputWrapper,
                { backgroundColor: colors.surface, borderColor: colors.border },
                isFocused && { borderColor: colors.accent },
              ]}
            >
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder="Enter your email"
                placeholderTextColor={colors.textMuted}
                value={email}
                onChangeText={setEmail}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                textContentType="emailAddress"
                returnKeyType="done"
                onSubmitEditing={handleContinue}
              />
            </View>
          </Animated.View>

          {/* Continue Button */}
          <Animated.View style={[styles.footer, buttonStyle]}>
            <Button
              title="Sign In"
              onPress={handleContinue}
              variant="primary"
              size="large"
              fullWidth
              disabled={!isValidEmail(email)}
            />

            <Text style={[styles.privacyNote, { color: colors.textMuted }]}>
              Your email is stored locally on your device{'\n'}and never shared with third parties.
            </Text>
          </Animated.View>
        </View>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.xl,
    paddingTop: 100,
    justifyContent: 'space-between',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  inputContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontSize: FontSizes.xxl,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: FontSizes.md,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing.xl,
  },
  inputWrapper: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Platform.OS === 'ios' ? Spacing.lg : Spacing.sm,
  },
  input: {
    fontSize: FontSizes.lg,
    textAlign: 'center',
    fontWeight: '500',
  },
  footer: {
    paddingBottom: Spacing.xxl,
  },
  privacyNote: {
    fontSize: FontSizes.xs,
    textAlign: 'center',
    marginTop: Spacing.md,
    lineHeight: 18,
  },
});
