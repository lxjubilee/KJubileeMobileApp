# 13 — Artist Details

Covers `screens/ArtistDetails/index.tsx` — hero, follow toggle (local-only), top
tracks, and discography.

---

### JLM-ARTS-001 — Artist details render
**Category:** Functional, Positive · **Priority:** P0 · **Platform:** Both
**Preconditions:** Signed in; open a valid artist.
**Steps:**
1. Open an artist.
**Expected Result:** Hero image + gradient, back chevron, name, monthly-listeners,
Follow/Following button, big Play-circle, persona summary + album/track stats, a "Popular"
track list, and a "Discography" horizontal album rail.

---

### JLM-ARTS-002 — Loading and not-found states
**Category:** UI/UX, Negative · **Priority:** P1 · **Platform:** Both
**Preconditions:** (a) slow fetch, (b) invalid artist id.
**Steps:**
1. Open slowly; then open a bad id.
**Expected Result:** (a) Loader. (b) "artistNotFound"; no crash.

---

### JLM-ARTS-003 — Follow/unfollow toggle
**Category:** Functional · **Priority:** P0 · **Platform:** Both
**Preconditions:** Artist open.
**Steps:**
1. Tap Follow; observe. Tap Following to unfollow.
**Expected Result:** Button icon/variant switches between Follow and Following
(`toggleFollowArtist`); the artist appears/disappears in FollowedArtists.

---

### JLM-ARTS-004 — Follow persists but is local-only (no cross-device sync)
**Category:** Functional, Regression · **Priority:** P1 · **Platform:** Both
**Preconditions:** Follow an artist; relaunch; also check a second device.
**Steps:**
1. Follow, relaunch device A. Sign into same account on device B.
**Expected Result:** Follow persists locally on device A (library slice persisted); it does
**not** sync to device B (no backend follow endpoint) — documented expected behavior.

---

### JLM-ARTS-005 — Play top tracks
**Category:** Functional, Integration · **Priority:** P0 · **Platform:** Both (Dev build)
**Preconditions:** Dev build; artist with top tracks.
**Steps:**
1. Tap the big Play-circle.
**Expected Result:** The artist's top tracks load and playback starts.

---

### JLM-ARTS-006 — Popular track tap plays from that track
**Category:** Functional · **Priority:** P1 · **Platform:** Both (Dev build)
**Preconditions:** Artist open.
**Steps:**
1. Tap a row in "Popular".
**Expected Result:** Playback starts from that track within the top-tracks queue.

---

### JLM-ARTS-007 — Popular track "⋮" options
**Category:** Functional · **Priority:** P2 · **Platform:** Both
**Preconditions:** Artist open.
**Steps:**
1. Tap "⋮" on a popular track.
**Expected Result:** TrackOptions opens.

---

### JLM-ARTS-008 — Discography album tap
**Category:** Functional · **Priority:** P1 · **Platform:** Both
**Preconditions:** Artist with albums.
**Steps:**
1. Tap an album in the Discography rail.
**Expected Result:** Navigates to AlbumDetails.

---

### JLM-ARTS-009 — Artist with only artwork-less albums is hidden upstream
**Category:** Regression, Boundary · **Priority:** P2 · **Platform:** Both
**Preconditions:** An artist whose albums all lack artwork.
**Steps:**
1. Verify such an artist does not appear in rails/search.
**Expected Result:** Artists with zero visible albums are hidden entirely from the catalog
index (so this detail screen is only reachable for artists with visible content).

---

### JLM-ARTS-010 — Parallel fetch resilience
**Category:** Integration, Negative · **Priority:** P2 · **Platform:** Both
**Preconditions:** One of artist/albums/top-tracks fetch fails.
**Steps:**
1. Open an artist with a partial backend failure.
**Expected Result:** The screen degrades gracefully (renders what loaded); no full crash on
a single failed sub-fetch.
