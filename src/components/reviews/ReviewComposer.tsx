import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/context';
import { AppText, IconButton } from '@/components/common';
import type { MyReview, ReviewSummary, ReviewTargetType } from '@/types';
import { reviewsApi } from '@/services/reviews';
import type { ApiError } from '@/services/api';
import { StarRating } from './StarRating';

/**
 * Bottom-sheet modal to create / edit / delete the caller's own rating + review
 * for one target (album or song). Stars are required; title + body optional, so
 * the same sheet serves "Rate this album" and "Write a review". RN port of the
 * web `ReviewComposer`.
 *
 * Mounted only while open (parent renders it conditionally) so no idle native
 * <Modal> window lingers — see the "modals freeze native-stack" note.
 */

const TITLE_MAX = 150;
const BODY_MAX = 5000;

interface Props {
  type: ReviewTargetType;
  id: string;
  targetLabel: string;
  initial?: MyReview | null;
  onClose: () => void;
  onSaved: (summary: ReviewSummary, mine: MyReview) => void;
  onDeleted: (summary: ReviewSummary) => void;
}

export const ReviewComposer: React.FC<Props> = ({
  type,
  id,
  targetLabel,
  initial,
  onClose,
  onSaved,
  onDeleted,
}) => {
  const theme = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [stars, setStars] = useState(initial?.stars ?? 0);
  const [title, setTitle] = useState(initial?.title ?? '');
  const [body, setBody] = useState(initial?.body ?? '');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const save = async () => {
    if (stars < 1) {
      setErr(t('reviews.chooseStars'));
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const res = await reviewsApi.upsert(type, id, {
        stars,
        title: title.trim() || null,
        body: body.trim() || null,
      });
      onSaved(res.summary, res.review);
      onClose();
    } catch (e) {
      setErr((e as ApiError)?.message ?? t('reviews.saveError'));
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    setErr(null);
    try {
      const res = await reviewsApi.remove(type, id);
      onDeleted(res.summary);
      onClose();
    } catch (e) {
      setErr((e as ApiError)?.message ?? t('reviews.deleteError'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable
          style={[styles.backdrop, { backgroundColor: theme.colors.overlay }]}
          onPress={busy ? undefined : onClose}
        >
          <Pressable
            style={[
              styles.sheet,
              {
                backgroundColor: theme.colors.backgroundElevated,
                borderTopLeftRadius: theme.radius.xl,
                borderTopRightRadius: theme.radius.xl,
                paddingBottom: 28 + insets.bottom,
              },
            ]}
          >
            <View style={styles.header}>
              <View style={styles.headerText}>
                <AppText variant="h2">
                  {initial ? t('reviews.editTitle') : t('reviews.rateTitle')}
                </AppText>
                <AppText variant="bodySm" color="textMuted" numberOfLines={1}>
                  {targetLabel}
                </AppText>
              </View>
              <IconButton name="close" size={24} onPress={onClose} />
            </View>

            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <AppText variant="label" color="textSecondary" style={styles.fieldLabel}>
                {t('reviews.yourRating')}
              </AppText>
              <StarRating value={stars} onChange={setStars} size="lg" />

              <AppText variant="label" color="textSecondary" style={styles.fieldLabel}>
                {t('reviews.titleLabel')}
              </AppText>
              <TextInput
                value={title}
                onChangeText={setTitle}
                maxLength={TITLE_MAX}
                placeholder={t('reviews.titlePlaceholder')}
                placeholderTextColor={theme.colors.textMuted}
                style={[
                  styles.input,
                  { color: theme.colors.text, backgroundColor: theme.colors.surface, borderRadius: theme.radius.md },
                ]}
              />

              <AppText variant="label" color="textSecondary" style={styles.fieldLabel}>
                {t('reviews.reviewLabel')}
              </AppText>
              <TextInput
                value={body}
                onChangeText={setBody}
                maxLength={BODY_MAX}
                placeholder={t('reviews.reviewPlaceholder')}
                placeholderTextColor={theme.colors.textMuted}
                multiline
                textAlignVertical="top"
                style={[
                  styles.input,
                  styles.textarea,
                  { color: theme.colors.text, backgroundColor: theme.colors.surface, borderRadius: theme.radius.md },
                ]}
              />
              <AppText variant="caption" color="textMuted" style={styles.charcount}>
                {body.length}/{BODY_MAX}
              </AppText>

              {err ? (
                <AppText variant="bodySm" color="danger" style={styles.error}>
                  {err}
                </AppText>
              ) : null}

              <View style={styles.actions}>
                {initial ? (
                  <Pressable onPress={remove} disabled={busy} hitSlop={8} style={styles.deleteBtn}>
                    <AppText variant="label" color="danger">
                      {t('common.delete')}
                    </AppText>
                  </Pressable>
                ) : null}
                <View style={styles.flex} />
                <Pressable
                  onPress={save}
                  disabled={busy}
                  style={[
                    styles.saveBtn,
                    { backgroundColor: theme.colors.accent, borderRadius: theme.radius.pill, opacity: busy ? 0.6 : 1 },
                  ]}
                >
                  {busy ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <AppText variant="label" style={{ color: '#FFFFFF' }}>
                      {initial ? t('common.save') : t('reviews.submit')}
                    </AppText>
                  )}
                </Pressable>
              </View>
            </ScrollView>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  backdrop: { flex: 1, justifyContent: 'flex-end' },
  sheet: { paddingHorizontal: 20, paddingTop: 16, maxHeight: '88%' },
  header: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  headerText: { flex: 1, marginRight: 12 },
  fieldLabel: { marginTop: 18, marginBottom: 8 },
  input: { paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  textarea: { minHeight: 110 },
  charcount: { textAlign: 'right', marginTop: 6 },
  error: { marginTop: 12 },
  actions: { flexDirection: 'row', alignItems: 'center', marginTop: 20 },
  deleteBtn: { paddingVertical: 10, paddingRight: 12 },
  saveBtn: { paddingVertical: 12, paddingHorizontal: 28, alignItems: 'center', justifyContent: 'center', minWidth: 110 },
});
