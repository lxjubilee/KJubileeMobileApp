import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { Screen, AppText, IconButton, Placeholder } from '@/components/common';
import { TrackRow } from '@/components/cards';
import { useAppSelector, usePlayer } from '@/hooks';

export const DownloadsScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const { playTracks } = usePlayer();
  const items = useAppSelector((s) => Object.values(s.downloads.items));

  return (
    <Screen>
      <View style={styles.header}>
        <IconButton name="chevron-back" onPress={() => navigation.goBack()} />
        <AppText variant="h1" style={styles.title}>
          {t('downloads.title')}
        </AppText>
      </View>

      {items.length ? (
        <View style={styles.list}>
          {items.map((rec) => (
            <TrackRow key={rec.track.id} track={rec.track} onPress={() => playTracks([rec.track], 0)} />
          ))}
        </View>
      ) : (
        <Placeholder icon="cloud-download-outline" title={t('downloads.title')} subtitle={t('downloads.empty')} />
      )}
    </Screen>
  );
};

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingTop: 8 },
  title: { marginLeft: 8 },
  list: { paddingHorizontal: 16, paddingTop: 12 },
});

export default DownloadsScreen;
