/**
 * ELVA Theme Hook
 * Simple, clean theme management with React state
 */

import { useEffect, useState, useCallback } from 'react';
import { useColorScheme as useSystemColorScheme } from 'react-native';
import { useApp } from '@/context/app-context';
import { 
  getTheme, 
  setTheme as setGlobalTheme, 
  type ThemeMode, 
  type ThemeColors 
} from '@/constants/theme';

export interface UseThemeReturn {
  // Current theme mode
  mode: ThemeMode;
  // All theme colors
  colors: ThemeColors;
  // Convenience booleans
  isDark: boolean;
  isLight: boolean;
  // Theme setters
  setMode: (mode: ThemeMode | 'auto') => void;
  toggle: () => void;
}

export const useTheme = (): UseThemeReturn => {
  const { settings, updateSettings } = useApp();
  const systemScheme = useSystemColorScheme();
  
  // Resolve effective theme mode
  const resolveMode = useCallback((): ThemeMode => {
    if (settings.theme === 'auto') {
      return systemScheme === 'light' ? 'light' : 'dark';
    }
    return settings.theme as ThemeMode;
  }, [settings.theme, systemScheme]);
  
  const [mode, setModeState] = useState<ThemeMode>(resolveMode());
  const [colors, setColors] = useState<ThemeColors>(getTheme(mode));
  
  // Update when settings or system theme changes
  useEffect(() => {
    const newMode = resolveMode();
    setModeState(newMode);
    setGlobalTheme(newMode);
    setColors(getTheme(newMode));
  }, [resolveMode]);
  
  // Set theme mode
  const setMode = useCallback((newMode: ThemeMode | 'auto') => {
    updateSettings({ theme: newMode });
  }, [updateSettings]);
  
  // Toggle between light and dark
  const toggle = useCallback(() => {
    const newMode = mode === 'dark' ? 'light' : 'dark';
    updateSettings({ theme: newMode });
  }, [mode, updateSettings]);
  
  return {
    mode,
    colors,
    isDark: mode === 'dark',
    isLight: mode === 'light',
    setMode,
    toggle,
  };
};

export default useTheme;
