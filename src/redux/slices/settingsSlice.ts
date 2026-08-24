import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { i18n, DEFAULT_LANG } from '@/localization';

interface SettingsState {
  /** Selected app language (UI + catalog content filter). See localization/languages. */
  language: string;
}

const initialState: SettingsState = {
  language: DEFAULT_LANG,
};

const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    setLanguage(state, action: PayloadAction<string>) {
      state.language = action.payload;
    },
  },
});

export const { setLanguage } = settingsSlice.actions;

/**
 * Change the app language everywhere: persist the choice (catalog filter reads
 * `settings.language`) AND switch the i18next UI locale. i18next falls back to
 * English for languages that don't yet have a translation file — intended.
 */
export const setAppLanguage = createAsyncThunk(
  'settings/setAppLanguage',
  async (code: string, { dispatch }) => {
    dispatch(setLanguage(code));
    await i18n.changeLanguage(code);
    return code;
  },
);

export default settingsSlice.reducer;
