# 06 — Session Management

Covers sign-out, delete account, `restoreSession`, the transparent 401 refresh with
token rotation (`authClient.ts`), and session-teardown side effects.

---

### JLM-SESS-001 — Sign out returns to Auth navigator
**Category:** Functional, Positive · **Priority:** P0 · **Platform:** Both
**Preconditions:** Signed in; on Profile.
**Steps:**
1. Tap **Sign Out**.
**Expected Result:** `signOut` clears user/status; `clearSessionCookies` runs; best-effort
`POST /api/auth/logout`; secure-store tokens cleared; RootGate swaps to Sign In.

---

### JLM-SESS-002 — Sign out succeeds even if logout POST fails
**Category:** Negative, Integration · **Priority:** P1 · **Platform:** Both
**Preconditions:** Signed in; block `/logout` (offline or 500).
**Steps:**
1. Tap Sign Out with the logout endpoint failing.
**Expected Result:** Local session is still cleared (logout is best-effort); user is signed
out locally and returned to Sign In.

---

### JLM-SESS-003 — Playback stops and queue tears down on sign-out
**Category:** Integration, Regression · **Priority:** P0 · **Platform:** Both (Dev build)
**Preconditions:** Signed in (Dev build); a track is playing.
**Steps:**
1. Sign out while audio plays.
**Expected Result:** Store middleware resets the playback queue on `signOut.fulfilled`;
audio stops; no orphaned lock-screen/notification controls.

---

### JLM-SESS-004 — User data cleared on sign-out
**Category:** Security, Functional · **Priority:** P0 · **Platform:** Both
**Preconditions:** Signed in (Free), with likes/entitlement loaded.
**Steps:**
1. Sign out; sign in as a **different** account.
**Expected Result:** Likes keys and entitlement are reset on `clearSession`/`signOut`; no
first-account data bleeds into the second account.

---

### JLM-SESS-005 — Delete account confirm flow
**Category:** Functional, Positive · **Priority:** P0 · **Platform:** Both
**Preconditions:** Signed in; on Profile; disposable test account.
**Steps:**
1. Tap **Delete Account** → ConfirmDialog → Confirm.
2. On success dialog, tap OK.
**Expected Result:** `DELETE /api/auth/account` succeeds; a success ConfirmDialog appears;
OK dispatches `clearSession` and returns to Sign In. Tokens cleared.

---

### JLM-SESS-006 — Delete account cancel
**Category:** Functional · **Priority:** P1 · **Platform:** Both
**Preconditions:** On Profile.
**Steps:**
1. Tap Delete Account → Cancel.
**Expected Result:** Dialog dismisses; account untouched; still signed in.

---

### JLM-SESS-007 — Delete account failure shows error dialog
**Category:** Negative, Integration · **Priority:** P1 · **Platform:** Both
**Preconditions:** On Profile; block `/account` (500/offline).
**Steps:**
1. Confirm delete with the endpoint failing.
**Expected Result:** Error-mode ConfirmDialog with the server message; account not deleted;
user remains signed in.

---

### JLM-SESS-008 — Delete shows loading state during request
**Category:** UI/UX · **Priority:** P2 · **Platform:** Both
**Preconditions:** On Profile; slow network.
**Steps:**
1. Confirm delete on a slow connection.
**Expected Result:** The dialog shows a spinner / disabled confirm while `deleting`; cannot
be double-submitted.

---

### JLM-SESS-009 — Transparent 401 refresh with rotation (single request)
**Category:** Integration, Security · **Priority:** P0 · **Platform:** Both
**Preconditions:** Signed in; access token expired, refresh valid.
**Steps:**
1. Trigger any authed call (e.g. open Library → fetch playlists).
**Expected Result:** Call 401s → `POST /api/auth/refresh` rotates tokens → new tokens
persisted → original request retried once and succeeds. User sees no interruption.

---

### JLM-SESS-010 — Concurrent 401s share a single refresh (single-flight)
**Category:** Integration, Regression · **Priority:** P1 · **Platform:** Both
**Preconditions:** Signed in; access token expired; trigger several authed calls at once.
**Steps:**
1. Open a screen that fires multiple authed requests simultaneously.
**Expected Result:** Only **one** refresh request is made; all pending calls await the shared
`refreshPromise`, then retry with the new bearer. No refresh storm; no token thrash.

---

### JLM-SESS-011 — Refresh failure signs the user out
**Category:** Security, Integration · **Priority:** P0 · **Platform:** Both
**Preconditions:** Signed in; refresh token invalid/expired.
**Steps:**
1. Trigger an authed call that 401s.
**Expected Result:** Refresh fails → `onAuthFailure` → `clearSession` → Sign In. Tokens
cleared; playback torn down.

---

### JLM-SESS-012 — Refresh-exempt endpoints do not trigger refresh-retry
**Category:** Integration, Regression · **Priority:** P1 · **Platform:** Both
**Preconditions:** N/A (verify behavior on signin/verify-login/refresh).
**Steps:**
1. Cause a 401 from `/signin` (wrong password on a 2FA-required flow, etc.).
**Expected Result:** These exempt URLs return their 401 directly without attempting a
refresh loop; the user sees the credential error, not a spurious sign-out.

---

### JLM-SESS-013 — Refresh with no stored refresh token fails immediately
**Category:** Negative · **Priority:** P2 · **Platform:** Both
**Preconditions:** Access token present but refresh token missing (corrupted store).
**Steps:**
1. Trigger an authed call that 401s.
**Expected Result:** Refresh throws immediately → sign-out, no hang.

---

### JLM-SESS-014 — Rotated refresh token persists across app restart
**Category:** Integration, Regression · **Priority:** P1 · **Platform:** Both
**Preconditions:** A refresh just rotated the tokens.
**Steps:**
1. Force-close and relaunch.
**Expected Result:** The **new** rotated refresh token is loaded from secure store; restore
succeeds. (Guards against persisting the old, now-invalid token.)

---

### JLM-SESS-015 — Tokens stored encrypted, not in AsyncStorage
**Category:** Security · **Priority:** P0 · **Platform:** Both
**Preconditions:** Signed in.
**Steps:**
1. Inspect AsyncStorage contents (dev tooling).
**Expected Result:** Access/refresh tokens are in `expo-secure-store` (Keychain/Keystore),
not in AsyncStorage. The legacy `STORAGE_KEYS.AUTH_TOKEN` is unused/empty.


---

### JLM-SESS-020 — Sign-out still tears down playback, likes and entitlement
**Category:** Integration, Functional · **Priority:** P0 · **Platform:** Both
**Preconditions:** Signed in, a track playing, at least one liked item, entitlement loaded.
**Steps:**
1. Profile → Sign Out. 2. Repeat for Delete Account. 3. Repeat by forcing a refresh
   failure (revoke the refresh token server-side, then cold start).
**Expected Result:** In all three cases audio stops, the queue resets, the player state
clears, likes empty and entitlement resets — not just the auth slice.

Why this case exists: four modules outside the auth slice (`redux/store/store.ts`,
`playerSlice`, `likesSlice`, `entitlementSlice`) match on the *generated action type
strings* `auth/signOut/fulfilled`, `auth/deleteAccount/fulfilled` and
`auth/clearSession`. Renaming or moving any of them, or changing the slice's
`name: 'auth'`, silently breaks this fan-out with no compile error — music keeps playing
after sign-out.

---

### JLM-SESS-021 — An existing session survives the Jubilee Door migration
**Category:** Integration, Functional · **Priority:** P0 · **Platform:** Both
**Preconditions:** A device already signed in on the previous build. Install the build
containing the Jubilee Door **over** it, without clearing storage.
**Steps:**
1. Cold start.
**Expected Result:** The session restores from the keychain via the proactive refresh and
the app opens on Home. The user must never see the door. Tokens live in expo-secure-store
and the auth slice is not persisted, so nothing about the auth-screen rewrite should touch
a live session — this case proves it.
