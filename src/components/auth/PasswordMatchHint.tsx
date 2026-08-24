import React from 'react';
import { StyleSheet } from 'react-native';
import { AppText } from '@/components/common';

/** Live match feedback, mirroring the web's `.door-match` line. */
const MATCH_OK = '#4ADE80';
const MATCH_NO = '#FF6B6B';

interface PasswordMatchHintProps {
  password: string;
  confirm: string;
  matchedLabel: string;
  mismatchLabel: string;
}

/**
 * Renders nothing until the user has typed something into the confirmation
 * field — an empty confirm is "not yet answered", not "wrong".
 */
export const PasswordMatchHint: React.FC<PasswordMatchHintProps> = ({
  password,
  confirm,
  matchedLabel,
  mismatchLabel,
}) => {
  if (confirm.length === 0) return null;
  const matched = password === confirm;
  return (
    <AppText variant="caption" style={[styles.hint, { color: matched ? MATCH_OK : MATCH_NO }]}>
      {matched ? matchedLabel : mismatchLabel}
    </AppText>
  );
};

const styles = StyleSheet.create({
  hint: { marginTop: 6 },
});
