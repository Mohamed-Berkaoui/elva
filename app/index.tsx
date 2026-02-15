import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions, StatusBar } from 'react-native';
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
import { FontSizes, Spacing } from '@/constants/theme';

const BRAND_PURPLE = '#7c095f';

const { width, height } = Dimensions.get('window');

export default function WelcomeScreen() {
  const { colors, isDark } = useTheme();

  const logoOpacity = useSharedValue(0);
  const logoScale = useSharedValue(0.5);
  const titleOpacity = useSharedValue(0);
  const titleTranslateY = useSharedValue(30);
  const subtitleOpacity = useSharedValue(0);
  const buttonsOpacity = useSharedValue(0);
  const buttonsTranslateY = useSharedValue(50);

  useEffect(() => {
    logoOpacity.value = withDelay(300, withTiming(1, { duration: 800 }));
    logoScale.value = withDelay(300, withTiming(1, { duration: 600 }));
    titleOpacity.value = withDelay(800, withTiming(1, { duration: 600 }));
    titleTranslateY.value = withDelay(600, withTiming(0, { duration: 500 }));
    subtitleOpacity.value = withDelay(1200, withTiming(1, { duration: 600 }));
    buttonsOpacity.value = withDelay(1600, withTiming(1, { duration: 600 }));
    buttonsTranslateY.value = withDelay(900, withTiming(0, { duration: 500 }));
  }, []);

  const logoStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }],
  }));

  const titleStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [{ translateY: titleTranslateY.value }],
  }));

  const subtitleStyle = useAnimatedStyle(() => ({
    opacity: subtitleOpacity.value,
  }));

  const buttonsStyle = useAnimatedStyle(() => ({
    opacity: buttonsOpacity.value,
    transform: [{ translateY: buttonsTranslateY.value }],
  }));

  const handleSignIn = () => {
    router.push('/onboarding/name-input');
  };

  const handleNoDevice = () => {
    router.push('/onboarding/no-device');
  };

  // Dynamic gradient colors based on theme
  const gradientColors: readonly [string, string, string] = isDark
    ? [colors.background, colors.surface, '#1A1A1A']
    : [colors.background, colors.surface, '#E5E5E5'];

  return (
    <LinearGradient colors={gradientColors} style={styles.container}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      <View style={styles.content}>
        {/* Logo — large, centered */}
        <Animated.View style={[styles.logoContainer, logoStyle]}>
          <ElvaLogo size={200} heartRate={72} variant="solid" />
        </Animated.View>

        {/* Taglines */}
        <Animated.View style={[styles.titleContainer, titleStyle]}>
          <Text style={[styles.subtitle, { color: BRAND_PURPLE }]}>
            Personalized progress, every day
          </Text>
        </Animated.View>

        <Animated.View style={subtitleStyle}>
          <Text style={[styles.description, { color: colors.textSecondary }]}>
            Build a better you, daily
          </Text>
        </Animated.View>

        {/* Buttons */}
        <Animated.View style={[styles.buttonsContainer, buttonsStyle]}>
          <Button
            title="Sign In"
            onPress={handleSignIn}
            variant="primary"
            size="large"
            fullWidth
          />

          <View style={styles.buttonSpacer} />

          <Button
            title="I don't have a device yet"
            onPress={handleNoDevice}
            variant="outline"
            size="medium"
          />
        </Animated.View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingTop: 120,
    paddingBottom: Spacing.xxl + 20,
  },
  logoContainer: {
    marginBottom: Spacing.xxl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleContainer: {
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: FontSizes.xl,
    textAlign: 'center',
    marginBottom: Spacing.sm,
    fontWeight: '300',
    letterSpacing: -0.3,
  },
  description: {
    fontSize: FontSizes.md,
    textAlign: 'center',
    lineHeight: 22,
  },
  buttonsContainer: {
    width: '100%',
    alignItems: 'center',
  },
  buttonSpacer: {
    height: Spacing.md,
  },
});
