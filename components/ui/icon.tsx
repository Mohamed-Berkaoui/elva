/**
 * ELVA SVG Icon Component
 * Uses @mdi/js for SVG path data rendered via react-native-svg.
 * Works on web without font loading — pure SVG.
 *
 * Drop-in replacement for MaterialCommunityIcons:
 *   <Icon name="home" size={24} color="#000" />
 */

import React from 'react';
import Svg, { Path } from 'react-native-svg';
import {
  mdiAccount,
  mdiAlert,
  mdiAlertCircle,
  mdiArrowLeft,
  mdiArrowUp,
  mdiBattery50,
  mdiBeakerOutline,
  mdiBedOutline,
  mdiBell,
  mdiBike,
  mdiBoxingGlove,
  mdiBasketball,
  mdiChartBoxOutline,
  mdiChartLine,
  mdiChartLineVariant,
  mdiCheck,
  mdiCheckCircle,
  mdiChevronLeft,
  mdiChevronRight,
  mdiClock,
  mdiClockOutline,
  mdiClose,
  mdiCloseCircle,
  mdiCloudOutline,
  mdiCog,
  mdiCogOutline,
  mdiDelete,
  mdiDotsHorizontal,
  mdiDumbbell,
  mdiFire,
  mdiFlash,
  mdiFlashOutline,
  mdiGenderFemale,
  mdiGenderMale,
  mdiHeart,
  mdiHeartOutline,
  mdiHeartPulse,
  mdiHelp,
  mdiHome,
  mdiHomeOutline,
  mdiHuman,
  mdiInformation,
  mdiLeaf,
  mdiLightbulb,
  mdiLungs,
  mdiMessageText,
  mdiMessageTextOutline,
  mdiMinus,
  mdiMinusCircle,
  mdiMoonWaningCrescent,
  mdiNutrition,
  mdiPalette,
  mdiPauseCircleOutline,
  mdiPlay,
  mdiPlayCircleOutline,
  mdiPlus,
  mdiPlusCircleOutline,
  mdiPulse,
  mdiRadioboxMarked,
  mdiRefresh,
  mdiResize,
  mdiRun,
  mdiSend,
  mdiServer,
  mdiSoccer,
  mdiShieldCheckOutline,
  mdiShimmer,
  mdiSpeedometer,
  mdiStop,
  mdiStopCircleOutline,
  mdiSwapVertical,
  mdiSync,
  mdiThermometer,
  mdiTimer,
  mdiTimerOutline,
  mdiTrendingDown,
  mdiTrendingUp,
  mdiWalk,
  mdiWatch,
  mdiWater,
  mdiWaterOutline,
  mdiWeatherSunny,
} from '@mdi/js';

// Map kebab-case icon names → @mdi/js SVG path strings
const ICON_MAP: Record<string, string> = {
  'account': mdiAccount,
  'alert': mdiAlert,
  'alert-circle': mdiAlertCircle,
  'arrow-left': mdiArrowLeft,
  'arrow-up': mdiArrowUp,
  'battery-50': mdiBattery50,
  'beaker-outline': mdiBeakerOutline,
  'bed-outline': mdiBedOutline,
  'bell': mdiBell,
  'bike': mdiBike,
  'boxing-glove': mdiBoxingGlove,
  'basketball': mdiBasketball,
  'chart-box-outline': mdiChartBoxOutline,
  'chart-line': mdiChartLine,
  'chart-line-variant': mdiChartLineVariant,
  'check': mdiCheck,
  'check-circle': mdiCheckCircle,
  'chevron-left': mdiChevronLeft,
  'chevron-right': mdiChevronRight,
  'clock': mdiClock,
  'clock-outline': mdiClockOutline,
  'close': mdiClose,
  'close-circle': mdiCloseCircle,
  'cloud-outline': mdiCloudOutline,
  'cog': mdiCog,
  'cog-outline': mdiCogOutline,
  'delete': mdiDelete,
  'dots-horizontal': mdiDotsHorizontal,
  'dumbbell': mdiDumbbell,
  'fire': mdiFire,
  'flash': mdiFlash,
  'flash-outline': mdiFlashOutline,
  'gender-female': mdiGenderFemale,
  'gender-male': mdiGenderMale,
  'heart': mdiHeart,
  'heart-outline': mdiHeartOutline,
  'heart-pulse': mdiHeartPulse,
  'help': mdiHelp,
  'home': mdiHome,
  'home-outline': mdiHomeOutline,
  'human': mdiHuman,
  'information': mdiInformation,
  'leaf': mdiLeaf,
  'lightbulb': mdiLightbulb,
  'lungs': mdiLungs,
  'message-text': mdiMessageText,
  'message-text-outline': mdiMessageTextOutline,
  'minus': mdiMinus,
  'minus-circle': mdiMinusCircle,
  'moon-waning-crescent': mdiMoonWaningCrescent,
  'nutrition': mdiNutrition,
  'palette': mdiPalette,
  'pause-circle-outline': mdiPauseCircleOutline,
  'play': mdiPlay,
  'play-circle-outline': mdiPlayCircleOutline,
  'plus': mdiPlus,
  'plus-circle-outline': mdiPlusCircleOutline,
  'pulse': mdiPulse,
  'radiobox-marked': mdiRadioboxMarked,
  'refresh': mdiRefresh,
  'resize': mdiResize,
  'run': mdiRun,
  'send': mdiSend,
  'server': mdiServer,
  'soccer': mdiSoccer,
  'shield-check-outline': mdiShieldCheckOutline,
  'shimmer': mdiShimmer,
  'speedometer': mdiSpeedometer,
  'stop': mdiStop,
  'stop-circle-outline': mdiStopCircleOutline,
  'swap-vertical': mdiSwapVertical,
  'sync': mdiSync,
  'thermometer': mdiThermometer,
  'timer': mdiTimer,
  'timer-outline': mdiTimerOutline,
  'trending-down': mdiTrendingDown,
  'trending-up': mdiTrendingUp,
  'walk': mdiWalk,
  'watch': mdiWatch,
  'water': mdiWater,
  'water-outline': mdiWaterOutline,
  'weather-sunny': mdiWeatherSunny,
};

/** All supported icon names */
export type IconName = keyof typeof ICON_MAP;

interface IconProps {
  name: string;
  size?: number;
  color?: string;
  style?: any;
}

/**
 * SVG icon component — drop-in replacement for MaterialCommunityIcons.
 * Renders pure SVG via react-native-svg, works perfectly on web.
 */
export function Icon({ name, size = 24, color = '#000', style }: IconProps) {
  const pathData = ICON_MAP[name];

  if (!pathData) {
    // Fallback: render a small circle for unknown icons
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" style={style}>
        <Path d={mdiHelp} fill={color} />
      </Svg>
    );
  }

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" style={style}>
      <Path d={pathData} fill={color} />
    </Svg>
  );
}

export default Icon;
