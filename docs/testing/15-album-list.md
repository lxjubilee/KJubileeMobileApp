# 15 — Album List (See All)

Covers `screens/AlbumList/index.tsx` — the "See all" grid target from Home rails.

---

### JLM-ALST-001 — See-all grid renders
**Category:** Functional, Positive · **Priority:** P1 · **Platform:** Both
**Preconditions:** From a Home rail, tap "See all".
**Steps:**
1. Open AlbumList.
**Expected Result:** Back chevron + title header, a 2-column AlbumCard grid of every album
for that rail/artist.

---

### JLM-ALST-002 — Loading state
**Category:** UI/UX · **Priority:** P2 · **Platform:** Both
**Preconditions:** Slow fetch.
**Steps:**
1. Open AlbumList.
**Expected Result:** Loader until the grid is ready.

---

### JLM-ALST-003 — Dedupe by id
**Category:** Regression · **Priority:** P2 · **Platform:** Both
**Preconditions:** Potential duplicate albums.
**Steps:**
1. Scan the grid.
**Expected Result:** No duplicate albums.

---

### JLM-ALST-004 — Tap album opens AlbumDetails
**Category:** Functional · **Priority:** P1 · **Platform:** Both
**Preconditions:** AlbumList open.
**Steps:**
1. Tap an AlbumCard.
**Expected Result:** Navigates to AlbumDetails.

---

### JLM-ALST-005 — FloatingMiniPlayer present while playing
**Category:** UI/UX · **Priority:** P2 · **Platform:** Both (Dev build)
**Preconditions:** Something playing; AlbumList open.
**Steps:**
1. Observe the bottom of the screen.
**Expected Result:** FloatingMiniPlayer pinned at the bottom; tapping it opens the full player.

---

### JLM-ALST-006 — Back returns to Home
**Category:** Functional · **Priority:** P2 · **Platform:** Both
**Preconditions:** AlbumList open from Home.
**Steps:**
1. Tap back.
**Expected Result:** Returns to Home with prior scroll/state.
