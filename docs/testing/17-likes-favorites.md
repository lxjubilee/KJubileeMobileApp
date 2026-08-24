# 17 — Likes / Favorites

Covers `likesSlice`, `likesApi`, `likeIds`, the `LikedSongs` screen, and cross-surface
heart consistency. Server-backed (`/api/me/likes`), keys persisted for cold-start paint.

---

### JLM-LIKE-001 — Like a song (optimistic)
**Category:** Functional, Positive, Integration · **Priority:** P0 · **Platform:** Both
**Preconditions:** Signed in; a song visible (album/search/player).
**Steps:**
1. Tap the heart on a track.
**Expected Result:** Heart fills immediately; `like('song', songUuid)` POSTs; the song
appears in Liked Songs.

---

### JLM-LIKE-002 — Unlike a song
**Category:** Functional · **Priority:** P0 · **Platform:** Both
**Preconditions:** A liked song.
**Steps:**
1. Tap the filled heart.
**Expected Result:** Heart empties; `unlike('song', songUuid)` DELETEs; removed from Liked
Songs.

---

### JLM-LIKE-003 — Optimistic revert on API failure
**Category:** Negative, Integration, Regression · **Priority:** P0 · **Platform:** Both
**Preconditions:** Force the likes API to fail (offline / 500).
**Steps:**
1. Tap a heart with the API failing.
**Expected Result:** Heart flips optimistically then reverts when the call fails; final state
matches the server; no phantom like.

---

### JLM-LIKE-004 — Like an album
**Category:** Functional · **Priority:** P1 · **Platform:** Both
**Preconditions:** Album open.
**Steps:**
1. Tap the album heart.
**Expected Result:** `toggleAlbumLike` keyed by `albumUuid`; album appears in the Library
albums grid.

---

### JLM-LIKE-005 — Cross-surface heart consistency
**Category:** Integration, Regression · **Priority:** P1 · **Platform:** Both
**Preconditions:** A song shown in multiple places (album list, player, liked songs, search).
**Steps:**
1. Like it in one place; view the others.
**Expected Result:** The liked state is consistent everywhere (shared membership set); no
stale hearts.

---

### JLM-LIKE-006 — Liked hearts paint on cold start (persisted keys)
**Category:** Integration, Performance · **Priority:** P1 · **Platform:** Both
**Preconditions:** Has liked songs/albums; relaunch (briefly offline).
**Steps:**
1. Relaunch and open an album with a liked song before the network resolves.
**Expected Result:** Hearts paint from persisted keys immediately, then `fetchLikes`
revalidates against the server.

---

### JLM-LIKE-007 — Liked Songs screen
**Category:** Functional · **Priority:** P0 · **Platform:** Both
**Preconditions:** Has liked songs.
**Steps:**
1. Open Library → Liked Songs.
**Expected Result:** A "Favorites" list of liked tracks (hearts pre-set); tap plays;
toggle-favorite and "⋮" options work. Not language-filtered.

---

### JLM-LIKE-008 — Liked Songs empty state
**Category:** Boundary · **Priority:** P1 · **Platform:** Both
**Preconditions:** No liked songs.
**Steps:**
1. Open Liked Songs.
**Expected Result:** A heart-outline Placeholder empty state.

---

### JLM-LIKE-009 — Liked Songs loading state
**Category:** UI/UX · **Priority:** P2 · **Platform:** Both
**Preconditions:** Catalog resolving.
**Steps:**
1. Open Liked Songs before catalog/likes resolve.
**Expected Result:** A Loader until liked tracks are resolved against the catalog.

---

### JLM-LIKE-010 — Likes cleared on sign-out / account switch
**Category:** Security, Regression · **Priority:** P0 · **Platform:** Both
**Preconditions:** Signed in with likes; sign out; sign into another account.
**Steps:**
1. Sign out; sign in as a different user.
**Expected Result:** First account's likes cleared on `clearSession`/`signOut`; second
account shows only its own likes.

---

### JLM-LIKE-011 — Play a liked song from Liked Songs
**Category:** Functional · **Priority:** P1 · **Platform:** Both (Dev build)
**Preconditions:** Dev build; liked songs present.
**Steps:**
1. Tap a liked track.
**Expected Result:** Playback starts with the liked list as the queue.

---

### JLM-LIKE-012 — Like a track without a track number is unavailable
**Category:** Boundary · **Priority:** P2 · **Platform:** Both
**Preconditions:** A track with no track number (`songUuid` null).
**Steps:**
1. Attempt to like it.
**Expected Result:** The like action no-ops gracefully; no invalid API call.
