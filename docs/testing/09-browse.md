# 09 — Browse

Covers `screens/Browse/index.tsx` — a 2-column grid of all albums via
`AlbumRepository.list()`.

---

### JLM-BRWS-001 — Browse renders a 2-column album grid
**Category:** Functional, Positive · **Priority:** P0 · **Platform:** Both
**Preconditions:** Signed in; Catalog warm.
**Steps:**
1. Open the Browse tab.
**Expected Result:** A 2-column FlatList of AlbumCards is shown with title/artist under each
square artwork.

---

### JLM-BRWS-002 — Loading state
**Category:** UI/UX · **Priority:** P1 · **Platform:** Both
**Preconditions:** Catalog cold.
**Steps:**
1. Open Browse before the list resolves.
**Expected Result:** A Loader is shown until the album list is ready.

---

### JLM-BRWS-003 — Duplicate albums de-duplicated
**Category:** Functional, Regression · **Priority:** P1 · **Platform:** Both
**Preconditions:** Catalog where an album could appear under multiple categories.
**Steps:**
1. Scan the grid for repeats.
**Expected Result:** Albums are deduped by id; each album appears once.

---

### JLM-BRWS-004 — Artwork-less albums hidden
**Category:** Functional, Regression · **Priority:** P1 · **Platform:** Both
**Preconditions:** Catalog contains artwork-less albums.
**Steps:**
1. Compare grid count to raw album count.
**Expected Result:** Albums without artwork are filtered out.

---

### JLM-BRWS-005 — Tapping an album opens AlbumDetails
**Category:** Functional · **Priority:** P0 · **Platform:** Both
**Preconditions:** On Browse.
**Steps:**
1. Tap any AlbumCard.
**Expected Result:** Navigates to AlbumDetails for that album (full-screen push over tabs);
a FloatingMiniPlayer appears if something is playing.

---

### JLM-BRWS-006 — Empty catalog renders blank without crash
**Category:** Negative, Boundary · **Priority:** P2 · **Platform:** Both
**Preconditions:** Simulate an empty album list.
**Steps:**
1. Open Browse with zero visible albums.
**Expected Result:** The grid renders empty (no explicit empty-state UI by design); no crash.

---

### JLM-BRWS-007 — Large catalog scroll performance
**Category:** Performance · **Priority:** P1 · **Platform:** Both
**Preconditions:** Full catalog loaded.
**Steps:**
1. Fling-scroll the entire grid top-to-bottom repeatedly.
**Expected Result:** Smooth scrolling, images lazy-load via expo-image, no significant jank
or memory spike; no dropped touches.
