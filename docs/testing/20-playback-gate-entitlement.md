# 20 — Playback Gate & Entitlement

Covers `usePlaybackGate`, `listeningApi.intent` (`/api/listening/intent`),
`entitlementApi` (`/api/subscriptions/me`), `entitlementSlice`, and `PlaybackLimitGate`.
**Requires a dev build.**

---

### JLM-GATE-001 — Free user hits the daily limit
**Category:** Functional, Integration · **Priority:** P0 · **Platform:** Both (Dev build)
**Preconditions:** Dev build; Signed in (Free) at/over the daily play limit.
**Steps:**
1. Start a new track.
**Expected Result:** `intent` returns `mode:'limited'`; playback caps at `preview_seconds`
(default 60): at the cap it pauses and seeks to the cap; the "Daily Limit Reached" popup
(`PlaybackLimitGate` → dismiss-only ConfirmDialog, no purchase link) shows **once** for that track.

---

### JLM-GATE-002 — Cannot scrub past the preview cap
**Category:** Functional, Boundary · **Priority:** P0 · **Platform:** Both (Dev build)
**Preconditions:** A limited track paused at the cap.
**Steps:**
1. Drag the ProgressBar beyond the cap.
**Expected Result:** Playback holds at the cap (seek pulled back); the user cannot listen
past `preview_seconds`.

---

### JLM-GATE-003 — Paid user plays full length
**Category:** Functional, Positive · **Priority:** P0 · **Platform:** Both (Dev build)
**Preconditions:** Signed in (Paid).
**Steps:**
1. Play several full tracks back to back.
**Expected Result:** `intent` returns `mode:'full'` (unlimited); no cap, no popup.

---

### JLM-GATE-004 — Popup shows once per capped track, not repeatedly
**Category:** Regression, UI/UX · **Priority:** P1 · **Platform:** Both (Dev build)
**Preconditions:** Free user over the limit.
**Steps:**
1. Let a track hit the cap; dismiss the popup; let progress updates continue.
**Expected Result:** `setLimitReached(true)` fires once per track; the popup does not re-pop
on every progress tick.

---

### JLM-GATE-005 — Skip before intent resolves does not mis-cap
**Category:** Integration, Regression · **Priority:** P1 · **Platform:** Both (Dev build)
**Preconditions:** Free user; slow `intent` response.
**Steps:**
1. Start a track and immediately skip to the next before `intent` resolves.
**Expected Result:** The `activeUuidRef` guard ties the intent result to the correct track;
a stale intent doesn't cap the newly-active track.

---

### JLM-GATE-006 — Gate fails open on intent error
**Category:** Negative, Integration · **Priority:** P0 · **Platform:** Both (Dev build)
**Preconditions:** Force `/intent` to fail (offline / 500).
**Steps:**
1. Play a track with `intent` failing.
**Expected Result:** `intent` returns null → no cap applied (fails open); playback proceeds
without a false limit.

---

### JLM-GATE-007 — Entitlement fetched on auth, reset on sign-out
**Category:** Integration · **Priority:** P1 · **Platform:** Both
**Preconditions:** Sign in, then sign out / switch account.
**Steps:**
1. Sign in (entitlement loads); sign out; sign in as a different plan.
**Expected Result:** `fetchEntitlement` loads plan on auth; entitlement resets on
signOut/clearSession; the second account shows its own plan (no bleed).

---

### JLM-GATE-008 — Entitlement fetch failure defaults to not-paid
**Category:** Negative, Security · **Priority:** P1 · **Platform:** Both
**Preconditions:** Force `/subscriptions/me` to fail.
**Steps:**
1. Sign in with the endpoint failing.
**Expected Result:** `entitlementSlice` sets `isPaid:false` (fail-safe); the server-side
`intent` gate still governs actual playback, so no free unlimited access is granted.

---

### JLM-GATE-009 — Gate applies only to authenticated users
**Category:** Functional · **Priority:** P2 · **Platform:** Both (Dev build)
**Preconditions:** N/A (playback requires sign-in in this app).
**Steps:**
1. Confirm `intent` is only called when `auth.user != null`.
**Expected Result:** No gate calls fire while signed out.

---

### JLM-GATE-010 — Gate no-ops in Expo Go
**Category:** Compatibility · **Priority:** P2 · **Platform:** Both (Expo Go)
**Preconditions:** Expo Go.
**Steps:**
1. Attempt playback.
**Expected Result:** Gate hook no-ops (no audio engine); no crash.

---

### JLM-GATE-011 — Limit counter advances server-side across tracks
**Category:** Integration · **Priority:** P1 · **Platform:** Both (Dev build)
**Preconditions:** Free user just under the limit.
**Steps:**
1. Play new tracks until the limit is reached.
**Expected Result:** Each new active track calls `intent`, advancing the server daily counter;
the cap kicks in at the server-defined limit (client is not authoritative).
