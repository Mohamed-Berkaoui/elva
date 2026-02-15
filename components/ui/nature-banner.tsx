/**
 * ELVA Nature Banner
 * Compact, rounded image card used at the top of pages.
 * Replaces the full-page washed-out background approach.
 *
 * Usage:
 *   <NatureBanner image="sunset" title="Sleep Tracking" subtitle="Rest & Recovery" />
 */

import React from 'react';
import { StyleSheet, View, Text, ImageBackground } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BorderRadius, FontSizes, Spacing } from '@/constants/theme';

// Nature photos from assets
const IMG_SUNSET = require('@/assets/images/sun set(down) with rever and some trees.jpeg');
const IMG_GREEN_MOUNTAINS = require('@/assets/images/green mountens .jpeg');
const IMG_WHITE_MOUNTAIN = require('@/assets/images/white mounten with blue sky.jpeg');
const IMG_RED_SKY = require('@/assets/images/green mountens  but with like red sky.jpeg');
const IMG_MIST = require('@/assets/images/IMG_5588.jpeg');
const IMG_SUN = require('@/assets/images/IMG_5589.jpeg');

export type BannerImage = 'sunset' | 'green-mountains' | 'white-mountain' | 'red-sky' | 'mist' | 'sun';

const BANNER_MAP: Record<BannerImage, any> = {
  sunset: IMG_SUNSET,
  'green-mountains': IMG_GREEN_MOUNTAINS,
  'white-mountain': IMG_WHITE_MOUNTAIN,
  'red-sky': IMG_RED_SKY,
  mist: IMG_MIST,
  sun: IMG_SUN,
};

interface NatureBannerProps {
  image: BannerImage;
  title?: string;
  subtitle?: string;
  /** Height of the banner, default 140 */
  height?: number;
  children?: React.ReactNode;
}

export function NatureBanner({
  image,
  title,
  subtitle,
  height = 140,
  children,
}: NatureBannerProps) {
  const source = BANNER_MAP[image];

  return (
    <View style={[styles.container, { height }]}>
      <ImageBackground
        source={source}
        style={styles.image}
        imageStyle={styles.imageInner}
        resizeMode="cover"
      >
        <LinearGradient
          colors={['rgba(0,0,0,0.10)', 'rgba(0,0,0,0.45)']}
          style={styles.overlay}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
        >
          {children ? (
            children
          ) : (
            <View style={styles.textContainer}>
              {title && <Text style={styles.title}>{title}</Text>}
              {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
            </View>
          )}
        </LinearGradient>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    marginBottom: Spacing.md,
  },
  image: {
    flex: 1,
    width: '100%',
  },
  imageInner: {
    borderRadius: BorderRadius.xl,
  },
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: Spacing.lg,
    borderRadius: BorderRadius.xl,
  },
  textContainer: {
    gap: 2,
  },
  title: {
    color: '#FFFFFF',
    fontSize: FontSizes.lg,
    fontWeight: '700',
    letterSpacing: -0.3,
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: FontSizes.sm,
    fontWeight: '400',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});
