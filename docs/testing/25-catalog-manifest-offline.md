# 25 — Catalog Manifest, Mobile Config & Offline

Covers `manifestClient` (chunked SWR cache), `catalogIndex`, `mobileConfigClient`,
`applyMobileConfig`, and offline behavior.

---

### JLM-CTLG-001 — First-ever launch fetches the manifest
**Category:** Integration, Performance · **Priority:** P0 · **Platform:** Both
**Preconditions:** Catalog cold + Online.
**Steps:**
1. Fresh install; launch and wait for Home content.
**Expected Result:** `GET /music/catalog-manifest.json` succeeds; content populates; the
manifest is cached in chunks.

---

### JLM-CTLG-002 — Warm launch serves cache instantly + revalidates
**Category:** Performance, Integration · **Priority:** P0 · **Platform:** Both
**Preconditions:** Catalog warm.
**Steps:**
1. Relaunch.
**Expected Result:** Cached chunked snapshot is served immediately; a background revalidation
runs; the UI is usable without waiting on the network.

---

### JLM-CTLG-003 — Background update swaps catalog app-wide
**Category:** Integration · **Priority:** P1 · **Platform:** Both
**Preconditions:** A newer manifest (`generated` changed) on CDN.
**Steps:**
1. Launch warm; let revalidation finish.
**Expected Result:** On change, cache is replaced and `onCatalogUpdated` invalidates the
catalog index; the whole app (Home, Browse, Search) reflects the new catalog.

---

### JLM-CTLG-004 — Chunked cache integrity (partial write never used)
**Category:** Boundary, Regression · **Priority:** P1 · **Platform:** Android
**Preconditions:** Interrupt a cache write (kill mid-save) to leave partial chunks.
**Steps:**
1. Force a partial cache write; relaunch.
**Expected Result:** The meta record is written last; a partial/incomplete chunk set is not
treated as valid (read aborts if any chunk missing) → falls back to network, no corrupt data.

---

### JLM-CTLG-005 — Offline after first launch (catalog)
**Category:** Compatibility, Integration · **Priority:** P0 · **Platform:** Both
**Preconditions:** Catalog warm; go Offline.
**Steps:**
1. Launch offline; browse Home/Browse/Search.
**Expected Result:** Catalog works fully from the cached snapshot; artwork may be limited by
connectivity but the catalog data is available.

---

### JLM-CTLG-006 — Manifest HTTP error handling
**Category:** Negative · **Priority:** P1 · **Platform:** Both
**Preconditions:** CDN returns non-200.
**Steps:**
1. Launch cold with the CDN erroring.
**Expected Result:** Throws `catalog manifest HTTP <status>`; warm cache (if any) is kept;
`initialLoad` reset so a later retry can succeed.

---

### JLM-CTLG-007 — Mobile config overlays Home categories
**Category:** Integration, Functional · **Priority:** P1 · **Platform:** Both
**Preconditions:** `GET /api/mobile/config` returns categories.
**Steps:**
1. Launch and inspect Home rails/chips.
**Expected Result:** Categories are ordered by `order`; content/persona/album/music_type
categories become rails with chips (Home, Inspire Family, Family Friendly, Children Music,
Music Type). Music-type rails list albums whose genres match (case-insensitive, ≤ 20).

---

### JLM-CTLG-008 — Mobile config fails open to manifest home
**Category:** Negative, Integration, Regression · **Priority:** P0 · **Platform:** Both
**Preconditions:** Force `/api/mobile/config` to fail / timeout (6s).
**Steps:**
1. Launch with the config endpoint failing.
**Expected Result:** Config resolves null (never rejects); Home falls back to the
manifest-derived feed. Home is never empty due to a config problem.

---

### JLM-CTLG-009 — Mobile config cached and diff-revalidated
**Category:** Integration · **Priority:** P2 · **Platform:** Both
**Preconditions:** Config cached; admin changes it (no `generated` bump).
**Steps:**
1. Launch warm; let revalidation run.
**Expected Result:** SWR serves the cached config, then a deep `JSON.stringify` compare
detects the change and rebuilds Home via `onMobileConfigUpdated`.

---

### JLM-CTLG-010 — Unresolved config refs are skipped
**Category:** Boundary, Integration · **Priority:** P2 · **Platform:** Both
**Preconditions:** Config references an album/artist/collection not in the catalog.
**Steps:**
1. Launch with such a config.
**Expected Result:** Unresolved refs are skipped (not rendered as blanks); resolved items
still show; loose albums group into one rail.

---

### JLM-CTLG-011 — Empty rails dropped
**Category:** UI/UX · **Priority:** P2 · **Platform:** Both
**Preconditions:** A category resolves to only artwork-less/empty content.
**Steps:**
1. Inspect Home.
**Expected Result:** Empty rails are removed by `useVisibleRails`; no empty section headers.

---

### JLM-CTLG-012 — Duration backfill for tracks lacking a manifest duration
**Category:** Integration, Performance · **Priority:** P2 · **Platform:** Both (Dev build)
**Preconditions:** Tracks whose manifest has no duration.
**Steps:**
1. View a track row / play a track.
**Expected Result:** `mp3Duration` range-fetches the header to derive the duration (skeleton
while loading); returns 0/hidden on failure without blocking; per-URL cached.

---

### JLM-CTLG-013 — resetManifestCache / resetMobileConfigCache (test helpers)
**Category:** Integration · **Priority:** P2 · **Platform:** Both
**Preconditions:** Test/dev harness.
**Steps:**
1. Use the reset helpers, relaunch.
**Expected Result:** Caches clear and the next launch behaves like cold (fetches fresh).
