import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import { useTranslation } from 'react-i18next';
import { AppText } from '@/components/common';
import { CONFIG } from '@/constants';
import { logger } from '@/utils';

interface TurnstileWidgetProps {
  /** Called with a fresh CAPTCHA token once the challenge is solved. */
  onToken: (token: string) => void;
  /** Called when the widget errors or the token expires (so the screen can reset). */
  onError?: (reason: string) => void;
}

type Status = 'loading' | 'ready' | 'error';

/**
 * Cloudflare Turnstile rendered inside a WebView (there is no native SDK). The
 * widget auto-solves and posts the token back over the RN bridge. Renders
 * nothing when no site key is configured (e.g. environments with CAPTCHA off).
 *
 * Turnstile renders *nothing* on failure (bad/unallowlisted domain, blocked
 * script, etc.), which is indistinguishable from "not showing". So we make every
 * failure observable: WebView load/HTTP errors and Turnstile error/expiry are
 * logged, and a visible "couldn't load — tap to retry" state replaces the blank.
 */
export const TurnstileWidget: React.FC<TurnstileWidgetProps> = ({ onToken, onError }) => {
  const { t } = useTranslation();
  const siteKey = CONFIG.TURNSTILE_SITE_KEY;
  const [status, setStatus] = useState<Status>('loading');
  // Bump to force-remount the WebView for a clean retry.
  const [reloadKey, setReloadKey] = useState(0);

  const html = useMemo(
    () => `<!DOCTYPE html>
<html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
    <script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>
    <style>
      html, body { margin: 0; padding: 0; background: transparent; }
      .box { display: flex; justify-content: center; align-items: center; padding: 4px 0; width: 100%; }
      /* Stretch the widget to fill the field width. */
      .box .cf-turnstile, .box iframe { width: 100% !important; }
    </style>
  </head>
  <body>
    <div class="box">
      <div class="cf-turnstile"
        data-sitekey="${siteKey}"
        data-callback="onTok"
        data-error-callback="onErr"
        data-expired-callback="onExp"
        data-size="flexible"
        data-theme="dark"></div>
    </div>
    <script>
      function send(o) { if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify(o)); }
      function onTok(t) { send({ type: 'token', token: t }); }
      function onErr(e) { send({ type: 'error', reason: String(e) }); }
      function onExp() { send({ type: 'expired' }); }
      // Report once the script either renders or fails so the app can stop showing a spinner.
      window.addEventListener('load', function () {
        setTimeout(function () {
          if (window.turnstile) send({ type: 'rendered' });
          else send({ type: 'error', reason: 'turnstile-script-not-loaded' });
        }, 1500);
      });
    </script>
  </body>
</html>`,
    [siteKey],
  );

  const fail = (reason: string) => {
    logger.warn('Turnstile failed', reason);
    setStatus('error');
    onError?.(reason);
  };

  const onMessage = (e: WebViewMessageEvent) => {
    try {
      const msg = JSON.parse(e.nativeEvent.data) as { type: string; token?: string; reason?: string };
      if (msg.type === 'token' && msg.token) {
        setStatus('ready');
        onToken(msg.token);
      } else if (msg.type === 'rendered') {
        setStatus('ready');
      } else if (msg.type === 'error' || msg.type === 'expired') {
        fail(msg.reason ?? msg.type);
      }
    } catch {
      // ignore non-JSON messages
    }
  };

  const retry = () => {
    setStatus('loading');
    setReloadKey((k) => k + 1);
  };

  if (!siteKey) {
    logger.warn('Turnstile: no site key configured (CONFIG.TURNSTILE_SITE_KEY empty) — widget hidden');
    return null;
  }

  return (
    <View style={styles.wrap}>
      <WebView
        key={reloadKey}
        originWhitelist={['*']}
        source={{ html, baseUrl: CONFIG.TURNSTILE_BASE_URL }}
        onMessage={onMessage}
        javaScriptEnabled
        domStorageEnabled
        scrollEnabled={false}
        // Turnstile's managed challenge needs a single-window iframe on Android.
        setSupportMultipleWindows={false}
        mixedContentMode="always"
        onError={(e) => fail(`webview:${e.nativeEvent.description}`)}
        onHttpError={(e) => fail(`http:${e.nativeEvent.statusCode}`)}
        style={styles.web}
        // Transparent so it blends into the dark sign-in screen.
        backgroundColor="transparent"
      />
      {status !== 'ready' ? (
        <View style={styles.overlay} pointerEvents={status === 'error' ? 'auto' : 'none'}>
          {status === 'loading' ? (
            <ActivityIndicator color="#8A8A99" />
          ) : (
            <Pressable hitSlop={8} onPress={retry} accessibilityRole="button">
              <AppText variant="bodySm" color="textMuted">
                {t('auth.captcha.retry')}
              </AppText>
            </Pressable>
          )}
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { height: 78, marginTop: 18, justifyContent: 'center' },
  web: { flex: 1, backgroundColor: 'transparent' },
  overlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
});
