# 10 — Search

Covers `screens/Search/index.tsx`, `searchSlice` (`runSearch`, recent searches),
debounced query, and result sections.

---

### JLM-SRCH-001 — Search returns artists, albums, tracks
**Category:** Functional, Positive · **Priority:** P0 · **Platform:** Both
**Preconditions:** Signed in; Catalog warm.
**Steps:**
1. Open Search; type a term known to match content.
**Expected Result:** After the 350ms debounce, results show a horizontal Artists row, a
horizontal Albums row, and a Tracks list.

---

### JLM-SRCH-002 — Debounce coalesces rapid typing
**Category:** Performance, Functional · **Priority:** P1 · **Platform:** Both
**Preconditions:** On Search.
**Steps:**
1. Type a multi-character query quickly.
**Expected Result:** Search fires ~350ms after typing stops (not per keystroke); no
excessive queries; UI stays responsive.

---

### JLM-SRCH-003 — No results state
**Category:** Negative, Boundary · **Priority:** P1 · **Platform:** Both
**Preconditions:** On Search.
**Steps:**
1. Type a query guaranteed to match nothing (e.g. `zzzqqq`).
**Expected Result:** A "no results for {query}" message is shown; no crash.

---

### JLM-SRCH-004 — Clear button empties the query
**Category:** Functional · **Priority:** P2 · **Platform:** Both
**Preconditions:** A query is entered.
**Steps:**
1. Tap the "×" clear icon.
**Expected Result:** Query cleared; view returns to the empty-query "Recent" state.

---

### JLM-SRCH-005 — Recent searches populate on submit
**Category:** Functional · **Priority:** P1 · **Platform:** Both
**Preconditions:** On Search.
**Steps:**
1. Submit a search term.
2. Clear the box.
**Expected Result:** The submitted term appears under "Recent"; tapping it refills the query
and re-runs the search.

---

### JLM-SRCH-006 — Recent searches limit (boundary)
**Category:** Boundary · **Priority:** P2 · **Platform:** Both
**Preconditions:** On Search.
**Steps:**
1. Submit 11 distinct search terms.
**Expected Result:** Only the most recent 10 are kept (`RECENT_SEARCHES_LIMIT`); the oldest
is evicted.

---

### JLM-SRCH-007 — Clear all recent searches
**Category:** Functional · **Priority:** P2 · **Platform:** Both
**Preconditions:** Recent searches present.
**Steps:**
1. Tap "Clear" in the Recent section.
**Expected Result:** All recent entries removed; empty Recent state.

---

### JLM-SRCH-008 — Recent searches persist across relaunch
**Category:** Integration · **Priority:** P2 · **Platform:** Both
**Preconditions:** Recent searches present.
**Steps:**
1. Relaunch and open Search.
**Expected Result:** Recent list is restored (only `search.recent` is persisted).

---

### JLM-SRCH-009 — Tapping a track result plays it
**Category:** Functional, Integration · **Priority:** P0 · **Platform:** Both (Dev build)
**Preconditions:** Dev build; results shown.
**Steps:**
1. Tap a track row in results.
**Expected Result:** Playback starts for that track; MiniPlayer appears.

---

### JLM-SRCH-010 — Track "⋮" opens track options
**Category:** Functional · **Priority:** P1 · **Platform:** Both
**Preconditions:** Results shown.
**Steps:**
1. Tap "⋮" on a track row.
**Expected Result:** TrackOptions (via `usePlaylistMenu`) opens with Like / Add to playlist.

---

### JLM-SRCH-011 — Tapping an artist/album result navigates
**Category:** Functional · **Priority:** P1 · **Platform:** Both
**Preconditions:** Results shown.
**Steps:**
1. Tap an ArtistCard, then (back) an AlbumCard.
**Expected Result:** Navigate to ArtistDetails / AlbumDetails respectively.

---

### JLM-SRCH-012 — Artwork-less results hidden
**Category:** Regression · **Priority:** P2 · **Platform:** Both
**Preconditions:** Query matches artwork-less items.
**Steps:**
1. Search and inspect results.
**Expected Result:** Artwork-less artists/albums/tracks are filtered from results.

---

### JLM-SRCH-013 — Whitespace / special-character query handled
**Category:** Negative, Boundary · **Priority:** P2 · **Platform:** Both
**Preconditions:** On Search.
**Steps:**
1. Enter only spaces; enter symbols like `%`, `"`, emoji.
**Expected Result:** No crash; substring match behaves sanely (spaces-only ≈ empty/no
results); no injection into any query.

---

### JLM-SRCH-014 — Local substring match scope
**Category:** Functional · **Priority:** P2 · **Platform:** Both
**Preconditions:** Manifest data source (prod).
**Steps:**
1. Search partial album/artist titles and a track title.
**Expected Result:** Matches album & artist titles and up to the scanned track set (client
local match); results are reasonable for partial substrings.
