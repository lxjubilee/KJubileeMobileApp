import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Keyboard,
  KeyboardEvent,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { useTheme } from '@/context';
import { AppText } from './AppText';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  message?: string;
  /** Primary action label. */
  confirmLabel?: string;
  /** When provided, a secondary (Cancel) button is shown — omit for a single-button acknowledge dialog. */
  cancelLabel?: string;
  /** Tints the primary button danger-red (for destructive actions). */
  destructive?: boolean;
  /** Shows a spinner on the primary button and blocks dismissal. */
  loading?: boolean;
  /** Disables the primary button (e.g. until a required input is filled). */
  confirmDisabled?: boolean;
  /** Extra content (e.g. a password input) rendered between the message and buttons. */
  children?: React.ReactNode;
  /**
   * Vertical placement. Defaults to auto: top-anchored when `children` are present
   * (so a keyboard can't cover the buttons), else centered. Pass `'center'` to
   * force centering for display-only children (e.g. version rows, no input).
   */
  align?: 'center' | 'top';
  onConfirm: () => void;
  onCancel?: () => void;
}

/**
 * Themed confirmation / acknowledgement dialog — a drop-in for `Alert.alert`
 * that matches the app's dark theme. Tapping the backdrop cancels (unless
 * loading or no cancel action is provided).
 */
export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  visible,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel,
  destructive,
  loading,
  confirmDisabled,
  children,
  align,
  onConfirm,
  onCancel,
}) => {
  const theme = useTheme();
  const { height: screenH } = useWindowDimensions();
  // Track the keyboard height and the card's measured height so a centered dialog
  // can be nudged up by *exactly* its overlap with the keyboard — no more — and
  // slide back to center when the keyboard hides. Avoids KeyboardAvoidingView,
  // which is unreliable inside an Android Modal.
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [cardHeight, setCardHeight] = useState(0);
  const translateY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;
    const onShow = (e: KeyboardEvent) => setKeyboardHeight(e.endCoordinates?.height ?? 0);
    const onHide = () => setKeyboardHeight(0);
    const show = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      onShow,
    );
    const hide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      onHide,
    );
    return () => {
      show.remove();
      hide.remove();
      // Reset so the next open starts centered even if the hide event was missed.
      setKeyboardHeight(0);
    };
  }, [visible]);

  // Match Button's primary variant (accent, not colors.primary) so a dialog's
  // confirm button looks like every other primary button in the app.
  const confirmBg = destructive ? theme.colors.danger : theme.colors.accent;
  const dismiss = loading ? undefined : onCancel;
  const primaryDisabled = loading || confirmDisabled;
  // Dialogs with an input (children) get a keyboard. Anchor them near the top so
  // the buttons stay above it. We deliberately DON'T use KeyboardAvoidingView —
  // it's unreliable inside an Android Modal (and stacking it under a native-stack
  // screen can wedge the UI thread); top-anchoring keeps the buttons reachable.
  // Top-anchor only when a keyboard-raising input is present. `align` overrides
  // the heuristic so display-only children (e.g. version rows) can stay centered.
  const topAnchored = align ? align === 'top' : children != null;

  // Slide the centered card up by only its overlap with the keyboard, plus a
  // small gap — and back to 0 when the keyboard hides. Top-anchored dialogs don't
  // move. Native-driven for smoothness; the transform doesn't affect layout, so
  // the measured cardHeight stays stable (no feedback loop).
  useEffect(() => {
    const GAP = 16;
    const overlap =
      !topAnchored && keyboardHeight > 0 && cardHeight > 0
        ? keyboardHeight + cardHeight / 2 + GAP - screenH / 2
        : 0;
    Animated.timing(translateY, {
      toValue: -Math.max(0, overlap),
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [keyboardHeight, cardHeight, screenH, topAnchored, translateY]);

  // Mount the native <Modal> window ONLY while open. Rendering it permanently
  // with visible={false} leaves a native window (and, for input dialogs, the
  // keyboard) that lingers over a screen navigated to right after dismissal and
  // swallows all touches (the app looks frozen). See the "modals freeze
  // native-stack" note. Returning null fully tears the window down instead.
  if (!visible) return null;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={dismiss ?? onConfirm}>
      <Pressable style={[styles.backdrop, topAnchored && styles.backdropTop]} onPress={dismiss}>
        {/* Inner press swallows taps so they don't close the dialog. Measured so
            the keyboard-overlap nudge is exact; translateY slides it above the
            keyboard only when it would otherwise be covered. */}
        <AnimatedPressable
          onLayout={(e) => setCardHeight(e.nativeEvent.layout.height)}
          style={[
            styles.card,
            {
              backgroundColor: theme.colors.backgroundElevated,
              borderRadius: theme.radius.lg,
              transform: [{ translateY }],
            },
          ]}
        >
          <AppText variant="h2" style={styles.title}>
            {title}
          </AppText>
          {message ? (
            <AppText variant="body" color="textSecondary" style={styles.message}>
              {message}
            </AppText>
          ) : null}

          {children ? <View style={styles.children}>{children}</View> : null}

          <View style={styles.actions}>
            {cancelLabel ? (
              <Pressable
                onPress={onCancel}
                disabled={loading}
                style={({ pressed }) => [
                  styles.btn,
                  styles.cancelBtn,
                  { borderColor: theme.colors.border, opacity: pressed ? 0.7 : 1 },
                ]}
              >
                <AppText variant="label" style={{ color: theme.colors.text }}>
                  {cancelLabel}
                </AppText>
              </Pressable>
            ) : null}
            <Pressable
              onPress={onConfirm}
              disabled={primaryDisabled}
              style={({ pressed }) => [
                styles.btn,
                { backgroundColor: confirmBg, opacity: primaryDisabled ? 0.6 : pressed ? 0.85 : 1 },
              ]}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <AppText variant="label" style={styles.confirmLabel}>
                  {confirmLabel}
                </AppText>
              )}
            </Pressable>
          </View>
        </AnimatedPressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  // Top-anchored variant for input dialogs so the keyboard can't cover the buttons.
  backdropTop: { justifyContent: 'flex-start', paddingTop: 96 },
  card: { width: '100%', maxWidth: 360, padding: 22 },
  title: { marginBottom: 8 },
  message: { lineHeight: 22 },
  children: { marginTop: 16 },
  actions: { flexDirection: 'row', gap: 12, marginTop: 22 },
  btn: {
    flex: 1,
    height: 48,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtn: { borderWidth: 1, backgroundColor: 'transparent' },
  confirmLabel: { color: '#FFFFFF', fontWeight: '700' },
});
