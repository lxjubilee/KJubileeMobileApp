# 28 — Disabled / Stub Features

These features have code in the repo but are **not wired / not functional in v1**.
Cases here document the *current expected behavior* (unreachable / no-op / stub) so QA
does not raise false bugs. Re-test as real cases if/when a feature is enabled.

---

### JLM-STUB-001 — Downloads screen not in navigation ⚠ NOT WIRED IN V1
**Category:** Functional, Regression · **Priority:** P2 · **Platform:** Both
**Preconditions:** Signed in.
**Steps:**
1. Search every menu/stack for a path to Downloads.
**Expected Result:** `DownloadsScreen` is not registered in any navigator; no UI reaches it.

---

### JLM-STUB-002 — Downloads slice is a persisted stub ⚠ NOT WIRED IN V1
**Category:** Functional · **Priority:** P2 · **Platform:** Both
**Preconditions:** Dev/test harness.
**Steps:**
1. Inspect `downloadsSlice` behavior.
**Expected Result:** Reducers manage `queued/downloading/completed/failed` records but no real
download engine exists; `localUri` is never populated by actual downloads. No offline audio.

---

### JLM-STUB-003 — ChooseProfile gate REMOVED
**Category:** Functional, Regression · **Priority:** P2 · **Platform:** Both
**Preconditions:** Sign in.
**Steps:**
1. Complete sign-in and observe.
**Expected Result:** No "Choose your profile" gate appears. The screen, the
`profileGatePending` flag and the `markProfileSelected` action have all been deleted, so
this is no longer a stub — it is simply gone. Retained as a regression check that
nothing reintroduces a gate between sign-in and Home. (Superseded text below.)

~~`ChooseProfileScreen` exists but~~
is unused (`profileGatePending` is only set on cold-start restore and the gate is bypassed).
Sign-in goes straight to Home.

---

### JLM-STUB-004 — Legacy onboarding screens unreachable ⚠ NOT WIRED IN V1
**Category:** Functional · **Priority:** P2 · **Platform:** Both
**Preconditions:** Any.
**Steps:**
1. Attempt to reach `GetStarted` / `Onboarding/index`.
**Expected Result:** Not registered in `AuthNavigator`; the live flow is Welcome → SignIn. Stub
"Continue"/"Get Help" actions are never exercised.

---

### JLM-STUB-005 — jubileeverse REST source not used in prod ⚠ NOT WIRED IN V1
**Category:** Integration · **Priority:** P2 · **Platform:** Both
**Preconditions:** Prod config (`DATA_SOURCE='manifest'`).
**Steps:**
1. Confirm which data source is active.
**Expected Result:** The app uses `manifest` + kjubilee-api; `ApiDataSource` (jubileeverse
`/v1`) is contract-compatible but inactive. `setAuthToken` for that client is dead code
(never called), so that client is effectively anonymous.

---

### JLM-STUB-006 — Legacy AUTH_TOKEN storage key unused ⚠ NOT WIRED IN V1
**Category:** Security · **Priority:** P2 · **Platform:** Both
**Preconditions:** Signed in.
**Steps:**
1. Inspect AsyncStorage for `STORAGE_KEYS.AUTH_TOKEN`.
**Expected Result:** The key is defined but unused; real tokens live only in secure store. No
plaintext token in AsyncStorage.

---

### JLM-STUB-007 — Following artists does not sync across devices ⚠ LOCAL-ONLY
**Category:** Functional · **Priority:** P2 · **Platform:** Both
**Preconditions:** Same account on two devices.
**Steps:**
1. Follow an artist on device A; check device B.
**Expected Result:** No sync (no backend follow endpoint); follows are local/persisted only.
Documented limitation, not a bug.
