import React, { forwardRef, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context';
import { AUTH_BORDER, AUTH_METRICS } from './authStyles';

interface AuthTextFieldProps extends Omit<TextInputProps, 'style' | 'secureTextEntry'> {
  /** Renders a trailing show/hide eye and masks the value. */
  secure?: boolean;
  /** Non-editable presentation (the pre-filled email on the create-account step). */
  readOnly?: boolean;
  /** Accessible names for the eye toggle, in the caller's language. */
  showPasswordLabel?: string;
  hidePasswordLabel?: string;
  containerStyle?: StyleProp<ViewStyle>;
}

/**
 * The auth text field: 56pt box, 1pt border that brightens on focus, optional
 * password eye. Extracted from the identical `input` styles + `borderFor()`
 * helpers that each auth screen re-declared.
 *
 * `minHeight` rather than `height` so the box grows with large dynamic type
 * instead of clipping the text.
 */
export const AuthTextField = forwardRef<TextInput, AuthTextFieldProps>(
  (
    {
      secure = false,
      readOnly = false,
      showPasswordLabel,
      hidePasswordLabel,
      containerStyle,
      onFocus,
      onBlur,
      ...rest
    },
    ref,
  ) => {
    const theme = useTheme();
    const [focused, setFocused] = useState(false);
    const [revealed, setRevealed] = useState(false);

    return (
      <View
        style={[
          styles.container,
          { borderColor: focused ? AUTH_BORDER.focused : AUTH_BORDER.idle },
          readOnly && styles.readOnly,
          containerStyle,
        ]}
      >
        <TextInput
          ref={ref}
          {...rest}
          editable={!readOnly}
          secureTextEntry={secure && !revealed}
          autoCorrect={rest.autoCorrect ?? false}
          placeholderTextColor={rest.placeholderTextColor ?? theme.colors.textMuted}
          maxFontSizeMultiplier={1.4}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          style={[styles.input, { color: theme.colors.text }]}
        />
        {secure ? (
          <Pressable
            onPress={() => setRevealed((v) => !v)}
            hitSlop={10}
            style={styles.eye}
            accessibilityRole="button"
            accessibilityLabel={revealed ? hidePasswordLabel : showPasswordLabel}
            accessibilityState={{ expanded: revealed }}
          >
            {/* Constant literal size — a size-0 glyph throws on render. */}
            <Ionicons
              name={revealed ? 'eye-off-outline' : 'eye-outline'}
              size={22}
              color={theme.colors.textMuted}
            />
          </Pressable>
        ) : null}
      </View>
    );
  },
);

AuthTextField.displayName = 'AuthTextField';

const styles = StyleSheet.create({
  container: {
    minHeight: AUTH_METRICS.fieldHeight,
    borderWidth: 1,
    borderRadius: AUTH_METRICS.radius,
    paddingHorizontal: 16,
    backgroundColor: AUTH_BORDER.fill,
    flexDirection: 'row',
    alignItems: 'center',
  },
  readOnly: { opacity: 0.7 },
  input: {
    flex: 1,
    minHeight: AUTH_METRICS.fieldHeight,
    fontSize: AUTH_METRICS.fieldFontSize,
    paddingVertical: 0,
  },
  eye: { paddingLeft: 12 },
});
