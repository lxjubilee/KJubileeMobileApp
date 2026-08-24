import React, { useRef, useState } from 'react';
import {
  NativeSyntheticEvent,
  StyleSheet,
  TextInput,
  TextInputKeyPressEventData,
  View,
} from 'react-native';
import { useTheme } from '@/context';

interface OtpInputProps {
  value: string;
  onChange: (value: string) => void;
  /** Number of digit boxes. */
  length?: number;
  autoFocus?: boolean;
  /** Fired once all boxes are filled (e.g. to auto-submit). */
  onComplete?: (value: string) => void;
}

/**
 * Segmented one-time-code field: `length` separate single-digit boxes that
 * advance focus as you type, step back on backspace, and accept a pasted /
 * SMS-autofilled full code (distributed across the boxes).
 */
export const OtpInput: React.FC<OtpInputProps> = ({
  value,
  onChange,
  length = 6,
  autoFocus = true,
  onComplete,
}) => {
  const theme = useTheme();
  const inputs = useRef<Array<TextInput | null>>([]);
  const [focused, setFocused] = useState<number | null>(autoFocus ? 0 : null);

  const digits = Array.from({ length }, (_, i) => value[i] ?? '');

  const commit = (next: string) => {
    const clean = next.replace(/\D/g, '').slice(0, length);
    onChange(clean);
    if (clean.length === length) onComplete?.(clean);
    return clean;
  };

  const handleChange = (index: number, text: string) => {
    const chars = text.replace(/\D/g, '');
    if (chars.length === 0) {
      const arr = [...digits];
      arr[index] = '';
      commit(arr.join(''));
      return;
    }
    if (chars.length === 1) {
      const arr = [...digits];
      arr[index] = chars;
      commit(arr.join(''));
      if (index < length - 1) inputs.current[index + 1]?.focus();
      return;
    }
    // Paste / SMS autofill of multiple digits — distribute from this box.
    const merged = (digits.slice(0, index).join('') + chars).slice(0, length);
    const clean = commit(merged);
    const focusIdx = Math.min(clean.length, length - 1);
    inputs.current[focusIdx]?.focus();
  };

  const handleKeyPress = (
    index: number,
    e: NativeSyntheticEvent<TextInputKeyPressEventData>,
  ) => {
    if (e.nativeEvent.key === 'Backspace' && !digits[index] && index > 0) {
      const arr = [...digits];
      arr[index - 1] = '';
      onChange(arr.join(''));
      inputs.current[index - 1]?.focus();
    }
  };

  return (
    <View style={styles.row}>
      {digits.map((digit, index) => (
        <TextInput
          // eslint-disable-next-line react/no-array-index-key
          key={index}
          ref={(r) => {
            inputs.current[index] = r;
          }}
          value={digit}
          onChangeText={(t) => handleChange(index, t)}
          onKeyPress={(e) => handleKeyPress(index, e)}
          onFocus={() => setFocused(index)}
          onBlur={() => setFocused((f) => (f === index ? null : f))}
          keyboardType="number-pad"
          maxLength={length} // allow paste/autofill; single typing handled above
          autoFocus={autoFocus && index === 0}
          selectTextOnFocus
          textContentType="oneTimeCode"
          autoComplete="sms-otp"
          style={[
            styles.box,
            {
              borderColor:
                focused === index
                  ? '#FFFFFF'
                  : digit
                    ? 'rgba(255,255,255,0.6)'
                    : 'rgba(255,255,255,0.45)',
              color: theme.colors.text,
            },
          ]}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  box: {
    width: 48,
    height: 58,
    borderWidth: 1,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.04)',
    textAlign: 'center',
    fontSize: 22,
    fontWeight: '700',
  },
});
