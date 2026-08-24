# 07 — Home Feed

Covers `screens/Home/index.tsx`, `HeroCarousel`, `Rail`, `HomeHeader` (collapsing
header + category chips), pull-to-refresh, and all feed states.

---

### JLM-HOME-001 — Home feed renders hero + rails
**Category:** Functional, Positive · **Priority:** P0 · **Platform:** Both
**Preconditions:** Signed in; Catalog warm; Online.
**Steps:**
1. Open the Home tab.
**Expected Result:** HeroCarousel at top followed by multiple category Rails; header shows
brand logo, language flag, profile button, and category chips.

---

### JLM-HOME-002 — Initial loading state
**Category:** UI/UX · **Priority:** P1 · **Platform:** Both
**Preconditions:** Catalog cold (first launch), Online.
**Steps:**
1. Open Home before the feed resolves.
**Expected Result:** A full-screen Loader shows until the feed is ready; no half-rendered
rails.

---

### JLM-HOME-003 — Failed feed with no cache shows error state
**Category:** Negative · **Priority:** P1 · **Platform:** Both
**Preconditions:** Catalog cold + Offline.
**Steps:**
1. Open Home.
**Expected Result:** Error text is shown (no crash, no infinite spinner); retry becomes
possible once online.

---

### JLM-HOME-004 — Pull-to-refresh
**Category:** Functional · **Priority:** P1 · **Platform:** Both
**Preconditions:** Home populated.
**Steps:**
1. Pull down to refresh.
**Expected Result:** RefreshControl spinner shows while the feed is present; feed refetches
(`fetchHomeFeed`) and updates; spinner dismisses.

---

### JLM-HOME-005 — Hero auto-advance and manual swipe
**Category:** UI/UX · **Priority:** P2 · **Platform:** Both
**Preconditions:** Home populated with ≥ 2 heroes.
**Steps:**
1. Watch the hero auto-advance; then swipe manually.
**Expected Result:** Heroes auto-rotate; manual swipe works and pauses/resumes per design;
`jubilee-inspire` is pinned and `gabriel-inspire` excluded from heroes.

---

### JLM-HOME-006 — Hero Play starts playback
**Category:** Functional, Integration · **Priority:** P0 · **Platform:** Both (Dev build)
**Preconditions:** Home populated; Dev build; Signed in (Paid to avoid gate).
**Steps:**
1. Tap **Play** on a hero.
**Expected Result:** The album's tracks load into the queue and playback starts; MiniPlayer
appears above the tab bar.

---

### JLM-HOME-007 — Hero "Open" navigates to album/artist
**Category:** Functional · **Priority:** P1 · **Platform:** Both
**Preconditions:** Home populated.
**Steps:**
1. Tap **Open** on a hero.
**Expected Result:** Navigates to the corresponding AlbumDetails/ArtistDetails.

---

### JLM-HOME-008 — Rail "See all" navigates to AlbumList
**Category:** Functional · **Priority:** P1 · **Platform:** Both
**Preconditions:** A rail with a "See all" affordance.
**Steps:**
1. Tap "See all" on a rail.
**Expected Result:** Opens AlbumListScreen showing every album for that rail/artist.

---

### JLM-HOME-009 — Category chips filter the feed
**Category:** Functional · **Priority:** P1 · **Platform:** Both
**Preconditions:** Home populated with multiple category labels.
**Steps:**
1. Tap a category chip (e.g. Family Friendly).
**Expected Result:** The visible rails filter to the selected category; the "All"/Home chip
restores the full feed.

---

### JLM-HOME-010 — Collapsing header hides chips on scroll-down, shows on scroll-up
**Category:** UI/UX, Regression · **Priority:** P1 · **Platform:** Both
**Preconditions:** Home populated (scrollable).
**Steps:**
1. Scroll down, then up.
**Expected Result:** Category chips collapse/hide on downward scroll and reappear on upward
scroll; header background cross-fades from transparent to solid as content scrolls under it.

---

### JLM-HOME-011 — Artwork-less items hidden from rails
**Category:** Functional, Regression · **Priority:** P1 · **Platform:** Both
**Preconditions:** Catalog contains items without artwork.
**Steps:**
1. Compare rendered rails to raw catalog counts.
**Expected Result:** Items lacking artwork are filtered out via `useVisibleAlbums`/
`useVisibleRails`; rails may appear shorter than the raw data — this is expected, not a bug.

---

### JLM-HOME-012 — "Coming soon" for a non-English language with no catalog
**Category:** Functional, Boundary · **Priority:** P1 · **Platform:** Both
**Preconditions:** Switch UI/catalog to a language with no catalog content.
**Steps:**
1. Open Home in that language.
**Expected Result:** A "coming soon" empty state is shown for that language rather than an
error or a blank feed. Switching back to English restores content.

---

### JLM-HOME-013 — Profile button opens Profile; language button opens LanguagePanel
**Category:** Functional · **Priority:** P2 · **Platform:** Both
**Preconditions:** On Home.
**Steps:**
1. Tap the profile avatar; go back. Tap the language flag.
**Expected Result:** Profile button navigates to Profile; language flag opens the
LanguagePanel slide-up.

---

### JLM-HOME-014 — Refresh preserves scroll/feed while updating
**Category:** UI/UX · **Priority:** P2 · **Platform:** Both
**Preconditions:** Home populated and scrolled.
**Steps:**
1. Trigger a background catalog update.
**Expected Result:** The feed updates without jarring scroll jumps or flicker; the persisted
`home.feed` cache means content shows immediately on next cold start.

---

### JLM-HOME-015 — Rapid chip switching is stable
**Category:** Performance, Regression · **Priority:** P2 · **Platform:** Both
**Preconditions:** Home populated with many categories.
**Steps:**
1. Rapidly tap between category chips.
**Expected Result:** No dropped frames beyond acceptable, no crash, no stuck filter state.
