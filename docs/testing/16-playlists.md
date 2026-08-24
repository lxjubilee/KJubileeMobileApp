# 16 — Playlists

Covers `screens/PlaylistDetails/index.tsx` (play/shuffle/add, overflow menu:
rename/reorder/delete, per-item remove/like) and `screens/PlaylistAddSongs/index.tsx`
(search-driven toggle picker). Backed by `/api/me/playlists*`.

---

### JLM-PLST-001 — Open a playlist
**Category:** Functional, Positive · **Priority:** P0 · **Platform:** Both
**Preconditions:** Signed in; a playlist with songs.
**Steps:**
1. Open a playlist from Library.
**Expected Result:** Blurred cover, back chevron, "⋮" menu, cover art, name, song count,
action row (Add Songs / shuffle / Play), and track rows.

---

### JLM-PLST-002 — Empty playlist state
**Category:** Boundary, UI/UX · **Priority:** P1 · **Platform:** Both
**Preconditions:** A playlist with 0 songs.
**Steps:**
1. Open it.
**Expected Result:** A musical-notes empty state + hint; shuffle disabled; Add Songs works.

---

### JLM-PLST-003 — Not-found / load-failed state
**Category:** Negative · **Priority:** P2 · **Platform:** Both
**Preconditions:** Deleted playlist id / detail fetch fails.
**Steps:**
1. Attempt to open it.
**Expected Result:** A Placeholder (not-found) shows; no crash.

---

### JLM-PLST-004 — Play and shuffle a playlist
**Category:** Functional, Integration · **Priority:** P0 · **Platform:** Both (Dev build)
**Preconditions:** Dev build; playlist with ≥ 2 songs.
**Steps:**
1. Tap Play; then Shuffle.
**Expected Result:** Play starts from the top; Shuffle plays a randomized order. Shuffle is
disabled when empty.

---

### JLM-PLST-005 — Add songs via search picker
**Category:** Functional, Integration · **Priority:** P0 · **Platform:** Both
**Preconditions:** PlaylistDetails open.
**Steps:**
1. Tap Add Songs → PlaylistAddSongs; type a query; tap a result to add; tap again to remove.
**Expected Result:** Autofocused debounced search; tapping toggles membership (add/remove)
in-session (`addItem`/`removeItem`); membership reflects the playlist's current contents.

---

### JLM-PLST-006 — Add-songs no-results and empty-query states
**Category:** Boundary · **Priority:** P2 · **Platform:** Both
**Preconditions:** PlaylistAddSongs open.
**Steps:**
1. Leave query empty; then type a non-matching query.
**Expected Result:** Empty query → empty list; non-matching → "no results for {query}".

---

### JLM-PLST-007 — Add-songs does not disturb the Search tab
**Category:** Regression · **Priority:** P2 · **Platform:** Both
**Preconditions:** A query exists on the Search tab.
**Steps:**
1. Use PlaylistAddSongs, then return to the Search tab.
**Expected Result:** The Search tab's query/results/recent are unchanged (separate local
repository/state).

---

### JLM-PLST-008 — Rename playlist
**Category:** Functional · **Priority:** P1 · **Platform:** Both
**Preconditions:** PlaylistDetails open.
**Steps:**
1. Open "⋮" → Rename; change the name; confirm.
**Expected Result:** PlaylistNameDialog prefilled; on confirm the name updates
(`renamePlaylist`) and the header reflects it.

---

### JLM-PLST-009 — Reorder items (edit mode)
**Category:** Functional · **Priority:** P1 · **Platform:** Both
**Preconditions:** Playlist with > 1 item.
**Steps:**
1. "⋮" → Reorder; move rows up/down; tap Done.
2. Reopen the playlist.
**Expected Result:** Reorder option only appears when > 1 item; Done saves the new order
(`reorderPlaylistItems`) and it persists; Cancel discards changes.

---

### JLM-PLST-010 — Remove an item
**Category:** Functional · **Priority:** P1 · **Platform:** Both
**Preconditions:** Playlist with songs.
**Steps:**
1. Tap a row's "⋮" → Remove.
**Expected Result:** The item is removed (`removeItem`); count decrements; membership updates.

---

### JLM-PLST-011 — Like a song from the item menu
**Category:** Functional · **Priority:** P2 · **Platform:** Both
**Preconditions:** Playlist item open menu.
**Steps:**
1. Tap Like in the per-item TrackOptions.
**Expected Result:** Song like toggles and reflects in Liked Songs.

---

### JLM-PLST-012 — Delete playlist
**Category:** Functional · **Priority:** P0 · **Platform:** Both
**Preconditions:** PlaylistDetails open.
**Steps:**
1. "⋮" → Delete → confirm in ConfirmDialog.
**Expected Result:** `deletePlaylist` runs; navigates back; the playlist is gone from Library.

---

### JLM-PLST-013 — Detail refetches on focus
**Category:** Integration · **Priority:** P1 · **Platform:** Both
**Preconditions:** Modify a playlist elsewhere.
**Steps:**
1. Return to PlaylistDetails.
**Expected Result:** Detail refetches on focus; content is current.

---

### JLM-PLST-014 — Play a specific track from the playlist
**Category:** Functional · **Priority:** P1 · **Platform:** Both (Dev build)
**Preconditions:** Dev build; playlist with songs.
**Steps:**
1. Tap a track row.
**Expected Result:** Playback starts from that track with the playlist as the queue.

---

### JLM-PLST-015 — Modal mount/hand-off timing (freeze guard)
**Category:** Regression, Compatibility · **Priority:** P1 · **Platform:** Android
**Preconditions:** PlaylistDetails open.
**Steps:**
1. Rapidly open/close the "⋮" menu; open Rename right after closing the menu; delete.
**Expected Result:** Menu and dialogs mount only while visible with the intended hand-off
delays (~260/350ms); touches stay responsive; the UI does not freeze.

---

### JLM-PLST-016 — Fallback track rendering for unresolved items
**Category:** Integration, Boundary · **Priority:** P2 · **Platform:** Both
**Preconditions:** A playlist item whose `song_id` isn't in the local catalog index.
**Steps:**
1. Open the playlist.
**Expected Result:** The item renders via a `fallbackTrack` built from server fields (cover
absolutized against kjubilee.com); no blank row, no crash.

---

### JLM-PLST-017 — Playlist creation then immediate navigation
**Category:** Integration, Regression · **Priority:** P1 · **Platform:** Both
**Preconditions:** On Library.
**Steps:**
1. Create a playlist and let it navigate to the new PlaylistDetails.
**Expected Result:** After the ~350ms delay the new (empty) playlist opens correctly; add
songs works immediately.
