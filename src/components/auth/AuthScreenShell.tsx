import React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { AppText, BrandLogo, IconButton } from '@/components/common';
import { useTheme } from '@/context';
import { AUTH_METRICS } from './authStyles';

interface AuthScreenShellProps {
  /** Back handler. Omit to hide the arrow — the row keeps its height either way. */
  onBack?: () => void;
  /** Accessibility label for the back arrow. */
  backLabel?: string;
  title?: string;
  subtitle?: string;
  /** Lets the caller scroll back to the banner when a validation error fires. */
  scrollRef?: React.RefObject<ScrollView | null>;
  contentStyle?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}

/**
 * Chrome shared by every auth screen: status bar, safe area, the back-arrow +
 * brand header, and the keyboard-aware scroll column.
 *
 * The header row height is unconditional so content does not jump between steps
 * of the Jubilee Door as the back arrow appears and disappears.
 */
export const AuthScreenShell: React.FC<AuthScreenShellProps> = ({
  onBack,
  backLabel,
  title,
  subtitle,
  scrollRef,
  contentStyle,
  children,
}) => {
  const theme = useTheme();

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <StatusBar style="light" />
      <SafeAreaView style={styles.flex} edges={['top', 'bottom']}>
        <View style={styles.header}>
          {onBack ? (
            <IconButton
              name="arrow-back"
              size={26}
              onPress={onBack}
              accessibilityLabel={backLabel}
            />
          ) : (
            <View style={styles.backSpacer} />
          )}
          {/* BrandLogo strips `color`/`fontWeight` from textStyle — the wordmark
              spans set their own colors and Orbitron encodes the weight. */}
          <BrandLogo textStyle={styles.logo} />
        </View>

        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            ref={scrollRef}
            contentContainerStyle={[styles.content, contentStyle]}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
            showsVerticalScrollIndicator={false}
          >
            {title ? (
              // Auth titles hold a single line. `numberOfLines={1}` is the
              // guarantee; the type size is set small enough that the longest
              // static title ("Sign in with your Jubilee ID") still fits the
              // content column on a 375pt phone, so nothing truncates in
              // practice — only a runaway interpolated site name would.
              <AppText style={styles.title} numberOfLines={1}>
                {title}
              </AppText>
            ) : null}
            {subtitle ? (
              <AppText variant="body" color="textSecondary" style={styles.subtitle}>
                {subtitle}
              </AppText>
            ) : null}
            {children}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 14,
    paddingTop: 6,
    paddingBottom: 6,
  },
  // Matches IconButton's 26px glyph + its padding, so the brand mark holds its
  // position whether or not a back arrow is rendered.
  backSpacer: { width: 26, height: 26 },
  logo: { fontSize: 20, lineHeight: 26, fontWeight: '900', letterSpacing: 1 },
  content: {
    flexGrow: 1,
    paddingHorizontal: AUTH_METRICS.gutter,
    paddingTop: AUTH_METRICS.contentPaddingTop,
    paddingBottom: AUTH_METRICS.contentPaddingBottom,
  },
  title: { color: '#FFFFFF', fontSize: 24, lineHeight: 32, fontWeight: '800' },
  subtitle: { marginTop: 12, fontSize: 16, lineHeight: 22 },
});
