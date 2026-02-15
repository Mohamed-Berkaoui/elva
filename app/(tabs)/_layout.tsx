import { Tabs } from 'expo-router';
import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { Icon, type IconName } from '@/components/ui/icon';
import { BlurView } from 'expo-blur';

import { HapticTab } from '@/components/haptic-tab';
import { useApp } from '@/context/app-context';
import useTheme from '@/hooks/use-theme';

export default function TabLayout() {
  const { selectedGender } = useApp();
  const { mode, colors } = useTheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.text,
        tabBarInactiveTintColor: colors.textMuted,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: {
          position: 'absolute',
          backgroundColor: Platform.OS === 'ios' ? 'transparent' : colors.surface + 'F0',
          borderTopWidth: 0,
          elevation: 0,
          height: Platform.OS === 'ios' ? 85 : 70,
          paddingBottom: Platform.OS === 'ios' ? 25 : 10,
          paddingTop: 10,
        },
        tabBarBackground: () =>
          Platform.OS === 'ios' ? (
            <BlurView
              tint={mode === 'dark' ? 'dark' : 'light'}
              intensity={80}
              style={StyleSheet.absoluteFill}
            />
          ) : null,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '500',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              name={focused ? 'home' : 'home-outline'}
              color={color}
              focused={focused}
              accentColor={colors.text}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="coach"
        options={{
          title: 'AI Coach',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              name={focused ? 'message-text' : 'message-text-outline'}
              color={color}
              focused={focused}
              accentColor={colors.text}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="activity"
        options={{
          title: 'Activity',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              name={focused ? 'timer' : 'timer-outline'}
              color={color}
              focused={focused}
              accentColor={colors.accent}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="performance"
        options={{
          title: 'Performance',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              name={focused ? 'run' : 'run'}
              color={color}
              focused={focused}
              accentColor={colors.text}
            />
          ),
        }}
      />
      {/* Gender-specific tab - only show relevant tab based on user gender */}
      <Tabs.Screen
        name="women-health"
        options={{
          title: 'Women',
          href: selectedGender === 'female' ? undefined : null,
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              name={focused ? 'gender-female' : 'gender-female'}
              color={color}
              focused={focused}
              accentColor={colors.womenHealth}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="men-health"
        options={{
          title: 'Men',
          href: selectedGender === 'male' ? undefined : null,
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              name={focused ? 'gender-male' : 'gender-male'}
              color={color}
              focused={focused}
              accentColor={colors.menHealth}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="analytics"
        options={{
          title: 'Analytics',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              name={focused ? 'chart-line' : 'chart-box-outline'}
              color={color}
              focused={focused}
              accentColor={colors.accent}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              name={focused ? 'cog' : 'cog-outline'}
              color={color}
              focused={focused}
              accentColor={colors.text}
            />
          ),
        }}
      />
      {/* Hide the old explore tab if it exists */}
      <Tabs.Screen
        name="explore"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}

interface TabIconProps {
  name: IconName;
  color: string;
  focused: boolean;
  accentColor: string;
}

const TabIcon: React.FC<TabIconProps> = ({ name, color, focused, accentColor }) => {
  return (
    <View style={styles.iconContainer}>
      <Icon name={name} size={24} color={focused ? accentColor : color} />
      {focused && <View style={[styles.focusIndicator, { backgroundColor: accentColor }]} />}
    </View>
  );
};

const styles = StyleSheet.create({
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 80,
    height: 50,
  },
  focusIndicator: {
    position: 'absolute',
    bottom: -8,
    width: 4,
    height: 4,
    borderRadius: 2,
  },
});
