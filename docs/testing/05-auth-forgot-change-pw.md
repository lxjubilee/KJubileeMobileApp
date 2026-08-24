# 05 — Forgot Password & Change Password

Covers `ForgotPasswordScreen.tsx` (`forgotPassword`, anti-enumeration) and
`ChangePasswordScreen.tsx` (`changePassword`, revokes other sessions).

---

### JLM-PWD-001 — Request password reset (valid email)
**Category:** Functional, Positive · **Priority:** P0 · **Platform:** Both
**Preconditions:** On ForgotPassword; a real account email; Online.
**Steps:**
1. Enter the email and submit.
**Expected Result:** Spinner, then the "sent" confirmation state with a neutral message and
a "Back to Sign In" CTA. Reset is redeemed on the website (not in-app).

---

### JLM-PWD-002 — Anti-enumeration: unknown email yields the same neutral result
**Category:** Security, Negative · **Priority:** P0 · **Platform:** Both
**Preconditions:** On ForgotPassword.
**Steps:**
1. Submit an email with no account.
**Expected Result:** Identical neutral confirmation as a real email — the UI never reveals
whether the account exists.

---

### JLM-PWD-003 — Email validation before submit
**Category:** Negative, Boundary · **Priority:** P1 · **Platform:** Both
**Preconditions:** On ForgotPassword.
**Steps:**
1. Enter an invalid email; observe. Enter a valid one.
**Expected Result:** Invalid email blocks submit with inline validation; valid enables it.

---

### JLM-PWD-004 — Submit disabled after sent
**Category:** UI/UX · **Priority:** P2 · **Platform:** Both
**Preconditions:** Reached the "sent" state.
**Steps:**
1. Observe the CTA and try to resubmit.
**Expected Result:** The form CTA is disabled/replaced by "Back to Sign In"; no duplicate
requests fire.

---

### JLM-PWD-005 — Back to Sign In from sent state
**Category:** Functional · **Priority:** P2 · **Platform:** Both
**Preconditions:** On the sent state.
**Steps:**
1. Tap "Back to Sign In".
**Expected Result:** Returns to Sign In.

---

### JLM-PWD-006 — Change password success (signed in)
**Category:** Functional, Positive, Security · **Priority:** P0 · **Platform:** Both
**Preconditions:** Signed in; on ChangePassword (Library ▸ Profile ▸ Change Password).
**Steps:**
1. Enter correct current password, a new password ≥ 8, matching confirm; submit.
**Expected Result:** Spinner, then a success state with a "Done" (goBack) action. Current
session stays valid; other sessions are revoked server-side; password syncs to JubileeInspire.

---

### JLM-PWD-007 — Current password required / wrong current rejected
**Category:** Negative, Security · **Priority:** P0 · **Platform:** Both
**Preconditions:** On ChangePassword.
**Steps:**
1. Submit with a wrong current password.
**Expected Result:** Inline API error; password not changed; stays on screen.

---

### JLM-PWD-008 — New password minimum length (boundary)
**Category:** Boundary, Negative · **Priority:** P1 · **Platform:** Both
**Preconditions:** On ChangePassword.
**Steps:**
1. Enter a 7-char new password; then 8.
**Expected Result:** 7 rejected, 8 accepted.

---

### JLM-PWD-009 — New/confirm mismatch
**Category:** Negative · **Priority:** P1 · **Platform:** Both
**Preconditions:** On ChangePassword.
**Steps:**
1. Enter mismatching new and confirm.
**Expected Result:** Inline mismatch error; submit blocked.

---

### JLM-PWD-010 — Other sessions revoked, current survives
**Category:** Integration, Security · **Priority:** P1 · **Platform:** Both
**Preconditions:** Same account signed in on a second device; change password on device A.
**Steps:**
1. Change password on device A.
2. Perform an authed action on device A, then on device B.
**Expected Result:** Device A continues working (its refresh token was passed through);
device B's session is invalidated and it is signed out on next authed call.

---

### JLM-PWD-011 — Change password reachable only when signed in
**Category:** Security · **Priority:** P2 · **Platform:** Both
**Preconditions:** Signed out.
**Steps:**
1. Confirm there is no path to ChangePassword while signed out.
**Expected Result:** ChangePassword lives in the authenticated Library stack; it is
unreachable from the Auth navigator.
