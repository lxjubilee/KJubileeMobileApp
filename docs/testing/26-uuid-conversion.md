# 26 — Catalog-code ↔ UUIDv5 Conversion

Covers the most correctness-critical seam: `uuidv5.ts`, `songId.ts`
(`songUuid`/`albumUuid`/`trackSongUuid`), `likeIds.ts`, and the reverse maps. If this
drifts from the server, likes/playlists/reviews/analytics break **silently**.

> Best validated with a small unit/integration harness plus backend cross-checks.

---

### JLM-UUID-001 — songUuid matches the server derivation
**Category:** Integration, Security, Regression · **Priority:** P0 · **Platform:** Both
**Preconditions:** Known `(code, n)` pairs with server-computed UUIDs (from `app/api/src/ids.js`).
**Steps:**
1. Compute `songUuid(code, n)` in-app for several pairs.
2. Compare to the server values.
**Expected Result:** Byte-for-byte identical UUID v5 (SHA-1), input `'song:' + UPPER(code) + ':' + n`,
namespace `f3a1e2d4-5b6c-4d7e-8f90-1a2b3c4d5e6f`.

---

### JLM-UUID-002 — albumUuid matches the server derivation
**Category:** Integration, Regression · **Priority:** P0 · **Platform:** Both
**Preconditions:** Known album codes with server UUIDs.
**Steps:**
1. Compute `albumUuid(code)`; compare to server.
**Expected Result:** Matches; input `'album:' + UPPER(code)`, same namespace.

---

### JLM-UUID-003 — Uppercase normalization
**Category:** Boundary, Regression · **Priority:** P1 · **Platform:** Both
**Preconditions:** A code in lower/mixed case.
**Steps:**
1. Compute UUIDs for `abc123` and `ABC123`.
**Expected Result:** Both yield the **same** UUID (code is upper-cased before hashing).

---

### JLM-UUID-004 — trackSongUuid null when no track number
**Category:** Boundary, Negative · **Priority:** P0 · **Platform:** Both
**Preconditions:** A track with no `trackNumber`.
**Steps:**
1. Call `trackSongUuid(track)`.
**Expected Result:** Returns null; downstream like/playlist/analytics actions are skipped
gracefully (no 400, no crash).

---

### JLM-UUID-005 — Like membership key format
**Category:** Integration, Regression · **Priority:** P1 · **Platform:** Both
**Preconditions:** A liked song and a liked album.
**Steps:**
1. Inspect the membership keys.
**Expected Result:** `song:<uuid>` and `album:<uuid>` exactly match the server
`/api/me/likes/ids` strings (so likes render correctly).

---

### JLM-UUID-006 — Reverse map: server song_id → local Track
**Category:** Integration · **Priority:** P1 · **Platform:** Both
**Preconditions:** A playlist whose items reference server `song_id`s.
**Steps:**
1. Open the playlist.
**Expected Result:** Items resolve to local Tracks via the reverse map (`getSongUuidMap`);
resolvable items render with catalog metadata.

---

### JLM-UUID-007 — Reverse-map invalidation after catalog refresh
**Category:** Integration, Regression · **Priority:** P1 · **Platform:** Both
**Preconditions:** A background catalog update occurs while a playlist/likes are loaded.
**Steps:**
1. Trigger a catalog update; reopen a playlist / liked songs.
**Expected Result:** The song/album reverse maps invalidate and rebuild against the new
index; no stale/mismatched resolutions.

---

### JLM-UUID-008 — Determinism across launches
**Category:** Functional · **Priority:** P2 · **Platform:** Both
**Preconditions:** Same track across two launches.
**Steps:**
1. Compute the UUID in two separate app sessions.
**Expected Result:** Identical (deterministic v5); a like made in one session is recognized in
the next.

---

### JLM-UUID-009 — Track-number collisions handled by Track.id, not UUID
**Category:** Boundary, Regression · **Priority:** P2 · **Platform:** Both
**Preconditions:** Two tracks in one album sharing a track number `n`.
**Steps:**
1. View/like/play each.
**Expected Result:** Local `Track.id` (`code-index-n`) disambiguates in the UI; note that the
backend `songUuid` uses `(code, n)` — verify the app behaves sanely if `n` repeats (documents
the known keying rule so QA flags any real collision to backend).

---

### JLM-UUID-010 — Metro-safe vendored implementation
**Category:** Compatibility · **Priority:** P2 · **Platform:** Both
**Preconditions:** Production build.
**Steps:**
1. Exercise any UUID-dependent feature in a release build.
**Expected Result:** The vendored `uuidv5` (self-contained, no `uuid` npm pkg) works under
Metro/Hermes; no module-resolution error.
