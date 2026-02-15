import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Dimensions,
  StatusBar,
  ScrollView,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { Icon } from '@/components/ui/icon';
import { Button } from '@/components/ui/buttons';
import { useApp } from '@/context/app-context';
import { ElvaLogo } from '@/components/ui/logo';
import useTheme from '@/hooks/use-theme';
import { FontSizes, Spacing, BorderRadius, Shadows } from '@/constants/theme';
import { Gender } from '@/types';

const { width, height } = Dimensions.get('window');

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function GenderSelectScreen() {
  const { colors, isDark } = useTheme();
  const { setSelectedGender, setIsLoggedIn, setOnboardingComplete, setUser } = useApp();
  const { userEmail } = useLocalSearchParams<{ userEmail?: string }>();
  const [selected, setSelected] = useState<Gender | null>(null);

  const displayEmail = userEmail || '';

  const titleOpacity = useSharedValue(0);
  const titleTranslateY = useSharedValue(20);
  const cardsOpacity = useSharedValue(0);
  const cardsTranslateY = useSharedValue(30);
  const buttonOpacity = useSharedValue(0);

  useEffect(() => {
    titleOpacity.value = withDelay(200, withTiming(1, { duration: 500 }));
    titleTranslateY.value = withDelay(200, withTiming(0, { duration: 500 }));
    cardsOpacity.value = withDelay(400, withTiming(1, { duration: 500 }));
    cardsTranslateY.value = withDelay(300, withTiming(0, { duration: 500 }));
    buttonOpacity.value = withDelay(600, withTiming(1, { duration: 500 }));
  }, []);

  const titleStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [{ translateY: titleTranslateY.value }],
  }));

  const cardsStyle = useAnimatedStyle(() => ({
    opacity: cardsOpacity.value,
    transform: [{ translateY: cardsTranslateY.value }],
  }));

  const buttonStyle = useAnimatedStyle(() => ({
    opacity: buttonOpacity.value,
  }));

  const handleContinue = async () => {
    if (selected) {
      await setSelectedGender(selected);
      await setUser({
        id: 'user_001',
        name: '',
        email: displayEmail,
        gender: selected,
        age: 28,
        weight: 0,
        height: 0,
        deviceConnected: true,
        createdAt: new Date(),
      });
      setIsLoggedIn(true);
      setOnboardingComplete(true);
      // Small delay to ensure state is committed before navigating
      setTimeout(() => {
        router.replace('/(tabs)');
      }, 100);
    }
  };

  const gradientColors: readonly [string, string, string] = isDark
    ? [colors.background, colors.surface, '#1A1A1A']
    : [colors.background, colors.surface, '#E5E5E5'];

  return (
    <LinearGradient colors={gradientColors} style={styles.container}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <View style={styles.header}>
          <ElvaLogo size={64} heartRate={72} variant="solid" style={{ marginBottom: 16 }} />
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Select your profile to personalize{'\n'}your health insights
          </Text>
        </View>

        <View style={styles.cardsContainer}>
          <GenderCard
            gender="male"
            selected={selected === 'male'}
            onSelect={() => setSelected('male')}
          />
          <GenderCard
            gender="female"
            selected={selected === 'female'}
            onSelect={() => setSelected('female')}
          />
        </View>

        <View style={styles.footer}>
          <Button
            title="Continue"
            onPress={handleContinue}
            variant="primary"
            size="large"
            fullWidth
            disabled={!selected}
          />

          <Text style={[styles.privacyNote, { color: colors.textMuted }]}>
            This helps us provide personalized health insights.{'\n'}
            You can change this anytime in settings.
          </Text>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

interface GenderCardProps {
  gender: Gender;
  selected: boolean;
  onSelect: () => void;
}

const GenderCard: React.FC<GenderCardProps> = ({ gender, selected, onSelect }) => {
  const { colors } = useTheme();
  const scale = useSharedValue(1);
  const borderOpacity = useSharedValue(0);

  useEffect(() => {
    borderOpacity.value = withTiming(selected ? 1 : 0, { duration: 200 });
  }, [selected]);

  const handlePressIn = () => {
    scale.value = withTiming(0.98, { duration: 150 });
  };

  const handlePressOut = () => {
    scale.value = withTiming(1, { duration: 150 });
  };

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const borderStyle = useAnimatedStyle(() => ({
    opacity: borderOpacity.value,
  }));

  const isMale = gender === 'male';
  const icon = isMale ? 'gender-male' : 'gender-female';
  const title = isMale ? 'Man' : 'Woman';
  const description = isMale
    ? 'Recovery tracking, muscle performance, workout optimization'
    : 'Cycle tracking, hormone insights, fertility awareness';
  const genderColor = isMale ? colors.menHealth : colors.womenHealth;

  const cardGradient: readonly [string, string] = selected
    ? [genderColor + '20', genderColor + '10']
    : [colors.surface, colors.surface];

  return (
    <AnimatedPressable
      onPress={onSelect}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[styles.genderCard, cardStyle]}
    >
      <LinearGradient colors={cardGradient} style={styles.genderCardGradient}>
        <Animated.View
          style={[styles.selectedBorder, { borderColor: genderColor }, borderStyle]}
        />

        <View style={[styles.iconContainer, { backgroundColor: genderColor + '20' }]}>
          <Icon name={icon} size={32} color={genderColor} />
        </View>

        <Text style={[styles.genderTitle, { color: colors.text }]}>{title}</Text>
        <Text style={[styles.genderDescription, { color: colors.textSecondary }]}>
          {description}
        </Text>

        {selected && (
          <View style={[styles.checkmark, { backgroundColor: genderColor }]}>
            <Icon name="check" size={16} color={colors.text} />
          </View>
        )}
      </LinearGradient>
    </AnimatedPressable>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingTop: 60,
    paddingBottom: 40,
    minHeight: height,
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: FontSizes.xxl,
    fontWeight: '600',
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: FontSizes.md,
    textAlign: 'center',
    lineHeight: 22,
  },
  cardsContainer: {
    gap: Spacing.md,
    flex: 1,
    justifyContent: 'center',
    marginVertical: Spacing.lg,
  },
  genderCard: {
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    ...Shadows.md,
  },
  genderCardGradient: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.xl,
    position: 'relative',
  },
  selectedBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderWidth: 2,
    borderRadius: BorderRadius.xl,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  genderTitle: {
    fontSize: FontSizes.xl,
    fontWeight: '600',
    marginBottom: Spacing.xs,
  },
  genderDescription: {
    fontSize: FontSizes.sm,
    lineHeight: 20,
  },
  checkmark: {
    position: 'absolute',
    top: Spacing.md,
    right: Spacing.md,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.lg,
  },
  privacyNote: {
    fontSize: FontSizes.xs,
    textAlign: 'center',
    marginTop: Spacing.md,
    lineHeight: 18,
  },
});
