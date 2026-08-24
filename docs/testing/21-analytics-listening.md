# 21 — Listening Analytics

Covers `useListeningAnalytics`, `analyticsApi` (`/api/analytics/play`, `/now-playing`,
`/now-playing/stop`), and the per-launch session id. Fire-and-forget; **dev build only**.

> These are non-blocking background emissions. Verify with backend/analytics logs or a
> network proxy; failures must never disrupt playback.

---

### JLM-ANLY-001 — Play recorded for the previous track on track change
**Category:** Integration, Functional · **Priority:** P1 · **Platform:** Both (Dev build)
**Preconditions:** Dev build; Signed in; play then skip to another track.
**Steps:**
1. Play track A for a while; skip to track B.
**Expected Result:** `recordPlay` POSTs for **track A** with correct `song_id` (its
`songUuid`), `listening_seconds` ≈ last position, started/ended ISO timestamps, and
`session_id`/`source`.

---

### JLM-ANLY-002 — Play recorded at queue end
**Category:** Integration · **Priority:** P2 · **Platform:** Both (Dev build)
**Preconditions:** Play the last track to completion.
**Steps:**
1. Let the queue drain.
**Expected Result:** The final track's play is recorded on queue-end/teardown.

---

### JLM-ANLY-003 — Sub-1-second plays are not recorded
**Category:** Boundary, Negative · **Priority:** P2 · **Platform:** Both (Dev build)
**Preconditions:** Skip a track almost immediately.
**Steps:**
1. Start a track and skip within < 1s.
**Expected Result:** No `recordPlay` for that track (guard requires `listening_seconds ≥ 1`
and a present `song_id`).

---

### JLM-ANLY-004 — Now-playing heartbeat every ~25s
**Category:** Integration · **Priority:** P2 · **Platform:** Both (Dev build)
**Preconditions:** A track playing continuously.
**Steps:**
1. Let a track play > 60s while watching the network.
**Expected Result:** `pingNowPlaying` fires roughly every 25s with the current `songUuid`.

---

### JLM-ANLY-005 — Now-playing stops on pause/stop/end
**Category:** Integration · **Priority:** P2 · **Platform:** Both (Dev build)
**Preconditions:** A track playing.
**Steps:**
1. Pause; later stop; let a queue drain.
**Expected Result:** `stopNowPlaying` fires on pause/stop/ended/queue-drain and on teardown.

---

### JLM-ANLY-006 — Analytics only when authenticated
**Category:** Security, Functional · **Priority:** P1 · **Platform:** Both (Dev build)
**Preconditions:** N/A (playback requires sign-in).
**Steps:**
1. Confirm no analytics emit while `auth.user == null`.
**Expected Result:** All analytics gated on an authed user.

---

### JLM-ANLY-007 — Analytics failures never disrupt playback
**Category:** Negative, Integration · **Priority:** P0 · **Platform:** Both (Dev build)
**Preconditions:** Force `/api/analytics/*` to 500 / drop.
**Steps:**
1. Play through several tracks with analytics failing.
**Expected Result:** Playback is unaffected; errors are swallowed; no user-visible error.

---

### JLM-ANLY-008 — song_id correctness
**Category:** Integration, Regression · **Priority:** P1 · **Platform:** Both (Dev build)
**Preconditions:** Play tracks from different albums.
**Steps:**
1. Compare emitted `song_id` values to the expected `songUuid` for each track.
**Expected Result:** Each `song_id` matches `trackSongUuid` for the played track (the server
derives album/artist from it) — no mismatched attribution.

---

### JLM-ANLY-009 — Session id stable per launch, not persisted
**Category:** Functional · **Priority:** P2 · **Platform:** Both (Dev build)
**Preconditions:** Play across multiple tracks in one launch, then relaunch.
**Steps:**
1. Note `session_id` across tracks in one session; relaunch and play again.
**Expected Result:** `session_id` is constant within a launch and changes on the next launch
(in-memory only).

---

### JLM-ANLY-010 — Analytics no-op in Expo Go
**Category:** Compatibility · **Priority:** P2 · **Platform:** Both (Expo Go)
**Preconditions:** Expo Go.
**Steps:**
1. Attempt playback.
**Expected Result:** No analytics emitted; no crash.
