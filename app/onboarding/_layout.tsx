import { Stack } from 'expo-router';
import useTheme from '@/hooks/use-theme';

export default function OnboardingLayout() {
  const { colors } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="name-input" />
      <Stack.Screen name="gender-select" />
      <Stack.Screen name="no-device" />
    </Stack>
  );
}
