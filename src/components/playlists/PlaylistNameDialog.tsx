import React, { useEffect, useState } from 'react';
import { StyleSheet, TextInput } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/context';
import { ConfirmDialog } from '@/components/common';

interface PlaylistNameDialogProps {
  visible: boolean;
  title: string;
  confirmLabel: string;
  /** Pre-fills the input (rename flow). */
  initialName?: string;
  onConfirm: (name: string) => void;
  onCancel: () => void;
}

/**
 * Name / rename a playlist. Wraps `ConfirmDialog`, embedding a text input in its
 * `children` slot (same pattern as the password dialog) and disabling confirm
 * until a non-empty name is entered.
 */
export const PlaylistNameDialog: React.FC<PlaylistNameDialogProps> = ({
  visible,
  title,
  confirmLabel,
  initialName = '',
  onConfirm,
  onCancel,
}) => {
  const theme = useTheme();
  const { t } = useTranslation();
  const [name, setName] = useState(initialName);

  // Reset the field each time the dialog is (re)opened.
  useEffect(() => {
    if (visible) setName(initialName);
  }, [visible, initialName]);

  const trimmed = name.trim();

  return (
    <ConfirmDialog
      visible={visible}
      title={title}
      confirmLabel={confirmLabel}
      cancelLabel={t('common.cancel')}
      confirmDisabled={!trimmed}
      // Center on screen; ConfirmDialog lifts the card above the keyboard so the
      // buttons stay reachable despite the auto-focused input.
      align="center"
      onConfirm={() => onConfirm(trimmed)}
      onCancel={onCancel}
    >
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder={t('playlist.namePlaceholder')}
        placeholderTextColor={theme.colors.textMuted}
        style={[
          styles.input,
          {
            color: theme.colors.text,
            backgroundColor: theme.colors.surface,
            borderRadius: theme.radius.md,
          },
        ]}
        autoFocus
        maxLength={80}
        returnKeyType="done"
        onSubmitEditing={() => trimmed && onConfirm(trimmed)}
      />
    </ConfirmDialog>
  );
};

const styles = StyleSheet.create({
  input: { height: 48, paddingHorizontal: 14, fontSize: 15 },
});
