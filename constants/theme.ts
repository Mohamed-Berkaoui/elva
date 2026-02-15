/**
 * ELVA App Theme Configuration
 * Clean, simple theme system with dark mode (PRD default) and light mode
 */

import { Platform } from 'react-native';

// ============================================
// THEME TYPES
// ============================================
export type ThemeMode = 'light' | 'dark';

export interface ThemeColors {
  // Backgrounds
  background: string;
  surface: string;
  surfaceSecondary: string;
  
  // Text
  text: string;
  textSecondary: string;
  textMuted: string;
  
  // UI Elements
  border: string;
  divider: string;
  accent: string;
  
  // Buttons
  buttonPrimary: string;
  buttonPrimaryText: string;
  buttonSecondary: string;
  buttonSecondaryText: string;
  
  // Status
  success: string;
  warning: string;
  error: string;
  info: string;
  
  // Health metrics (consistent across themes)
  heartRate: string;
  sleep: string;
  steps: string;
  oxygen: string;
  hrv: string;
  calories: string;
  recovery: string;
  stress: string;
  muscleOxygen: string;
  womenHealth: string;
  menHealth: string;
  physicalRecovery: string;
  mentalRecovery: string;
  stressMonitor: string;
  healthSpan: string;
}

// ============================================
// DARK THEME (PRD Default - Nature Grounded)
// ============================================
const darkTheme: ThemeColors = {
  // Backgrounds - Deep charcoal/black
  background: '#000000',
  surface: '#1A1A1A',
  surfaceSecondary: '#2A2A2A',
  
  // Text - High contrast white
  text: '#FFFFFF',
  textSecondary: '#B0B0B0',
  textMuted: '#707070',
  
  // UI Elements
  border: '#333333',
  divider: '#2A2A2A',
  accent: '#64B5F6',
  
  // Buttons
  buttonPrimary: '#FFFFFF',
  buttonPrimaryText: '#000000',
  buttonSecondary: '#2A2A2A',
  buttonSecondaryText: '#FFFFFF',
  
  // Status
  success: '#4CAF50',
  warning: '#FF9800',
  error: '#F44336',
  info: '#64B5F6',
  
  // Health metrics
  heartRate: '#EF5350',
  sleep: '#7E57C2',
  steps: '#26C6DA',
  oxygen: '#42A5F5',
  hrv: '#FFA726',
  calories: '#FF7043',
  recovery: '#66BB6A',
  stress: '#EC407A',
  muscleOxygen: '#81C784',
  womenHealth: '#F06292',
  menHealth: '#64B5F6',
  physicalRecovery: '#4DB6AC',
  mentalRecovery: '#9575CD',
  stressMonitor: '#EC407A',
  healthSpan: '#AED581',
};

// ============================================
// LIGHT THEME (Clean, Accessible)
// ============================================
const lightTheme: ThemeColors = {
  // Backgrounds - Clean white/grey
  background: '#F5F5F5',
  surface: '#FFFFFF',
  surfaceSecondary: '#EEEEEE',
  
  // Text - High contrast dark
  text: '#1A1A1A',
  textSecondary: '#666666',
  textMuted: '#999999',
  
  // UI Elements
  border: '#E0E0E0',
  divider: '#EEEEEE',
  accent: '#2196F3',
  
  // Buttons
  buttonPrimary: '#1A1A1A',
  buttonPrimaryText: '#FFFFFF',
  buttonSecondary: '#EEEEEE',
  buttonSecondaryText: '#1A1A1A',
  
  // Status (same as dark for consistency)
  success: '#4CAF50',
  warning: '#FF9800',
  error: '#F44336',
  info: '#2196F3',
  
  // Health metrics (same as dark)
  heartRate: '#EF5350',
  sleep: '#7E57C2',
  steps: '#26C6DA',
  oxygen: '#42A5F5',
  hrv: '#FFA726',
  calories: '#FF7043',
  recovery: '#66BB6A',
  stress: '#EC407A',
  muscleOxygen: '#81C784',
  womenHealth: '#F06292',
  menHealth: '#64B5F6',
  physicalRecovery: '#4DB6AC',
  mentalRecovery: '#9575CD',
  stressMonitor: '#EC407A',
  healthSpan: '#AED581',
};

// ============================================
// THEME MANAGEMENT
// ============================================
let currentTheme: ThemeMode = 'light';

export const getTheme = (mode: ThemeMode = currentTheme): ThemeColors => {
  return mode === 'light' ? lightTheme : darkTheme;
};

export const setTheme = (mode: ThemeMode) => {
  currentTheme = mode;
};

export const getCurrentTheme = (): ThemeMode => currentTheme;

// ============================================
// LEGACY SUPPORT - ElvaColors
// Maps old color names to new theme colors
// ============================================
const createElvaColorsProxy = () => {
  const handler = {
    get(_: any, prop: string): string {
      const theme = getTheme(currentTheme);
      
      // Map old names to new theme colors
      const mapping: Record<string, keyof ThemeColors | string> = {
        // Backgrounds
        background: 'background',
        backgroundLight: 'background',
        deepCharcoal: 'background',
        trueBlack: 'background',
        charcoalMedium: 'surface',
        charcoalLight: 'surfaceSecondary',
        card: 'surface',
        cardLight: 'surfaceSecondary',
        greyDark: 'border',
        greyMedium: 'textMuted',
        
        // Text
        textPrimary: 'text',
        textSecondary: 'textSecondary',
        textMuted: 'textMuted',
        
        // Accent (legacy) -> use button colors
        accent: 'buttonPrimary',
        accentDim: 'textMuted',
        
        // Direct mappings
        success: 'success',
        warning: 'warning',
        error: 'error',
        info: 'info',
        heartRate: 'heartRate',
        sleep: 'sleep',
        steps: 'steps',
        oxygen: 'oxygen',
        hrv: 'hrv',
        calories: 'calories',
        recovery: 'recovery',
        stress: 'stress',
        muscleOxygen: 'muscleOxygen',
        womenHealth: 'womenHealth',
        menHealth: 'menHealth',
      };
      
      const mappedProp = mapping[prop];
      if (mappedProp && mappedProp in theme) {
        return theme[mappedProp as keyof ThemeColors];
      }
      
      // Fallback for unmapped properties
      if (prop in theme) {
        return theme[prop as keyof ThemeColors];
      }
      
      return '#FF00FF'; // Magenta for debugging unmapped colors
    }
  };
  
  return new Proxy({} as any, handler);
};

export const ElvaColors = createElvaColorsProxy();

// ============================================
// EXPO ROUTER COLORS
// ============================================
export const Colors = {
  light: {
    text: lightTheme.text,
    background: lightTheme.background,
    tint: lightTheme.buttonPrimary,
    icon: lightTheme.textMuted,
    tabIconDefault: lightTheme.textMuted,
    tabIconSelected: lightTheme.text,
  },
  dark: {
    text: darkTheme.text,
    background: darkTheme.background,
    tint: darkTheme.buttonPrimary,
    icon: darkTheme.textMuted,
    tabIconDefault: darkTheme.textMuted,
    tabIconSelected: darkTheme.text,
  },
};

// ============================================
// SPACING & SIZING
// ============================================
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const BorderRadius = {
  sm: 8,
  md: 12,
  lg: 20,
  xl: 24,
  full: 9999,
};

export const FontSizes = {
  xs: 10,
  sm: 12,
  md: 14,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  hero: 48,
};

// ============================================
// LOGO SIZING
// ============================================
/** Standard header logo height (full ELVA wordmark) */
export const LogoSize = {
  header: 44,
};

// ============================================
// FONTS
// ============================================
export const Fonts = Platform.select({
  ios: {
    sans: 'System',
    mono: 'Menlo',
  },
  android: {
    sans: 'Roboto',
    mono: 'monospace',
  },
  default: {
    sans: 'System',
    mono: 'monospace',
  },
});

// ============================================
// SHADOWS
// ============================================
export const Shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
};

// Re-export theme types for use in components
export { darkTheme, lightTheme };
