# 04 — The Jubilee Door: registration, linked accounts & signup OTP

Covers the registration steps of `screens/Auth/door/` — `CreateJubileeIdStep.tsx`
(brand-new account), `CreateLinkedStep.tsx` (a Jubilee ID that has no KJubilee account
yet), `CodeStep.tsx`, and `components/auth/DateOfBirthField.tsx` — against
`POST /api/auth/signup`, `/verify-signup`, `/send-signup-verification` and the
`provision: true` form of `/signin`.

## What changed

`SignUpScreen` and `VerifySignupScreen` are gone; both are steps inside the single
`JubileeDoor` route, reached by typing an email first (see [03](03-auth-signin-2fa.md)).

- **The date picker no longer uses a `<Modal>`.** `DateOfBirthField` is three inline
  numeric segments. The old picker mounted its Modal permanently (`visible={open}`), the
  pattern that wedges the Android UI thread on the Old Architecture.
- **The 13+ age gate is retained**, diverging from the web, which made date of birth
  optional and ungated.
- **Date of birth is still discarded on the brand-new path.** `POST /api/auth/signup`
  accepts only `{ name, email, password }`. Only the linked-account path
  (`/signin` with `provision: true`) persists a date, and only to the identity authority.
  It is collected here solely to enforce the age gate. Known gap, not a defect.

**Superseded — do not run as written:** `JLM-SGNP-003`, `JLM-SGNP-007`, `JLM-SGNP-008`,
`JLM-SGNP-009`, `JLM-SGNP-015` (they assert on the modal wheel picker, the standalone
Sign Up screen, or navigation between Sign Up and Verify). Replacements are
`JLM-SGNP-017` onward.
---

### JLM-SGNP-001 — Successful sign-up end-to-end
**Category:** Functional, Positive · **Priority:** P0 · **Platform:** Both
**Preconditions:** Signed out; fresh email; Online.
**Steps:**
1. Fill First/Last name, a valid DOB (age ≥ 13), a valid email, matching password ≥ 8, and
   check the Terms/Privacy agreement.
2. Submit → land on VerifySignup.
3. Enter the 6-digit emailed code.
**Expected Result:** `requestSignup` navigates to VerifySignup with `{verificationGuid,email}`;
entering the correct code creates the account, sets a session, and lands on Home.

---

### JLM-SGNP-002 — Names required
**Category:** Negative, Boundary · **Priority:** P1 · **Platform:** Both
**Preconditions:** On Sign Up.
**Steps:**
1. Leave First and/or Last name empty and try to submit.
**Expected Result:** Submission blocked; validation requires both names non-empty.

---

### JLM-SGNP-003 — Email format validation
**Category:** Negative · **Priority:** P1 · **Platform:** Both
**Preconditions:** On Sign Up.
**Steps:**
1. Enter `abc`, `abc@`, `abc@x`, then a valid `a@b.co`.
**Expected Result:** Invalid formats are rejected by the email regex; only a well-formed
email allows submission.

---

### JLM-SGNP-004 — Password minimum length (boundary)
**Category:** Boundary, Negative · **Priority:** P0 · **Platform:** Both
**Preconditions:** On Sign Up.
**Steps:**
1. Enter a 7-char password (+matching confirm) and submit; then 8 chars.
**Expected Result:** 7 chars rejected; 8 chars accepted (min valid length).

---

### JLM-SGNP-005 — Password/confirm mismatch shows inline error
**Category:** Negative · **Priority:** P0 · **Platform:** Both
**Preconditions:** On Sign Up.
**Steps:**
1. Enter password and a different confirm value.
**Expected Result:** Inline mismatch error; submission blocked until they match.

---

### JLM-SGNP-006 — Terms/Privacy agreement required
**Category:** Negative, Functional · **Priority:** P1 · **Platform:** Both
**Preconditions:** On Sign Up with all other fields valid.
**Steps:**
1. Leave the agreement checkbox unchecked and submit.
**Expected Result:** Blocked until checked. Tapping the inline Terms/Privacy links opens
TermsOfUse / PrivacyPolicy and returns without losing form state.

---

### JLM-SGNP-007 — DateField wheel opens and greys invalid days
**Category:** UI/UX, Boundary · **Priority:** P1 · **Platform:** Both
**Preconditions:** On Sign Up.
**Steps:**
1. Open the DateField; set month = February; scroll days to 30/31.
**Expected Result:** A JS day/month/year wheel modal opens; invalid days (e.g. Feb 30) are
greyed/disabled; selectable year range corresponds to ages 13–100.

---

### JLM-SGNP-008 — Age boundary: under 13 rejected, exactly 13 accepted
**Category:** Boundary, Negative · **Priority:** P0 · **Platform:** Both
**Preconditions:** On Sign Up.
**Steps:**
1. Set DOB giving age 12; observe. Set DOB giving age exactly 13.
**Expected Result:** Age 12 shows an inline age error and blocks submit; age 13 is accepted.

---

### JLM-SGNP-009 — Age upper boundary (100/101)
**Category:** Boundary · **Priority:** P2 · **Platform:** Both
**Preconditions:** On Sign Up.
**Steps:**
1. Attempt to select a DOB implying age 101 vs 100.
**Expected Result:** The wheel does not allow ages beyond 100 (year range bounded); 100 is
selectable.

---

### JLM-SGNP-010 — Duplicate email handled
**Category:** Negative, Integration · **Priority:** P1 · **Platform:** Both
**Preconditions:** Email already registered.
**Steps:**
1. Submit sign-up with an existing account's email.
**Expected Result:** A notice/error is shown; user is not navigated to verification with a
misleading state.

---

### JLM-SGNP-011 — Verify screen shows the target email
**Category:** UI/UX · **Priority:** P2 · **Platform:** Both
**Preconditions:** Just completed phase 1.
**Steps:**
1. Observe the VerifySignup subtitle.
**Expected Result:** The email the code was sent to is displayed.

---

### JLM-SGNP-012 — OTP auto-submits when 6 digits entered
**Category:** Functional, Positive · **Priority:** P1 · **Platform:** Both
**Preconditions:** On VerifySignup.
**Steps:**
1. Enter all 6 digits.
**Expected Result:** The 6-cell OtpInput auto-submits on completion (no separate button tap
needed); spinner shows while verifying.

---

### JLM-SGNP-013 — Wrong OTP shows error and allows retry
**Category:** Negative · **Priority:** P0 · **Platform:** Both
**Preconditions:** On VerifySignup.
**Steps:**
1. Enter an incorrect 6-digit code.
**Expected Result:** Inline error; user can clear and re-enter; no account created.

---

### JLM-SGNP-014 — Resend cooldown (60s)
**Category:** Boundary, Functional · **Priority:** P1 · **Platform:** Both
**Preconditions:** On VerifySignup.
**Steps:**
1. Tap Resend; observe the countdown; try tapping again during cooldown; wait to 0 and tap.
**Expected Result:** Resend disabled with a 60s countdown; ignored while counting; re-enabled
at 0s and a new code is sent (`resendSignup`).

---

### JLM-SGNP-015 — Back from Verify returns to Sign Up
**Category:** Functional · **Priority:** P2 · **Platform:** Both
**Preconditions:** On VerifySignup.
**Steps:**
1. Tap the back arrow.
**Expected Result:** Returns to Sign Up; re-submitting starts a fresh phase-1 request.

---

### JLM-SGNP-016 — Verify timeout not double-charged
**Category:** Integration, Regression · **Priority:** P2 · **Platform:** Both
**Preconditions:** Simulate a timeout on `/verify-signup`.
**Steps:**
1. Submit a valid code on a stalled connection.
**Expected Result:** Timeout (`ECONNABORTED`) is not auto-retried (single-use OTP protection);
an error is shown and the user may resend/retry manually.


---

### JLM-SGNP-017 — Date of birth takes no modal and cannot freeze the next screen
**Category:** Functional, Performance · **Priority:** P0 · **Platform:** Android
**Preconditions:** On the registration step of the Jubilee Door. Physical device (not Expo Go).
**Steps:**
1. Tap the Day segment and type `07`; confirm focus jumps to Month. Type `03`; confirm focus
   jumps to Year. Type `1987`.
2. Press backspace repeatedly from the Year segment.
3. Background the app, foreground it, then navigate to Terms of Use and back.
**Expected Result:** No modal or overlay appears at any point. Focus auto-advances on fill
and steps back on backspace from an empty segment. After returning from Terms of Use the
screen is fully interactive — no wedged keyboard, no unresponsive taps. This is the
explicit regression test for the permanently-mounted `<Modal>` the old picker used.

---

### JLM-SGNP-018 — Under-13 is blocked at registration
**Category:** Negative, Boundary, Security · **Priority:** P0 · **Platform:** Both
**Preconditions:** On the registration step with every other field valid.
**Steps:**
1. Enter a date of birth 12 years ago. Attempt to submit.
2. Change it to exactly 13 years ago today. Submit.
**Expected Result:** (1) shows the minimum-age message and does not call `/api/auth/signup`.
(2) is accepted — the boundary is inclusive.

---

### JLM-SGNP-019 — Date of birth is built from local parts, not UTC
**Category:** Boundary, Functional · **Priority:** P1 · **Platform:** Both
**Preconditions:** Device time zone set to something well west of UTC (e.g. America/Los_Angeles).
Take the linked-account path so the date is actually transmitted.
**Steps:**
1. Enter 01/01/2000 and complete the step. Inspect the `date_of_birth` on the
   `/signin` request.
**Expected Result:** `2000-01-01`. Not `1999-12-31` — serialising through `toISOString()`
would shift the date back a day for every user west of UTC, which also straddles the 13+
boundary.

---

### JLM-SGNP-020 — Live password-match feedback
**Category:** UI/UX · **Priority:** P2 · **Platform:** Both
**Preconditions:** On the registration step.
**Steps:**
1. Type a password. Observe the confirmation field before typing in it.
2. Type a mismatching value, then correct it.
**Expected Result:** Nothing is shown while the confirmation is empty — empty means "not yet
answered", not "wrong". Then "Passwords don't match" in red, switching to "Passwords
matched" in green once they agree.

---

### JLM-SGNP-021 — Signing up with an address that already exists returns to the door
**Category:** Negative, Integration · **Priority:** P0 · **Platform:** Both
**Preconditions:** An email that has an account, reached on the registration step (force it
by taking the registration branch for an address claimed between the lookup and the submit).
**Steps:**
1. Complete the form and submit.
**Expected Result:** The 409 sends the user back to the **email step** showing "You already
have an account — enter your email to sign in.", with the address still filled and the
passwords cleared.

---

### JLM-SGNP-022 — The signup code step and its resend budget
**Category:** Functional, Boundary · **Priority:** P0 · **Platform:** Both
**Preconditions:** Registration submitted; on the code step.
**Steps:**
1. Observe the resend link. 2. Wait for the countdown to reach zero and resend twice.
3. Attempt a third resend.
**Expected Result:** "Resend in 60s" counting down, then "Resend code". Each resend restarts
the countdown and reports how many remain. The third is refused by the server and surfaced
as an error rather than a silent no-op.

---

### JLM-SGNP-023 — Verifying the signup code signs the user straight in
**Category:** Functional, Positive, Integration · **Priority:** P0 · **Platform:** Both
**Preconditions:** On the code step with the emailed code to hand.
**Steps:**
1. Enter the six digits.
**Expected Result:** Auto-submits on the last digit. `POST /verify-signup` answers **201**
with `{ user, tokens }` and **no `success` field**; the app must still treat it as signed in.
Tokens are stored and RootGate swaps to Home.

---

### JLM-SGNP-024 — "Edit details" returns to the form with its contents intact
**Category:** Functional, UI/UX · **Priority:** P1 · **Platform:** Both
**Preconditions:** On the signup code step.
**Steps:**
1. Tap "Edit details".
**Expected Result:** Back to the registration form with names, date of birth and email as
entered; the code digits are cleared. This is a correction, not a restart.

---

### JLM-SGNP-026 — A date of birth held by the identity authority pre-fills the field
**Category:** Functional, Positive, Integration · **Priority:** P0 · **Platform:** Both
**Preconditions:** `AUTH_LOGIN_MODE=sso`; a Jubilee ID that HAS a date of birth on record
and no KJubilee account.
**Steps:**
1. Enter that email, tap Continue, enter the Jubilee ID password, tap Continue.
2. Inspect the `profile.date_of_birth` on the `/signin` response, then the DD/MM/YYYY field.
**Expected Result:** The three segments are pre-filled with exactly the calendar date the
response carried — the user is never asked to retype a date the server already knows.

The server normalises to `YYYY-MM-DD`, but its fallback path can emit other shapes, so the
client accepts a leading `YYYY-MM-DD` from any ISO-ish string. Regression risk: an earlier
build accepted *only* the exact form and returned null for anything else, silently rendering
an empty field. If the field is empty here, check the device log for
"unparseable date_of_birth from the identity authority" — that warning exists so this can
never fail silently again.

---

### JLM-SGNP-027 — A pre-filled date of birth is not shifted by the device time zone
**Category:** Boundary, Integration · **Priority:** P1 · **Platform:** Both
**Preconditions:** As above, with a Jubilee ID whose date of birth is the **1st of a month**.
Set the device time zone well west of UTC (e.g. America/Los_Angeles).
**Steps:**
1. Reach the create-linked step and read the pre-filled date.
**Expected Result:** The 1st, not the last day of the previous month. If the authority sends
a timestamp (`2000-01-01T00:00:00.000Z`), the calendar date it names is the answer — parsing
it as an *instant* and reading local parts lands a day earlier for every user west of UTC,
which also straddles the 13+ boundary.

---

### JLM-SGNP-025 — Linked-account creation asks for details but never a password
**Category:** Functional, Security · **Priority:** P0 · **Platform:** Both
**Preconditions:** `AUTH_LOGIN_MODE=sso`; reached **Create your KJubilee account** via
`needsProfile` (see JLM-AUTH-022).
**Steps:**
1. Inspect the fields. Adjust the pre-filled name. Submit.
**Expected Result:** First name, last name, date of birth and the remember-me checkbox — and
**no password field**, because the credential lives at the identity authority. Submitting
POSTs `/signin` with `provision: true` and the edited names, and signs the user in.
