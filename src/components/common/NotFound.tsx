import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '@/context';
import { AppText } from './AppText';
import { Button } from './Button';
import { IconButton } from './IconButton';
import { Screen } from './Screen';

/**
 * The screen a bad id lands on — a deleted album, a mistyped share link, a
 * station slug the catalog no longer carries.
 *
 * WHY THIS EXISTS. Each screen used to render its own centred line of muted
 * text and nothing else: no header, no back button, no tabs. Negative testing
 * opened `kjubilee://album/DOES-NOT-EXIST-999` and landed on a black screen
 * with five words on it and no way out but the system gesture (NEG-062). A
 * person arriving from a shared link has no history to go back to either, so
 * the gesture may not even help — which is how a wrong link becomes a dead end
 * rather than a wrong turn.
 *
 * Two exits, because the two situations differ: `onBack` for someone who came
 * from inside the app, and `action` for someone who arrived cold and needs
 * somewhere to go rather than somewhere to return to.
 */
interface NotFoundProps {
  /** What was not found, as a sentence. e.g. "Album not found." */
  message: string;
  /** Optional forward action for arrivals with no history — label plus handler. */
  action?: { label: string; onPress: () => void };
}

export const NotFound: React.FC<NotFoundProps> = ({ message, action }) => {
  const theme = useTheme();
  const navigation = useNavigation();
  // A deep link can open this screen as the first and only route, and offering
  // "Back" that cannot go back is worse than not offering it.
  const canGoBack = navigation.canGoBack();

  return (
    <Screen>
      {canGoBack ? (
        <View style={styles.header}>
          <IconButton
            name="chevron-back"
            onPress={() => navigation.goBack()}
            accessibilityLabel="Go back"
          />
        </View>
      ) : null}

      <View style={styles.center}>
        <AppText variant="h2" style={styles.message}>
          {message}
        </AppText>
        <AppText color="textMuted" style={styles.hint}>
          The link may be out of date, or the item may have been removed.
        </AppText>
        {action ? (
          <Button label={action.label} onPress={action.onPress} style={styles.action} />
        ) : null}
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  header: { paddingHorizontal: 8, paddingTop: 4 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  message: { textAlign: 'center' },
  hint: { textAlign: 'center', marginTop: 8 },
  action: { marginTop: 28, alignSelf: 'stretch' },
});
