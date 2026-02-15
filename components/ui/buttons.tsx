import React from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import useTheme from '@/hooks/use-theme';
import { BorderRadius, Spacing, FontSizes } from '@/constants/theme';

// ===========================================
// Button Component
// ===========================================

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  icon,
  fullWidth = false,
}) => {
  const { colors } = useTheme();

  const sizeStyles = {
    small: { paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md },
    medium: { paddingVertical: Spacing.md, paddingHorizontal: Spacing.lg },
    large: { paddingVertical: Spacing.lg, paddingHorizontal: Spacing.xl },
  };

  const textSizes = {
    small: FontSizes.sm,
    medium: FontSizes.md,
    large: FontSizes.lg,
  };

  const getButtonStyle = () => {
    switch (variant) {
      case 'secondary':
        return { backgroundColor: colors.buttonSecondary };
      case 'outline':
        return { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.border };
      default:
        return { backgroundColor: colors.buttonPrimary };
    }
  };

  const getTextColor = () => {
    switch (variant) {
      case 'primary':
        return colors.buttonPrimaryText;
      case 'secondary':
        return colors.buttonSecondaryText;
      case 'outline':
        return colors.text;
      default:
        return colors.buttonPrimaryText;
    }
  };

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        styles.button,
        sizeStyles[size],
        getButtonStyle(),
        fullWidth && styles.fullWidth,
        disabled && styles.disabledButton,
      ]}
    >
      <View style={styles.buttonContent}>
        {loading ? (
          <ActivityIndicator color={getTextColor()} />
        ) : (
          <>
            {icon && <View style={styles.buttonIcon}>{icon}</View>}
            <Text style={[styles.buttonText, { fontSize: textSizes[size], color: getTextColor() }]}>
              {title}
            </Text>
          </>
        )}
      </View>
    </Pressable>
  );
};

// ===========================================
// Icon Button Component
// ===========================================

interface IconButtonProps {
  icon: React.ReactNode;
  onPress: () => void;
  size?: number;
  backgroundColor?: string;
}

export const IconButton: React.FC<IconButtonProps> = ({ icon, onPress, size = 44, backgroundColor }) => {
  const { colors } = useTheme();
  const bgColor = backgroundColor ?? colors.surface;

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.iconButton,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: bgColor,
        },
      ]}
    >
      {icon}
    </Pressable>
  );
};

// ===========================================
// Toggle Button Component
// ===========================================

interface ToggleButtonProps {
  isActive: boolean;
  onToggle: () => void;
  label?: string;
  activeColor?: string;
}

export const ToggleButton: React.FC<ToggleButtonProps> = ({ isActive, onToggle, label, activeColor }) => {
  const { colors } = useTheme();
  const toggleActiveColor = activeColor ?? colors.success;

  return (
    <View style={styles.toggleContainer}>
      {label && <Text style={[styles.toggleLabel, { color: colors.text }]}>{label}</Text>}
      <Pressable
        onPress={onToggle}
        style={[
          styles.toggleTrack,
          { backgroundColor: isActive ? toggleActiveColor + '40' : colors.surface },
        ]}
      >
        <View
          style={[
            styles.toggleThumb,
            {
              backgroundColor: isActive ? toggleActiveColor : colors.textMuted,
              marginLeft: isActive ? 20 : 0,
            },
          ]}
        />
      </Pressable>
    </View>
  );
};

// ===========================================
// Styles (no colors - all colors are inline)
// ===========================================

const styles = StyleSheet.create({
  button: {
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonIcon: {
    marginRight: Spacing.sm,
  },
  buttonText: {
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.5,
  },
  fullWidth: {
    width: '100%',
  },
  iconButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleLabel: {
    fontSize: FontSizes.md,
    marginRight: Spacing.md,
  },
  toggleTrack: {
    width: 50,
    height: 30,
    borderRadius: 15,
    padding: 2,
    justifyContent: 'center',
  },
  toggleThumb: {
    width: 26,
    height: 26,
    borderRadius: 13,
  },
});
