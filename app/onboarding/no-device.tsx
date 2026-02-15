import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  StatusBar,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Icon, type IconName } from '@/components/ui/icon';
import { Button } from '@/components/ui/buttons';
import useTheme from '@/hooks/use-theme';
import { FontSizes, Spacing, BorderRadius } from '@/constants/theme';

const { width, height } = Dimensions.get('window');

export default function NoDeviceScreen() {
  const { colors, isDark } = useTheme();
  const contentOpacity = useSharedValue(0);
  const contentTranslateY = useSharedValue(30);

  useEffect(() => {
    contentOpacity.value = withDelay(200, withTiming(1, { duration: 500 }));
    contentTranslateY.value = withDelay(200, withTiming(0, { duration: 500 }));
  }, []);

  const contentStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
    transform: [{ translateY: contentTranslateY.value }],
  }));

  const handleLearnMore = () => {
    router.back();
  };

  const handleBack = () => {
    router.back();
  };

  const gradientColors: readonly [string, string, string] = isDark
    ? [colors.background, colors.surface, '#1A1A1A']
    : [colors.background, colors.surface, '#E5E5E5'];

  return (
    <LinearGradient colors={gradientColors} style={styles.container}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      <Animated.View style={[styles.content, contentStyle]}>
        <View style={[styles.iconContainer, { backgroundColor: colors.surface, borderColor: colors.accent + '30' }]}>
          <Icon name="watch" size={64} color={colors.accent} />
        </View>

        <Text style={[styles.title, { color: colors.text }]}>ELVA Wearable</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Experience the future of{'\n'}personal health monitoring
        </Text>

        <View style={styles.featuresContainer}>
          <FeatureItem
            icon="heart-outline"
            title="24/7 Health Tracking"
            description="Heart rate, HRV, blood oxygen, and more"
          />
          <FeatureItem
            icon="moon-waning-crescent"
            title="Advanced Sleep Analysis"
            description="Deep insights into your rest and recovery"
          />
          <FeatureItem
            icon="chart-line"
            title="AI-Powered Insights"
            description="Personalized recommendations based on your data"
          />
          <FeatureItem
            icon="sync"
            title="Real-time Sync"
            description="Seamless connection with the ELVA app"
          />
        </View>

        <View style={styles.buttonsContainer}>
          <Button
            title="Learn More About ELVA"
            onPress={handleLearnMore}
            variant="primary"
            size="large"
            fullWidth
          />
          <View style={styles.buttonSpacer} />
          <Button
            title="Go Back"
            onPress={handleBack}
            variant="outline"
            size="medium"
          />
        </View>
      </Animated.View>
    </LinearGradient>
  );
}

interface FeatureItemProps {
  icon: IconName;
  title: string;
  description: string;
}

const FeatureItem: React.FC<FeatureItemProps> = ({ icon, title, description }) => {
  const { colors } = useTheme();

  return (
    <View style={[styles.featureItem, { backgroundColor: colors.surface }]}>
      <View style={[styles.featureIcon, { backgroundColor: colors.accent + '15' }]}>
        <Icon name={icon} size={24} color={colors.accent} />
      </View>
      <View style={styles.featureText}>
        <Text style={[styles.featureTitle, { color: colors.text }]}>{title}</Text>
        <Text style={[styles.featureDescription, { color: colors.textSecondary }]}>
          {description}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.xl,
    paddingTop: 80,
    alignItems: 'center',
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
    borderWidth: 2,
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
    marginBottom: Spacing.xl,
  },
  featuresContainer: {
    width: '100%',
    marginBottom: Spacing.xl,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    marginBottom: 2,
  },
  featureDescription: {
    fontSize: FontSizes.sm,
  },
  buttonsContainer: {
    position: 'absolute',
    bottom: Spacing.xxl,
    left: Spacing.xl,
    right: Spacing.xl,
    alignItems: 'center',
  },
  buttonSpacer: {
    height: Spacing.md,
  },
});
