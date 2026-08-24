# 12 — Album Details

Covers `screens/AlbumDetails/index.tsx` — header, action row (like/share/add/shuffle/
play), track list with `TrackRow`, `AlbumRatingSummary`, and `ReviewComposer`.

---

### JLM-ALBM-001 — Album details render
**Category:** Functional, Positive · **Priority:** P0 · **Platform:** Both
**Preconditions:** Signed in; open a valid album.
**Steps:**
1. Open an album from Home/Browse/Search.
**Expected Result:** Blurred cover background + gradient, back chevron, cover art, title,
artist link, year·track-count, genre pill(s), action row, rating summary, and the track list.

---

### JLM-ALBM-002 — Loading and not-found states
**Category:** UI/UX, Negative · **Priority:** P1 · **Platform:** Both
**Preconditions:** (a) slow fetch, (b) invalid album id (e.g. via deep link).
**Steps:**
1. Open with a slow network; then open a bad id.
**Expected Result:** (a) Loader while fetching. (b) "albumNotFound" state, no crash.

---

### JLM-ALBM-003 — Play the album
**Category:** Functional, Integration · **Priority:** P0 · **Platform:** Both (Dev build)
**Preconditions:** Dev build; Signed in (Paid); album has playable tracks.
**Steps:**
1. Tap **Play**.
**Expected Result:** Queue loads from track 1; playback starts; MiniPlayer/FloatingMiniPlayer
shows.

---

### JLM-ALBM-004 — Play a specific track (playFrom)
**Category:** Functional · **Priority:** P0 · **Platform:** Both (Dev build)
**Preconditions:** Dev build; album open.
**Steps:**
1. Tap a track row mid-list.
**Expected Result:** Playback starts from that track; the queue is the album; that row shows
the active highlight.

---

### JLM-ALBM-005 — Shuffle play
**Category:** Functional · **Priority:** P1 · **Platform:** Both (Dev build)
**Preconditions:** Dev build; album with ≥ 2 tracks.
**Steps:**
1. Tap the shuffle action.
**Expected Result:** Playback starts in shuffled order.

---

### JLM-ALBM-006 — Like/unlike album (optimistic)
**Category:** Functional, Integration · **Priority:** P0 · **Platform:** Both
**Preconditions:** Signed in; album open.
**Steps:**
1. Tap the heart; observe. Tap again.
**Expected Result:** Heart toggles immediately (optimistic); `toggleAlbumLike` calls the API
keyed by `albumUuid`; state persists. On API failure the heart reverts.

---

### JLM-ALBM-007 — Share album
**Category:** Functional, Integration · **Priority:** P1 · **Platform:** Both
**Preconditions:** Album open.
**Steps:**
1. Tap the share action.
**Expected Result:** Native share sheet opens with `https://kjubilee.com/album?c=<CODE>`
(iOS uses `url`; Android folds it into the message).

---

### JLM-ALBM-008 — Add whole album to a playlist
**Category:** Functional, Integration · **Priority:** P1 · **Platform:** Both
**Preconditions:** Signed in; album with tracks.
**Steps:**
1. Tap the album playlist-plus action; pick or create a playlist.
**Expected Result:** All album tracks are added (`bulkAdd`); membership/counts update. The
action is disabled when the album has no tracks.

---

### JLM-ALBM-009 — Per-track like heart
**Category:** Functional · **Priority:** P1 · **Platform:** Both
**Preconditions:** Album open.
**Steps:**
1. Toggle the favorite heart on a track row.
**Expected Result:** Song like toggles (keyed by `songUuid`); reflected in Liked Songs.

---

### JLM-ALBM-010 — Track "⋮" options
**Category:** Functional · **Priority:** P1 · **Platform:** Both
**Preconditions:** Album open.
**Steps:**
1. Tap "⋮" on a track.
**Expected Result:** TrackOptions opens (Like, Add to playlist, etc.).

---

### JLM-ALBM-011 — Artist link navigates to ArtistDetails
**Category:** Functional · **Priority:** P2 · **Platform:** Both
**Preconditions:** Album open.
**Steps:**
1. Tap the artist name.
**Expected Result:** Navigates to ArtistDetails.

---

### JLM-ALBM-012 — Rating summary: Rate opens composer
**Category:** Functional · **Priority:** P1 · **Platform:** Both
**Preconditions:** Signed in; album open.
**Steps:**
1. Tap "Rate this album" in AlbumRatingSummary.
**Expected Result:** ReviewComposer (album target) opens.

---

### JLM-ALBM-013 — Rating summary: See all opens AlbumReviews
**Category:** Functional · **Priority:** P2 · **Platform:** Both
**Preconditions:** Album with reviews.
**Steps:**
1. Tap "See all reviews".
**Expected Result:** Navigates to AlbumReviews for the album.

---

### JLM-ALBM-014 — Per-song rating control opens composer
**Category:** Functional · **Priority:** P2 · **Platform:** Both
**Preconditions:** Album open.
**Steps:**
1. Tap a track's SongRatingControl "Rate" pill.
**Expected Result:** ReviewComposer (song target, keyed by `songUuid`) opens.

---

### JLM-ALBM-015 — Track without a track number can't be liked/added
**Category:** Boundary, Regression · **Priority:** P2 · **Platform:** Both
**Preconditions:** A track lacking a track number (`trackSongUuid` null).
**Steps:**
1. Attempt to like/add/rate such a track.
**Expected Result:** The action is unavailable/no-ops gracefully (uuid is null); no crash,
no bad API call.

---

### JLM-ALBM-016 — FloatingMiniPlayer present while playing
**Category:** UI/UX · **Priority:** P2 · **Platform:** Both (Dev build)
**Preconditions:** Something is playing; on AlbumDetails.
**Steps:**
1. Observe the bottom of the screen.
**Expected Result:** A bottom-pinned FloatingMiniPlayer shows (the tab-bar MiniPlayer is
hidden on full-screen pushes).
