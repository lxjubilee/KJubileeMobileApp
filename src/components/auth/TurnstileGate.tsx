import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { CONFIG } from '@/constants';
import { logger } from '@/utils';
import { TurnstileWidget } from './TurnstileWidget';

/** How long to wait for the challenge before letting the user through anyway. */
const FAILSAFE_MS = 8000;

interface TurnstileGateProps {
  /** Latest token, or null when there isn't one. */
  onToken: (token: string | null) => void;
  /** False while the gate is still waiting on a token it expects to get. */
  onReadyChange: (ready: boolean) => void;
  /** Bump to mint a fresh token — the previous one is single-use. */
  resetKey: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * Turnstile with a fail-safe.
 *
 * Only `POST /api/auth/signin` reads `cfTurnstileToken`, and in the SSO login
 * mode the server does not verify it at all — the widget is a client-side
 * speed bump, not the actual defence. So it must never become a wall: mobile
 * failure modes (cellular handoff, corporate WebView policies, an allow-list
 * that drifts off `turnstileBaseUrl`) are far more common than on the web, and
 * a challenge that silently renders nothing is indistinguishable from one that
 * simply hasn't appeared.
 *
 * After 8 seconds without a token we report ready and let the submit proceed,
 * mirroring what the web door does. The widget itself keeps its own visible
 * "tap to retry" affordance.
 */
export const TurnstileGate: React.FC<TurnstileGateProps> = ({
  onToken,
  onReadyChange,
  resetKey,
  style,
}) => {
  const required = !!CONFIG.TURNSTILE_SITE_KEY;
  const solved = useRef(false);

  useEffect(() => {
    if (!required) {
      onReadyChange(true);
      return;
    }
    solved.current = false;
    onReadyChange(false);
    onToken(null);

    const timer = setTimeout(() => {
      if (solved.current) return;
      logger.warn('Turnstile: no token after 8s — allowing submit without one');
      onReadyChange(true);
    }, FAILSAFE_MS);

    return () => clearTimeout(timer);
    // `resetKey` drives the remount; the callbacks are stable enough in practice
    // and re-running on their identity would restart the timer on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey, required]);

  if (!required) return null;

  return (
    <View style={[styles.wrap, style]}>
      <TurnstileWidget
        key={resetKey}
        onToken={(token) => {
          solved.current = true;
          onToken(token);
          onReadyChange(true);
        }}
        onError={() => {
          onToken(null);
          // Don't block on an errored challenge — the widget shows its own retry
          // affordance, and stranding the user behind it is the worse outcome.
          onReadyChange(true);
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { width: '100%' },
});
