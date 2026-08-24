import React, { useMemo, useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  SectionList,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/context';
import { useAppDispatch } from '@/redux';
import { setAppLanguage } from '@/redux';
import { LANGUAGES, DEFAULT_LANG, langByCode, langFlagUrl, Lang } from '@/localization';
import { AppText } from './AppText';
import { IconButton } from './IconButton';

interface LanguagePanelProps {
  /** Currently selected language code (highlighted + check-marked). */
  selected: string;
  onClose: () => void;
}

/** LANGUAGES alphabetically by name, with English (default) pinned first. */
const ALL_LANGUAGES: Lang[] = [
  ...LANGUAGES.filter((l) => l.code === DEFAULT_LANG),
  ...LANGUAGES.filter((l) => l.code !== DEFAULT_LANG).sort((a, b) => a.name.localeCompare(b.name)),
];

/**
 * Slide-up language picker (mirrors the web's flag panel): a search box, a
 * "Recently Used" section (the current language) and an alphabetical
 * "All Languages" list, each with a round flag. Picking one switches the UI
 * locale and the catalog language filter, then closes. Mounted only while open
 * (never kept mounted with visible=false — that wedges the Android UI thread).
 */
export const LanguagePanel: React.FC<LanguagePanelProps> = ({ selected, onClose }) => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  const { t } = useTranslation();
  const [query, setQuery] = useState('');

  const sections = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q) {
      const data = ALL_LANGUAGES.filter(
        (l) => l.name.toLowerCase().includes(q) || l.code.toLowerCase().includes(q),
      );
      return [{ key: 'all', title: t('language.allLanguages'), data }];
    }
    const current = langByCode(selected);
    return [
      ...(current ? [{ key: 'recent', title: t('language.recentlyUsed'), data: [current] }] : []),
      { key: 'all', title: t('language.allLanguages'), data: ALL_LANGUAGES },
    ];
  }, [query, selected, t]);

  const pick = (code: string) => {
    void dispatch(setAppLanguage(code));
    onClose();
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose} />
      {/* Flex-end avoider keeps the sheet just above the keyboard: iOS pads by the
          keyboard height; Android relies on the window resize (default layout mode),
          so there's no double-shift and no oversized gap. box-none lets taps in the
          empty area above the sheet fall through to the dismiss overlay. */}
      <KeyboardAvoidingView
        style={styles.avoider}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        pointerEvents="box-none"
      >
        <View
          style={[
            styles.sheet,
            { backgroundColor: theme.colors.background, paddingBottom: insets.bottom + 8 },
          ]}
        >
        <View style={styles.header}>
          <AppText variant="h2">{t('language.title')}</AppText>
          <IconButton name="close" size={24} onPress={onClose} />
        </View>

        <View style={[styles.search, { backgroundColor: theme.colors.surface }]}>
          <Ionicons name="search" size={18} color={theme.colors.iconMuted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={t('language.search')}
            placeholderTextColor={theme.colors.textMuted}
            style={[styles.searchInput, { color: theme.colors.text }]}
            autoCorrect={false}
            autoCapitalize="none"
          />
        </View>

        <SectionList
          sections={sections}
          keyExtractor={(item, index) => `${item.code}-${index}`}
          keyboardShouldPersistTaps="handled"
          stickySectionHeadersEnabled={false}
          contentContainerStyle={styles.listContent}
          renderSectionHeader={({ section }) => (
            <View style={[styles.sectionHeader, { backgroundColor: theme.colors.background }]}>
              <AppText variant="label" color="textMuted" style={styles.sectionTitle}>
                {section.title.toUpperCase()}
              </AppText>
            </View>
          )}
          renderItem={({ item }) => {
            const active = item.code === selected;
            return (
              <Pressable style={styles.row} onPress={() => pick(item.code)}>
                <View style={styles.flagWrap}>
                  <Image source={{ uri: langFlagUrl(item.code, 80) }} style={styles.flag} resizeMode="cover" />
                </View>
                <AppText
                  variant="body"
                  style={[styles.name, active && { color: theme.colors.accent, fontWeight: '700' }]}
                >
                  {item.name}
                </AppText>
                {active ? <Ionicons name="checkmark" size={20} color={theme.colors.accent} /> : null}
              </Pressable>
            );
          }}
        />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)' },
  // Fills the modal and pins the sheet to the bottom; the keyboard shrinks this
  // area (Android resize) or gets padded (iOS), moving the sheet up with it.
  avoider: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    maxHeight: '82%',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 44,
    borderRadius: 10,
    marginBottom: 4,
  },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 15 },
  listContent: { paddingBottom: 8 },
  sectionHeader: { paddingTop: 14, paddingBottom: 6 },
  sectionTitle: { letterSpacing: 1 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 11 },
  // Round flag: a clipped circle with the rectangular flag cropped to fill it.
  flagWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    overflow: 'hidden',
    marginRight: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    backgroundColor: '#222',
  },
  flag: { width: '100%', height: '100%' },
  name: { flex: 1 },
});
