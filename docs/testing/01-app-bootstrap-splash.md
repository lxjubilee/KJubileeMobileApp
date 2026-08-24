# 01 — App Bootstrap, Splash & Root Gating

Covers `App.tsx`, `SplashScreen`, `RootGate`, `restoreSession`, and the startup
warm-up of the catalog manifest, mobile config, player engine, and fonts.

---

### JLM-BOOT-001 — Cold start, first run shows Welcome
**Category:** Functional, Positive · **Priority:** P0 · **Platform:** Both
**Preconditions:** First run (fresh install, no persisted state).
**Steps:**
1. Launch the app.
2. Observe the splash animation, then the first screen rendered.
**Expected Result:** SplashScreen intro plays; because `ONBOARDING_DONE` is unset and
no session exists, the Auth navigator opens at the **Welcome** screen.

---

### JLM-BOOT-002 — Cold start, returning signed-out user lands on Sign In
**Category:** Functional, Positive · **Priority:** P0 · **Platform:** Both
**Preconditions:** Onboarded, Signed out.
**Steps:**
1. Launch the app.
**Expected Result:** After splash, the Auth navigator opens at **Sign In** (not Welcome),
because `ONBOARDING_DONE` is set.

---

### JLM-BOOT-003 — Cold start with valid persisted session restores to Home
**Category:** Integration, Positive · **Priority:** P0 · **Platform:** Both
**Preconditions:** Signed in previously (valid tokens in secure store), Online.
**Steps:**
1. Fully close and relaunch the app.
2. Observe screen after splash.
**Expected Result:** `restoreSession` loads tokens, `GET /api/auth/me` succeeds, and the
Root navigator opens on the **Home** tab. No Sign In screen is shown.

---

### JLM-BOOT-004 — Restore session with expired access token auto-refreshes
**Category:** Integration, Security · **Priority:** P0 · **Platform:** Both
**Preconditions:** Signed in previously; access token expired but refresh token valid; Online.
**Steps:**
1. Relaunch the app.
**Expected Result:** `/me` returns 401 → transparent single-flight refresh rotates tokens →
`/me` retried succeeds → user lands on Home. New tokens persisted to secure store.

---

### JLM-BOOT-005 — Restore session with invalid/revoked refresh token routes to Sign In
**Category:** Integration, Security · **Priority:** P0 · **Platform:** Both
**Preconditions:** Signed in previously; refresh token revoked/invalid; Online.
**Steps:**
1. Relaunch the app.
**Expected Result:** Refresh fails → `onAuthFailure` dispatches `clearSession` → tokens
cleared → Auth navigator shows **Sign In**. No crash, no infinite spinner.

---

### JLM-BOOT-006 — Splash covers the app while status is `restoring`
**Category:** UI/UX · **Priority:** P1 · **Platform:** Both
**Preconditions:** Signed in previously; throttle `/me` to be slow.
**Steps:**
1. Relaunch and watch the transition.
**Expected Result:** While `auth.status === 'restoring'` (and onboarding flag loading),
`RootGate` renders nothing and the SplashScreen overlay fully covers the screen — no flash
of Sign In or a blank screen.

---

### JLM-BOOT-007 — Splash animation sequence and wordmark
**Category:** UI/UX · **Priority:** P2 · **Platform:** Both
**Preconditions:** Any launch.
**Steps:**
1. Launch and watch the splash.
**Expected Result:** Logo scales/fades in with the "KJubilee.com" wordmark
("Jubi" white, "Lujah" gold `#ffbd59`, ".com"), holds, then zooms out to reveal the app.
Text does not scale with OS font settings (`allowFontScaling={false}`).

---

### JLM-BOOT-008 — Splash safety timeout fires if font never loads
**Category:** Boundary, Regression · **Priority:** P1 · **Platform:** Both
**Preconditions:** Simulate Orbitron font failing/slow to load.
**Steps:**
1. Launch the app with the brand font unavailable.
**Expected Result:** After the 1.5s safety timeout the splash proceeds and the app renders
using the fallback font; the app never hangs on the splash waiting for the font.

---

### JLM-BOOT-009 — First-ever launch blocks on manifest; subsequent launches use cache
**Category:** Performance, Integration · **Priority:** P0 · **Platform:** Both
**Preconditions:** (a) Catalog cold + Online, then (b) relaunch Catalog warm.
**Steps:**
1. First launch on a fresh install; wait for Home to populate.
2. Relaunch the app.
**Expected Result:** (a) First launch fetches the ~2MB manifest before Home can show
content. (b) Second launch serves the cached chunked snapshot instantly and revalidates in
the background.

---

### JLM-BOOT-010 — Background catalog update rebuilds Home feed
**Category:** Integration · **Priority:** P1 · **Platform:** Both
**Preconditions:** Catalog warm; a newer manifest (`generated` changed) available on CDN.
**Steps:**
1. Launch; let the background revalidation complete.
**Expected Result:** On `onCatalogUpdated`, the catalog index is invalidated and the Home
feed refetches/rebuilds without a manual refresh; no crash during the swap.

---

### JLM-BOOT-011 — Manifest fetch failure on first-ever launch allows retry
**Category:** Negative, Integration · **Priority:** P1 · **Platform:** Both
**Preconditions:** Catalog cold + Offline (or CDN returns non-200).
**Steps:**
1. Launch with the CDN unreachable.
2. Restore connectivity and pull-to-refresh Home (or relaunch).
**Expected Result:** First launch shows Home's error/empty state (no cached catalog);
`initialLoad` is reset so a later retry succeeds once the network returns.

---

### JLM-BOOT-012 — Player engine initializes once, idempotently
**Category:** Integration, Regression · **Priority:** P1 · **Platform:** Both (Dev build)
**Preconditions:** Dev build.
**Steps:**
1. Launch; background and foreground the app several times.
**Expected Result:** `setupPlayer()` initializes once; repeated setup swallows the
"already initialized" error; no duplicate players or crash.

---

### JLM-BOOT-013 — Entitlement fetched when auth becomes true
**Category:** Integration · **Priority:** P1 · **Platform:** Both
**Preconditions:** Sign in during a session (or restore).
**Steps:**
1. Complete sign-in.
**Expected Result:** `PlayerSyncGate` dispatches `fetchEntitlement()` once authenticated;
plan (Free/Paid, daily limit, preview seconds) is loaded before/at first playback.

---

### JLM-BOOT-014 — Persisted language applied before first render
**Category:** Integration, UI/UX · **Priority:** P1 · **Platform:** Both
**Preconditions:** Previously selected a non-English UI language.
**Steps:**
1. Relaunch the app.
**Expected Result:** `PersistGate.onBeforeLift` applies the persisted language; first
rendered screen is already in the chosen language (no English flash).

---

### JLM-BOOT-015 — Startup does not require Expo Go audio
**Category:** Compatibility · **Priority:** P2 · **Platform:** Both (Expo Go)
**Preconditions:** Running in Expo Go.
**Steps:**
1. Launch the app in Expo Go.
**Expected Result:** App boots and UI is fully browsable; all engine/analytics/gate calls
no-op via the `isExpoGo` guard; no native-module crash.
