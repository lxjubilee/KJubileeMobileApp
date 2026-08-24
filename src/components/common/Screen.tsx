import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { SafeAreaView, Edge } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useTheme } from '@/context';

interface ScreenProps {
  children: React.ReactNode;
  /** Which safe-area edges to inset. Defaults to top only (tabs handle bottom). */
  edges?: Edge[];
  style?: ViewStyle;
  /** Set false for screens with edge-to-edge artwork headers. */
  safeArea?: boolean;
}

/** Standard screen container: dark background + safe-area handling + status bar. */
export const Screen: React.FC<ScreenProps> = ({
  children,
  edges = ['top'],
  style,
  safeArea = true,
}) => {
  const theme = useTheme();
  const bg = { backgroundColor: theme.colors.background };

  if (!safeArea) {
    return (
      <View style={[styles.flex, bg, style]}>
        <StatusBar style="light" />
        {children}
      </View>
    );
  }

  return (
    <SafeAreaView edges={edges} style={[styles.flex, bg, style]}>
      <StatusBar style="light" />
      {children}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
});
