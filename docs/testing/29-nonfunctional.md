# 29 — Non-Functional: Performance, Security, Compatibility, Regression

Cross-cutting cases that span the whole app. Run these on the compatibility matrix below.

## Device / OS / environment matrix

| Axis | Cover at minimum |
|------|------------------|
| iOS | Oldest supported iOS + latest iOS; one phone + one iPad (tablet layout) |
| Android | Oldest supported Android + latest; one low-end + one high-end device |
| Build type | Dev/prod native build (audio works) + Expo Go (audio no-ops) |
| Network | Online (wifi + cellular), slow/3G, intermittent, offline |
| Font scale | Default + largest OS accessibility font size |
| Theme | Dark only (app is dark-locked) |
| Orientation | Portrait (locked) |

---

## Performance

### JLM-NFR-001 — Cold-start time within budget
**Category:** Performance · **Priority:** P1 · **Platform:** Both
**Preconditions:** Warm catalog cache.
**Steps:**
1. Cold launch and time until Home is interactive.
**Expected Result:** Reaches an interactive Home promptly (cached catalog served instantly);
splash does not hang; no ANR.

---

### JLM-NFR-002 — Manifest parse of ~2MB does not block UI excessively
**Category:** Performance · **Priority:** P1 · **Platform:** Both
**Preconditions:** Catalog cold, first launch.
**Steps:**
1. First launch; observe responsiveness while the manifest loads/parses.
**Expected Result:** The single blocking first load is bounded; subsequent launches are
non-blocking (SWR). No frozen splash.

---

### JLM-NFR-003 — Large-list scroll performance
**Category:** Performance · **Priority:** P1 · **Platform:** Both
**Preconditions:** Full catalog (Browse), large playlist, long reviews list.
**Steps:**
1. Fling-scroll each list end to end repeatedly.
**Expected Result:** Smooth scrolling, lazy image loading, no runaway memory or dropped
touches; review pagination loads incrementally.

---

### JLM-NFR-004 — Memory stability during long playback
**Category:** Performance · **Priority:** P1 · **Platform:** Both (Dev build)
**Preconditions:** Dev build.
**Steps:**
1. Play a long queue for an extended period, backgrounding/foregrounding.
**Expected Result:** No steady memory growth/leak; buffering stays within the configured caps
(32MB cache); no crash over time.

---

### JLM-NFR-005 — Rapid interaction stress (no freeze)
**Category:** Performance, Regression · **Priority:** P1 · **Platform:** Android
**Preconditions:** Signed in.
**Steps:**
1. Rapidly open/close modals, switch tabs, toggle likes, seek.
**Expected Result:** UI stays responsive; no wedge/ANR (validates the Old-Arch modal-mount
discipline under load).

---

## Security

### JLM-NFR-006 — Tokens stored only in secure store
**Category:** Security · **Priority:** P0 · **Platform:** Both
**Preconditions:** Signed in.
**Steps:**
1. Dump AsyncStorage and inspect logs.
**Expected Result:** Access/refresh tokens only in `expo-secure-store`; none in AsyncStorage
or logs; no tokens printed in release logs.

---

### JLM-NFR-007 — Refresh-token rotation, single-flight, and revocation
**Category:** Security, Integration · **Priority:** P0 · **Platform:** Both
**Preconditions:** Signed in.
**Steps:**
1. Exercise 401 refresh (module 06); verify rotation persisted and old token invalidated.
**Expected Result:** Rotated token replaces the old; concurrent 401s share one refresh; a bad
refresh signs out.

---

### JLM-NFR-008 — CSRF cookie stripping keeps mutations Bearer-only
**Category:** Security, Regression · **Priority:** P1 · **Platform:** Both
**Preconditions:** Session cookies present.
**Steps:**
1. Perform mutations (like, playlist create, review).
**Expected Result:** Cookies stripped before each request; no 403; no session-cookie auth path.

---

### JLM-NFR-009 — Anti-enumeration on forgot-password
**Category:** Security · **Priority:** P1 · **Platform:** Both
**Preconditions:** On ForgotPassword.
**Steps:**
1. Submit a known and an unknown email.
**Expected Result:** Identical neutral responses; no account-existence disclosure.

---

### JLM-NFR-010 — No client secrets bundled
**Category:** Security · **Priority:** P1 · **Platform:** Both
**Preconditions:** Release build.
**Steps:**
1. Inspect the bundle/config for secrets.
**Expected Result:** Only public config (CDN/API URLs, Turnstile site key) present; no private
keys/secrets (Bearer-token-only architecture).

---

### JLM-NFR-011 — Turnstile CAPTCHA enforced when configured
**Category:** Security · **Priority:** P1 · **Platform:** Both
**Preconditions:** Turnstile site key set.
**Steps:**
1. Attempt sign-in without solving the CAPTCHA.
**Expected Result:** Submit blocked until a token is present; token is single-use (module 03).

---

### JLM-NFR-012 — Input sanitization / injection resistance
**Category:** Security, Negative · **Priority:** P2 · **Platform:** Both
**Preconditions:** Any text input (search, review, playlist name, auth fields).
**Steps:**
1. Enter SQL-ish/script-ish/emoji/very-long strings.
**Expected Result:** No crash; inputs treated as data; server rejects invalid payloads; no
UI injection.

---

### JLM-NFR-013 — Session data cleared on sign-out/delete
**Category:** Security · **Priority:** P0 · **Platform:** Both
**Preconditions:** Signed in with data.
**Steps:**
1. Sign out / delete; inspect residual state.
**Expected Result:** Tokens, likes, entitlement cleared; playback torn down; next account
sees none of the prior user's data.

---

## Compatibility

### JLM-NFR-014 — iOS phone + iPad layout
**Category:** Compatibility · **Priority:** P1 · **Platform:** iOS
**Preconditions:** iPhone and iPad.
**Steps:**
1. Walk key screens on both.
**Expected Result:** Layouts adapt (tablet supported); safe areas respected; no clipped/
overlapping UI.

---

### JLM-NFR-015 — Android device range
**Category:** Compatibility · **Priority:** P1 · **Platform:** Android
**Preconditions:** Low-end + high-end Android, oldest + newest OS.
**Steps:**
1. Walk key screens; play audio; open modals.
**Expected Result:** Functional across the range; media notification works; no Old-Arch freeze.

---

### JLM-NFR-016 — Large OS font scaling
**Category:** Compatibility, UI/UX · **Priority:** P2 · **Platform:** Both
**Preconditions:** Max accessibility font size.
**Steps:**
1. Browse the app.
**Expected Result:** Content remains usable; brand/avatar text stays fixed
(`allowFontScaling={false}`); no critical layout break. Orbitron never gets `fontWeight`
(no fallback-to-system-sans regression on Android).

---

### JLM-NFR-017 — Safe-area handling (notch / gesture nav)
**Category:** Compatibility, UI/UX · **Priority:** P2 · **Platform:** Both
**Preconditions:** Devices with notches / gesture bars.
**Steps:**
1. Check headers, tab bar, mini-player, modals.
**Expected Result:** Nothing hidden under notches/home indicators; consistent safe-area insets.

---

### JLM-NFR-018 — Expo Go graceful degradation
**Category:** Compatibility · **Priority:** P2 · **Platform:** Both (Expo Go)
**Preconditions:** Expo Go.
**Steps:**
1. Browse the whole UI; attempt playback.
**Expected Result:** UI fully browsable; audio/analytics/gate no-op; no native-module crash.

---

### JLM-NFR-019 — Interruptions (call, other audio, headset)
**Category:** Compatibility, Integration · **Priority:** P1 · **Platform:** Both (Dev build)
**Preconditions:** A track playing.
**Steps:**
1. Receive a call; play audio in another app; unplug/plug headphones.
**Expected Result:** Playback pauses/ducks/resumes per OS audio-focus rules; no crash; controls
recover.

---

## Regression checklist (anchored on known-fragile constraints)

### JLM-NFR-020 — Old Architecture required
**Category:** Regression, Compatibility · **Priority:** P0 · **Platform:** Both
**Preconditions:** Production build config.
**Steps:**
1. Confirm `newArchEnabled:false` in the shipped build; launch and play audio.
**Expected Result:** App launches and plays without the RNTP New-Arch SIGABRT. (If New Arch is
ever enabled, re-verify JLM-NFR-021/022.)

---

### JLM-NFR-021 — No size-0 icon render (fontSize-0 crash guard)
**Category:** Regression · **Priority:** P1 · **Platform:** Both
**Preconditions:** Artwork fallback tiles across the app.
**Steps:**
1. View screens with artwork placeholders.
**Expected Result:** No "FontSize should be a positive value" crash / render-loop wedge;
`iconSize={0}` renders no glyph rather than a size-0 Text.

---

### JLM-NFR-022 — Modal-mount discipline holds everywhere
**Category:** Regression · **Priority:** P0 · **Platform:** Android
**Preconditions:** Every modal-hosting screen.
**Steps:**
1. Systematically open/close all modals (TrackOptions, PlaylistPicker, NameDialog, Confirm,
   Language, ReviewComposer, PlaylistDetails menu) and navigate away mid-open.
**Expected Result:** No wedged UI thread, no lingering keyboard swallowing touches, no
"app looks frozen" state.

---

### JLM-NFR-023 — Fail-open chains never brick the app
**Category:** Regression, Integration · **Priority:** P0 · **Platform:** Both
**Preconditions:** Force each of: mobile-config fail, intent fail, analytics fail, entitlement
fail, likes-toggle fail, storage fail.
**Steps:**
1. Induce each failure and use the app.
**Expected Result:** Each degrades per its documented fallback (config→manifest home,
intent→no cap, analytics→swallowed, entitlement→not-paid+server gate, likes→revert,
storage→best-effort); the app stays usable.

---

### JLM-NFR-024 — Version/build metadata sanity
**Category:** Regression · **Priority:** P2 · **Platform:** Both
**Preconditions:** Release build.
**Steps:**
1. Check displayed/build version vs. `app.json` (2.0.1) and `package.json` (2.0.0).
**Expected Result:** Flag the known version mismatch for the release owner to reconcile before
store submission (EAS `appVersionSource: remote` with `autoIncrement` on production).

---

### JLM-NFR-025 — Full regression smoke before release
**Category:** Regression · **Priority:** P0 · **Platform:** Both
**Preconditions:** Release-candidate build on the device matrix.
**Steps:**
1. Run all P0 cases across modules 01–28 on at least one iOS and one Android device.
**Expected Result:** All P0 cases pass; any failure blocks release.
