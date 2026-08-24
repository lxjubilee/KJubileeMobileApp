import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context';
import { AppText } from './AppText';

interface PlaceholderProps {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  subtitle?: string;
}

/** Centered empty/coming-soon state used by stub screens and empty lists. */
export const Placeholder: React.FC<PlaceholderProps> = ({ icon, title, subtitle }) => {
  const theme = useTheme();
  return (
    <View style={styles.container}>
      <Ionicons name={icon} size={56} color={theme.colors.iconMuted} />
      <AppText variant="h2" style={styles.title}>
        {title}
      </AppText>
      {subtitle ? (
        <AppText variant="bodySm" color="textMuted" style={styles.subtitle}>
          {subtitle}
        </AppText>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  title: { marginTop: 16 },
  subtitle: { marginTop: 8, textAlign: 'center' },
});
