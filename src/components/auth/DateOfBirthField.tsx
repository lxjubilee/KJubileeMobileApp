import React, { useEffect, useRef, useState } from 'react';
import {
  StyleSheet,
  TextInput,
  View,
  type NativeSyntheticEvent,
  type TextInputKeyPressEventData,
} from 'react-native';
import { AppText } from '@/components/common';
import { useTheme } from '@/context';
import { toIsoDate } from '@/utils';
import { AUTH_BORDER, AUTH_METRICS } from './authStyles';

interface DateOfBirthFieldProps {
  value: Date | null;
  onChange: (value: Date | null) => void;
  /** Field caption, e.g. "Date of Birth". */
  label: string;
  dayLabel: string;
  monthLabel: string;
  yearLabel: string;
}

const pad = (n: number, len: number) => String(n).padStart(len, '0');

/** Build a Date only if the three parts describe a real calendar date. */
const toDate = (day: string, month: string, year: string): Date | null => {
  if (day.length === 0 || month.length === 0 || year.length !== 4) return null;
  const d = Number(day);
  const m = Number(month);
  const y = Number(year);
  if (!d || !m || !y || m > 12 || d > 31) return null;
  const date = new Date(y, m - 1, d);
  // Date silently rolls over impossible values (2001-02-30 → 2001-03-02).
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) return null;
  return date;
};

/**
 * Date of birth as three inline numeric segments.
 *
 * This deliberately uses NO `<Modal>`. The picker it replaces mounted its Modal
 * permanently (`visible={open}`), which on the Old Architecture wedges the
 * Android UI thread and leaves the next native-stack screen looking frozen.
 * Every other modal in the app returns null when closed; having no modal at all
 * makes that class of bug structurally impossible here. It also avoids adding a
 * native date-picker dependency for a field that is optional on both steps that
 * use it, and typing "1987" beats scrolling an 88-row year wheel.
 */
export const DateOfBirthField: React.FC<DateOfBirthFieldProps> = ({
  value,
  onChange,
  label,
  dayLabel,
  monthLabel,
  yearLabel,
}) => {
  const theme = useTheme();
  const dayRef = useRef<TextInput>(null);
  const monthRef = useRef<TextInput>(null);
  const yearRef = useRef<TextInput>(null);
  const [focused, setFocused] = useState(false);

  const [day, setDay] = useState(value ? pad(value.getDate(), 2) : '');
  const [month, setMonth] = useState(value ? pad(value.getMonth() + 1, 2) : '');
  const [year, setYear] = useState(value ? String(value.getFullYear()) : '');

  // Adopt an externally-supplied date (e.g. the profile prefilled from the SSO),
  // but only when it actually differs from what the segments already show — so
  // this never fights the user's typing.
  const incoming = value ? toIsoDate(value) : '';
  useEffect(() => {
    const current = toDate(day, month, year);
    if ((current ? toIsoDate(current) : '') === incoming) return;
    if (!value) return; // clearing is driven by the segments, not from outside
    setDay(pad(value.getDate(), 2));
    setMonth(pad(value.getMonth() + 1, 2));
    setYear(String(value.getFullYear()));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incoming]);

  const emit = (d: string, m: string, y: string) => onChange(toDate(d, m, y));

  const onDay = (text: string) => {
    const v = text.replace(/\D/g, '').slice(0, 2);
    setDay(v);
    emit(v, month, year);
    if (v.length === 2) monthRef.current?.focus();
  };

  const onMonth = (text: string) => {
    const v = text.replace(/\D/g, '').slice(0, 2);
    setMonth(v);
    emit(day, v, year);
    if (v.length === 2) yearRef.current?.focus();
  };

  const onYear = (text: string) => {
    const v = text.replace(/\D/g, '').slice(0, 4);
    setYear(v);
    emit(day, month, v);
  };

  /** Backspace on an already-empty segment steps back to the previous one. */
  const backspaceTo =
    (target: React.RefObject<TextInput | null>, isEmpty: boolean) =>
    (e: NativeSyntheticEvent<TextInputKeyPressEventData>) => {
      if (e.nativeEvent.key === 'Backspace' && isEmpty) target.current?.focus();
    };

  const segment = (
    ref: React.RefObject<TextInput | null>,
    v: string,
    onChangeText: (t: string) => void,
    placeholder: string,
    maxLength: number,
    accessibilityLabel: string,
    flex: number,
    onKeyPress?: (e: NativeSyntheticEvent<TextInputKeyPressEventData>) => void,
  ) => (
    <TextInput
      ref={ref}
      value={v}
      onChangeText={onChangeText}
      onKeyPress={onKeyPress}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      placeholder={placeholder}
      placeholderTextColor={theme.colors.textMuted}
      keyboardType="number-pad"
      maxLength={maxLength}
      accessibilityLabel={accessibilityLabel}
      maxFontSizeMultiplier={1.4}
      style={[styles.segment, { flex, color: theme.colors.text }]}
    />
  );

  return (
    <View>
      <AppText variant="caption" color="textMuted" style={styles.label}>
        {label}
      </AppText>
      <View
        style={[styles.box, { borderColor: focused ? AUTH_BORDER.focused : AUTH_BORDER.idle }]}
      >
        {segment(dayRef, day, onDay, 'DD', 2, dayLabel, 1)}
        <AppText style={styles.sep}>/</AppText>
        {segment(monthRef, month, onMonth, 'MM', 2, monthLabel, 1, backspaceTo(dayRef, month.length === 0))}
        <AppText style={styles.sep}>/</AppText>
        {segment(yearRef, year, onYear, 'YYYY', 4, yearLabel, 1.6, backspaceTo(monthRef, year.length === 0))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  label: { marginBottom: 6 },
  box: {
    minHeight: AUTH_METRICS.fieldHeight,
    borderWidth: 1,
    borderRadius: AUTH_METRICS.radius,
    paddingHorizontal: 16,
    backgroundColor: AUTH_BORDER.fill,
    flexDirection: 'row',
    alignItems: 'center',
  },
  segment: {
    minHeight: AUTH_METRICS.fieldHeight,
    fontSize: AUTH_METRICS.fieldFontSize,
    paddingVertical: 0,
    textAlign: 'center',
  },
  sep: { color: 'rgba(255,255,255,0.35)', fontSize: AUTH_METRICS.fieldFontSize },
});
