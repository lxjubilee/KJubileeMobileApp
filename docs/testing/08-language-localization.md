# 08 — Language & Localization

Covers `LanguagePanel.tsx`, `setAppLanguage` (`settingsSlice`), the 40 locale files,
i18next fallback, and the catalog-language filter.

---

### JLM-LANG-001 — Open the language panel
**Category:** Functional · **Priority:** P1 · **Platform:** Both
**Preconditions:** On Home.
**Steps:**
1. Tap the language flag button.
**Expected Result:** LanguagePanel slides up with a search box, "Recently Used" section, and
an alphabetical "All Languages" list (English pinned first) with round flags and an active
check on the current language.

---

### JLM-LANG-002 — Switch UI language updates all copy
**Category:** Functional, Positive · **Priority:** P0 · **Platform:** Both
**Preconditions:** Panel open; on English.
**Steps:**
1. Select a fully-translated language (e.g. Spanish).
**Expected Result:** UI strings across screens switch to the selected language; selection
persists (`settings.language`) and survives relaunch.

---

### JLM-LANG-003 — Untranslated language falls back to English
**Category:** Functional, Boundary · **Priority:** P1 · **Platform:** Both
**Preconditions:** Panel open.
**Steps:**
1. Select a language whose locale file is incomplete.
**Expected Result:** Missing keys fall back to English per i18next config; no raw key strings
(e.g. `home.title`) are shown to the user.

---

### JLM-LANG-004 — Catalog content filters by selected language
**Category:** Integration, Functional · **Priority:** P1 · **Platform:** Both
**Preconditions:** Catalog has content in multiple languages.
**Steps:**
1. Switch language and observe Home.
**Expected Result:** The catalog filter follows the language; content available for that
language shows; missing content shows "coming soon" (see JLM-HOME-012).

---

### JLM-LANG-005 — Recently Used list updates
**Category:** Functional · **Priority:** P2 · **Platform:** Both
**Preconditions:** Switched among a few languages.
**Steps:**
1. Reopen the panel.
**Expected Result:** Recently selected languages appear under "Recently Used".

---

### JLM-LANG-006 — Search filters the language list
**Category:** Functional · **Priority:** P2 · **Platform:** Both
**Preconditions:** Panel open.
**Steps:**
1. Type part of a language name.
**Expected Result:** The list filters to matching languages; clearing restores the full list.

---

### JLM-LANG-007 — Personal collections are NOT language-filtered
**Category:** Functional, Regression · **Priority:** P1 · **Platform:** Both
**Preconditions:** Signed in with liked songs/followed artists/liked albums across languages;
UI set to a non-English language.
**Steps:**
1. Open Liked Songs, Followed Artists, and the Library albums grid.
**Expected Result:** All personal items remain visible regardless of the current language
filter (only the browse/home catalog is language-scoped).

---

### JLM-LANG-008 — Panel mounts only while open (freeze guard)
**Category:** Regression, Compatibility · **Priority:** P1 · **Platform:** Android
**Preconditions:** On Home.
**Steps:**
1. Open and close the LanguagePanel repeatedly.
**Expected Result:** The native `<Modal>` is only mounted while visible; touches remain
responsive; the UI does not wedge (Old-Arch modal constraint).

---

### JLM-LANG-009 — RTL / long-string layout sanity
**Category:** UI/UX, Compatibility · **Priority:** P2 · **Platform:** Both
**Preconditions:** Select a language with long translations (and RTL if supported, e.g. Arabic).
**Steps:**
1. Browse key screens (Home, Player, Profile, Auth).
**Expected Result:** Text does not overflow/truncate critically; buttons and labels remain
legible; layout does not break.

---

### JLM-LANG-010 — English pinned first regardless of alphabet
**Category:** UI/UX · **Priority:** P2 · **Platform:** Both
**Preconditions:** Panel open.
**Steps:**
1. Scroll the "All Languages" list.
**Expected Result:** English is pinned at the top; the remainder is alphabetical.
