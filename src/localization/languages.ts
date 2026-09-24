// Supported UI/catalog languages for KJubilee — ported verbatim from the web
// app (kjubilee.com `lib/languages.ts`) so mobile and web filter identically.
//
// An album's language is encoded in the trailing letters of its catalog code
// (…EN = English, …ES = Spanish, …ID = Indonesian, …YUE = Cantonese), so
// `albumLanguage()` derives it from the code — there is NO language field in the
// manifest. In this app `Album.id` and `Track.albumId` ARE the album code, so
// pass those straight in. The whole catalog is mostly English today; other
// languages populate as …<XX>-suffixed albums are added.

// `flag` is the emoji (renders on iOS only); `cc` is the flagcdn.com country
// code so the picker can render round flag images on Android too
// (https://flagcdn.com/w80/<cc>.png), like JubileeVerse / JubileeInspire.
export interface Lang {
  code: string;
  name: string;
  flag: string;
  cc: string;
}

// Order roughly mirrors JubileeInspire's flag bar (English first).
export const LANGUAGES: Lang[] = [
  { code: 'en', name: 'English', flag: '🇺🇸', cc: 'us' },
  { code: 'es', name: 'Spanish', flag: '🇪🇸', cc: 'es' },
  { code: 'fr', name: 'French', flag: '🇫🇷', cc: 'fr' },
  { code: 'de', name: 'German', flag: '🇩🇪', cc: 'de' },
  { code: 'it', name: 'Italian', flag: '🇮🇹', cc: 'it' },
  { code: 'pt-BR', name: 'Portuguese (Brazilian)', flag: '🇧🇷', cc: 'br' },
  { code: 'pt-PT', name: 'Portuguese (European)', flag: '🇵🇹', cc: 'pt' },
  { code: 'nl', name: 'Dutch', flag: '🇳🇱', cc: 'nl' },
  { code: 'ru', name: 'Russian', flag: '🇷🇺', cc: 'ru' },
  { code: 'pl', name: 'Polish', flag: '🇵🇱', cc: 'pl' },
  { code: 'zh', name: 'Mandarin Chinese', flag: '🇨🇳', cc: 'cn' },
  { code: 'ja', name: 'Japanese', flag: '🇯🇵', cc: 'jp' },
  { code: 'ko', name: 'Korean', flag: '🇰🇷', cc: 'kr' },
  { code: 'ar', name: 'Arabic', flag: '🇸🇦', cc: 'sa' },
  { code: 'hi', name: 'Hindi', flag: '🇮🇳', cc: 'in' },
  { code: 'th', name: 'Thai', flag: '🇹🇭', cc: 'th' },
  { code: 'tr', name: 'Turkish', flag: '🇹🇷', cc: 'tr' },
  { code: 'vi', name: 'Vietnamese', flag: '🇻🇳', cc: 'vn' },
  { code: 'tl', name: 'Tagalog / Filipino', flag: '🇵🇭', cc: 'ph' },
  { code: 'he', name: 'Hebrew', flag: '🇮🇱', cc: 'il' },
  { code: 'sv', name: 'Swedish', flag: '🇸🇪', cc: 'se' },
  { code: 'da', name: 'Danish', flag: '🇩🇰', cc: 'dk' },
  { code: 'cs', name: 'Czech', flag: '🇨🇿', cc: 'cz' },
  { code: 'hu', name: 'Hungarian', flag: '🇭🇺', cc: 'hu' },
  { code: 'bg', name: 'Bulgarian', flag: '🇧🇬', cc: 'bg' },
  { code: 'hr', name: 'Croatian', flag: '🇭🇷', cc: 'hr' },
  { code: 'id', name: 'Indonesian', flag: '🇮🇩', cc: 'id' },
  { code: 'ro', name: 'Romanian', flag: '🇷🇴', cc: 'ro' },
  { code: 'uk', name: 'Ukrainian', flag: '🇺🇦', cc: 'ua' },
  // Codes are ISO 639-1 where one exists, otherwise ISO 639-3 (Cantonese =
  // 'yue', a 3-letter suffix handled by albumLanguage()).
  { code: 'el', name: 'Greek', flag: '🇬🇷', cc: 'gr' },
  { code: 'yue', name: 'Cantonese', flag: '🇭🇰', cc: 'hk' },
  { code: 'ms', name: 'Malay', flag: '🇲🇾', cc: 'my' },
  { code: 'ur', name: 'Urdu', flag: '🇵🇰', cc: 'pk' },
  { code: 'bn', name: 'Bengali', flag: '🇧🇩', cc: 'bd' },
  { code: 'ta', name: 'Tamil', flag: '🇮🇳', cc: 'in' },
  { code: 'fa', name: 'Persian / Farsi', flag: '🇮🇷', cc: 'ir' },
  { code: 'sw', name: 'Swahili', flag: '🇹🇿', cc: 'tz' },
  { code: 'no', name: 'Norwegian', flag: '🇳🇴', cc: 'no' },
  { code: 'fi', name: 'Finnish', flag: '🇫🇮', cc: 'fi' },
  { code: 'af', name: 'Afrikaans', flag: '🇿🇦', cc: 'za' },
  { code: 'la', name: 'Latin', flag: '🇻🇦', cc: 'va' },
];

export const DEFAULT_LANG = 'en';

/** Languages that flip the layout to right-to-left. */
export const RTL_LANGS = new Set(['ar', 'he', 'ur', 'fa']);

// Round flag image URL (flagcdn.com) for a language code — used by the picker
// and the header trigger button (emoji flags don't render on Android). Falls
// back to the US flag.
export function langFlagUrl(code: string, w: 40 | 80 = 80): string {
  const cc = langByCode(code)?.cc || 'us';
  return `https://flagcdn.com/w${w}/${cc}.png`;
}

export const langByCode = (code: string): Lang | undefined => LANGUAGES.find((l) => l.code === code);
export const langName = (code: string): string => langByCode(code)?.name || code;
export const isSupportedLang = (code: string): boolean => LANGUAGES.some((l) => l.code === code);
