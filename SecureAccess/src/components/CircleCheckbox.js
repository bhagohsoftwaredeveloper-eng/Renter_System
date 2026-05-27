import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

/**
 * Circular checkbox with checked / unchecked / indeterminate states.
 * Drop-in alternative to react-native-paper's (square) Checkbox.
 */
export const CircleCheckbox = ({
  status = 'unchecked',
  onPress,
  disabled = false,
  size = 22,
  color = colors.primary,
  uncheckedColor = colors.slate400,
  style,
}) => {
  const checked = status === 'checked';
  const indeterminate = status === 'indeterminate';
  const active = checked || indeterminate;

  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
      hitSlop={8}
      style={({ pressed }) => [
        styles.circle,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderColor: active ? color : uncheckedColor,
          backgroundColor: active ? color : 'transparent',
          opacity: disabled ? 0.5 : pressed ? 0.7 : 1,
        },
        style,
      ]}
    >
      {checked && <MaterialCommunityIcons name="check" size={size - 8} color={colors.white} />}
      {indeterminate && <MaterialCommunityIcons name="minus" size={size - 4} color={colors.white} />}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  circle: {
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
