import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/context';
import type { PlaylistSummary } from '@/services/playlists';
import { AppText, Artwork } from '@/components/common';

interface PlaylistPickerSheetProps {
  /** Non-null shows the sheet (the track being added). */
  visible: boolean;
  playlists: PlaylistSummary[];
  onPick: (playlistId: string) => void;
  onCreateNew: () => void;
  onClose: () => void;
}

/**
 * Bottom-sheet for choosing which playlist to add a track to (same Modal +
 * backdrop pattern as TrackOptionsModal). A "New playlist" row sits on top.
 */
export const PlaylistPickerSheet: React.FC<PlaylistPickerSheetProps> = ({
  visible,
  playlists,
  onPick,
  onCreateNew,
  onClose,
}) => {
  const theme = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  // Mount the native <Modal> only while open. Rendering it permanently with
  // visible={false} stacks an idle native window (several of these under one
  // native-stack screen wedge the Android UI thread). See the "modals freeze
  // native-stack" note.
  if (!visible) return null;

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={[styles.backdrop, { backgroundColor: theme.colors.overlay }]} onPress={onClose}>
        <Pressable
          style={[
            styles.sheet,
            {
              backgroundColor: theme.colors.backgroundElevated,
              borderTopLeftRadius: theme.radius.xl,
              borderTopRightRadius: theme.radius.xl,
              paddingBottom: 36 + insets.bottom,
            },
          ]}
        >
          <AppText variant="h2" style={styles.title}>
            {t('playlist.addToPlaylist')}
          </AppText>

          <Pressable
            style={({ pressed }) => [styles.newRow, { opacity: pressed ? 0.6 : 1 }]}
            onPress={onCreateNew}
          >
            <View style={[styles.newIcon, { backgroundColor: theme.colors.surface, borderRadius: theme.radius.sm }]}>
              <Ionicons name="add" size={24} color={theme.colors.icon} />
            </View>
            <AppText variant="h3" style={styles.rowLabel}>
              {t('playlist.newPlaylist')}
            </AppText>
          </Pressable>

          <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />

          <ScrollView style={styles.list} keyboardShouldPersistTaps="handled">
            {playlists.length ? (
              playlists.map((pl) => (
                <Pressable
                  key={pl.id}
                  style={({ pressed }) => [styles.row, { opacity: pressed ? 0.6 : 1 }]}
                  onPress={() => onPick(pl.id)}
                >
                  <Artwork
                    uri={pl.cover}
                    style={[styles.art, { borderRadius: theme.radius.sm }]}
                    iconSize={20}
                  />
                  <View style={styles.rowMeta}>
                    <AppText variant="h3" numberOfLines={1}>
                      {pl.name}
                    </AppText>
                    <AppText variant="bodySm" color="textMuted">
                      {t('playlist.songCount', { count: pl.itemCount })}
                    </AppText>
                  </View>
                </Pressable>
              ))
            ) : (
              <AppText variant="bodySm" color="textMuted" style={styles.empty}>
                {t('library.emptyPlaylists')}
              </AppText>
            )}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end' },
  sheet: { paddingHorizontal: 20, paddingTop: 16, maxHeight: '70%' },
  title: { marginBottom: 12 },
  newRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  newIcon: { width: 52, height: 52, alignItems: 'center', justifyContent: 'center' },
  rowLabel: { marginLeft: 12 },
  divider: { height: 1, marginVertical: 8 },
  list: { flexGrow: 0 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  art: { width: 52, height: 52, backgroundColor: '#222' },
  rowMeta: { flex: 1, marginLeft: 12 },
  empty: { paddingVertical: 16 },
});
