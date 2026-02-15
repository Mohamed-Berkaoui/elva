/**
 * NatureHeader – Nature photo banner at top of detail pages.
 * Different soothing image per category (sleep, sport, readiness, performance)
 * with gradient overlay and back button. ~25% of screen.
 */

import React from 'react';
import { View, Text, StyleSheet, ImageBackground, Pressable, Dimensions } from 'react-native';
import { Icon, type IconName } from '@/components/ui/icon';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Spacing, FontSizes } from '@/constants/theme';

const { width, height: screenHeight } = Dimensions.get('window');
const HEADER_HEIGHT = Math.round(screenHeight * 0.25);

const IMAGE_MIST = require('@/assets/images/IMG_5588.jpeg');
const IMAGE_SUN = require('@/assets/images/IMG_5589.jpeg');
const IMAGE_SUNSET = require('@/assets/images/sun set(down) with rever and some trees.jpeg');
const IMAGE_GREEN = require('@/assets/images/green mountens .jpeg');
const IMAGE_WHITE = require('@/assets/images/white mounten with blue sky.jpeg');
const IMAGE_RED = require('@/assets/images/green mountens  but with like red sky.jpeg');
const IMAGE_RECOVERY = require('@/assets/images/greeen impass.jpeg');

export type NatureHeaderVariant = 'calm' | 'active' | 'sleep' | 'sport' | 'readiness' | 'recovery' | 'performance';

const VARIANT_IMAGES: Record<NatureHeaderVariant, any> = {
  calm: IMAGE_MIST,
  active: IMAGE_SUN,
  sleep: IMAGE_SUNSET,
  sport: IMAGE_GREEN,
  readiness: IMAGE_WHITE,
  recovery: IMAGE_RECOVERY,
  performance: IMAGE_RED,
};

interface NatureHeaderProps {
  title: string;
  subtitle?: string;
  variant?: NatureHeaderVariant;
  icon?: IconName;
}

export function NatureHeader({ title, subtitle, variant = 'calm', icon }: NatureHeaderProps) {
  const insets = useSafeAreaInsets();
  const image = VARIANT_IMAGES[variant] || IMAGE_MIST;

  return (
    <ImageBackground source={image} style={styles.container} resizeMode="cover">
      <LinearGradient
        colors={['rgba(0,0,0,0.10)', 'rgba(0,0,0,0.50)', 'rgba(0,0,0,0.85)']}
        style={styles.gradient}
      >
        {/* Back button */}
        <Pressable
          onPress={() => router.back()}
          style={[styles.backBtn, { top: insets.top + 8 }]}
          hitSlop={12}
        >
          <Icon name="chevron-left" size={26} color="#fff" />
        </Pressable>

        {/* Title area at bottom of image */}
        <View style={styles.titleArea}>
          {icon && (
            <View style={styles.iconBubble}>
              <Icon name={icon} size={24} color="#fff" />
            </View>
          )}
          <Text style={styles.title}>{title}</Text>
          {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        </View>
      </LinearGradient>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    width,
    height: HEADER_HEIGHT,
  },
  gradient: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backBtn: {
    position: 'absolute',
    left: Spacing.md,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleArea: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
  },
  iconBubble: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: '300',
    color: '#fff',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: FontSizes.sm,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 4,
  },
});
