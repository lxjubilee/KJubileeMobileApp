# 11 — Library Hub

Covers `screens/Library/index.tsx` — shortcut cards, playlist list, create-playlist
dialog, albums grid, and focus refresh.

---

### JLM-LIB-001 — Library hub layout
**Category:** Functional, Positive · **Priority:** P0 · **Platform:** Both
**Preconditions:** Signed in.
**Steps:**
1. Open the Library tab.
**Expected Result:** Shows title + ProfileButton, two shortcut cards (Liked Songs w/ count,
Artists w/ follow count), a Playlists section with a "+" button, playlist rows, and an
Albums 2-column grid.

---

### JLM-LIB-002 — Liked Songs shortcut shows count and navigates
**Category:** Functional · **Priority:** P1 · **Platform:** Both
**Preconditions:** Signed in; has some liked songs.
**Steps:**
1. Note the count; tap the Liked Songs card.
**Expected Result:** Count matches liked-song total; navigates to LikedSongs.

---

### JLM-LIB-003 — Artists shortcut shows follow count and navigates
**Category:** Functional · **Priority:** P1 · **Platform:** Both
**Preconditions:** Signed in; follows some artists.
**Steps:**
1. Tap the Artists card.
**Expected Result:** Count matches followed count; navigates to FollowedArtists.

---

### JLM-LIB-004 — Create playlist via "+"
**Category:** Functional, Positive · **Priority:** P0 · **Platform:** Both
**Preconditions:** On Library.
**Steps:**
1. Tap "+"; enter a name; confirm.
**Expected Result:** PlaylistNameDialog opens; on confirm the playlist is created
(`createPlaylist`) and after ~350ms the app navigates to the new PlaylistDetails.

---

### JLM-LIB-005 — Create playlist name validation (boundary)
**Category:** Boundary, Negative · **Priority:** P1 · **Platform:** Both
**Preconditions:** Create dialog open.
**Steps:**
1. Leave name empty (observe confirm disabled); type 1 char; type 80; try 81.
**Expected Result:** Confirm disabled while empty; enabled at ≥ 1 char; input caps at 80
(`maxLength`).

---

### JLM-LIB-006 — Cancel create playlist
**Category:** Functional · **Priority:** P2 · **Platform:** Both
**Preconditions:** Create dialog open.
**Steps:**
1. Tap Cancel.
**Expected Result:** Dialog dismisses; no playlist created.

---

### JLM-LIB-007 — Default "My Favorites" playlist is hidden
**Category:** Functional, Regression · **Priority:** P1 · **Platform:** Both
**Preconditions:** Account with the default "My Favorites" playlist server-side.
**Steps:**
1. View the Playlists section.
**Expected Result:** "My Favorites" is not listed here (nor in playlist pickers); only
user-created playlists show.

---

### JLM-LIB-008 — Empty states
**Category:** UI/UX, Boundary · **Priority:** P1 · **Platform:** Both
**Preconditions:** Empty content account.
**Steps:**
1. Open Library.
**Expected Result:** Playlists section shows an "emptyPlaylists" message; Albums section
shows a Placeholder; shortcut counts read 0.

---

### JLM-LIB-009 — Playlist rows show name, song count, chevron
**Category:** UI/UX · **Priority:** P2 · **Platform:** Both
**Preconditions:** Has playlists.
**Steps:**
1. Inspect a playlist row; tap it.
**Expected Result:** Row shows name + song count + chevron; tap navigates to PlaylistDetails.

---

### JLM-LIB-010 — Albums grid shows liked albums
**Category:** Functional · **Priority:** P1 · **Platform:** Both
**Preconditions:** Has liked albums.
**Steps:**
1. Scroll to the Albums section; tap an album.
**Expected Result:** Liked albums render as a 2-col grid; tap opens AlbumDetails. (Not
language-filtered.)

---

### JLM-LIB-011 — Playlists refresh on focus
**Category:** Integration, Regression · **Priority:** P1 · **Platform:** Both
**Preconditions:** Create/rename/delete a playlist elsewhere, then return to Library.
**Steps:**
1. Return to the Library tab.
**Expected Result:** `fetchPlaylists` runs on focus; the list reflects the latest changes.

---

### JLM-LIB-012 — Library tab reset-on-tap
**Category:** Functional, Regression · **Priority:** P1 · **Platform:** Both
**Preconditions:** Navigated deep into the Library stack (e.g. Profile ▸ Change Password).
**Steps:**
1. Tap the Library tab icon.
**Expected Result:** The Library stack resets to the Library root (tabPress override), not
staying on the deep screen.
