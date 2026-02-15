import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import 'react-native-reanimated';

import { AppProvider } from '@/context/app-context';
import { FloatingTracker } from '@/components/ui/floating-tracker';
import useTheme from '@/hooks/use-theme';
import { darkTheme, lightTheme } from '@/constants/theme';

SplashScreen.preventAutoHideAsync();

export const unstable_settings = {
  anchor: '(tabs)',
};

function RootLayoutContent() {
  const { colors, isDark } = useTheme();

  // Build React Navigation theme from ELVA theme colors
  const navigationTheme = {
    ...(isDark ? DarkTheme : DefaultTheme),
    colors: {
      ...(isDark ? DarkTheme.colors : DefaultTheme.colors),
      primary: colors.accent,
      background: colors.background,
      card: colors.surface,
      text: colors.text,
      border: colors.border,
      notification: colors.success,
    },
  };

  return (
    <ThemeProvider value={navigationTheme}>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
          animation: 'fade',
          animationDuration: 250,
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="details" />
        <Stack.Screen
          name="modal"
          options={{
            presentation: 'modal',
            title: 'Modal',
            animation: 'fade',
            animationDuration: 200,
          }}
        />
      </Stack>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <FloatingTracker />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  SplashScreen.hideAsync();

  return (
    <AppProvider>
      <RootLayoutContent />
    </AppProvider>
  );
}
