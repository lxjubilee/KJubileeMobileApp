import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useTheme } from '@/context';
import { AppText } from './AppText';

interface LoaderProps {
  message?: string;
}

/** Centered loading indicator for full-screen async states. */
export const Loader: React.FC<LoaderProps> = ({ message }) => {
  const theme = useTheme();
  return (
    <View style={styles.container}>
      <ActivityIndicator color={theme.colors.primary} size="large" />
      {message ? (
        <AppText variant="bodySm" color="textMuted" style={styles.msg}>
          {message}
        </AppText>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  msg: { marginTop: 12 },
});
