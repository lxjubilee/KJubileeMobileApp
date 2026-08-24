# 03 — The Jubilee Door: email lookup, sign in, Turnstile & two-factor

Covers `screens/Auth/door/` (`JubileeDoorScreen.tsx`, `doorMachine.ts`, `steps/`),
`components/auth/` (`TurnstileGate.tsx`, `TurnstileWidget.tsx`), and the `signIn` /
`verify2FA` thunks against `GET /api/auth/lookup`, `POST /api/auth/signin` and
`/verify-login`.

## What changed

`SignInScreen`, `SignUpScreen`, `VerifySignupScreen` and `TwoFactorScreen` no longer
exist. They are now **steps inside one route**, `JubileeDoor`, entered through a single
email field. Sign-up cases live in [04](04-auth-signup-verify.md).

Two structural consequences for this suite:

- There is no "Sign In screen" with an email AND a password visible at once, so any case
  asserting on both fields together no longer describes a reachable state.
- Turnstile sits with the email field on the first step, as it does on the web.
  `GET /api/auth/lookup` does not read `cfTurnstileToken`, so there it is a client-side
  gate only; the token it mints is carried forward and spent on the following
  `POST /signin`. Because that token is single-use, a failed sign-in re-shows the
  challenge on the password step so a retry can mint a fresh one.

**Superseded — do not run as written:** `JLM-AUTH-002` (CTA gated on email *and*
password on one screen), `JLM-AUTH-017`, `JLM-AUTH-018` (navigation between the separate
Sign In / Sign Up / TwoFactor routes). Replacements are `JLM-AUTH-020` onward.

---

### JLM-AUTH-001 — Successful sign-in (no 2FA)
**Category:** Functional, Positive · **Priority:** P0 · **Platform:** Both
**Preconditions:** Signed out; valid credentials for a non-2FA account; Online.
**Steps:**
1. Enter valid email and password.
2. Tap the primary Sign In CTA.
**Expected Result:** Spinner shows while `status==='loading'`; on success the slice flips to
`authenticated`, tokens saved to secure store, and RootGate swaps to the Home tab.

---

### JLM-AUTH-002 — Sign-in CTA disabled until email + password present
**Category:** Boundary, UI/UX · **Priority:** P1 · **Platform:** Both
**Preconditions:** On Sign In.
**Steps:**
1. Leave email empty; observe CTA. Fill email only; observe. Fill password too; observe.
**Expected Result:** CTA is disabled unless both fields are non-empty (and captcha satisfied
if required) and not loading.

---

### JLM-AUTH-003 — Wrong password shows inline error, no navigation
**Category:** Negative · **Priority:** P0 · **Platform:** Both
**Preconditions:** Signed out; valid email, wrong password.
**Steps:**
1. Submit with an incorrect password.
**Expected Result:** Inline `auth.error` message shown; user stays on Sign In; password not
cleared silently in a way that loses context; no crash.

---

### JLM-AUTH-004 — Unknown email shows inline error
**Category:** Negative · **Priority:** P1 · **Platform:** Both
**Preconditions:** Signed out.
**Steps:**
1. Submit with an email that has no account.
**Expected Result:** Inline error (generic; does not confirm/deny account existence beyond
server message); stays on Sign In.

---

### JLM-AUTH-005 — Password show/hide toggle
**Category:** UI/UX · **Priority:** P2 · **Platform:** Both
**Preconditions:** On Sign In.
**Steps:**
1. Type a password; tap the show/hide eye icon twice.
**Expected Result:** Toggles between masked and plaintext; state is per-field and does not
leak into logs.

---

### JLM-AUTH-006 — Error clears on screen focus
**Category:** UI/UX · **Priority:** P2 · **Platform:** Both
**Preconditions:** Sign-in error currently displayed.
**Steps:**
1. Navigate away (e.g. Forgot password) and back to Sign In.
**Expected Result:** `clearAuthError` runs on focus; the stale inline error is gone.

---

### JLM-AUTH-007 — 2FA challenge routes to Two-Factor screen
**Category:** Functional, Positive · **Priority:** P0 · **Platform:** Both
**Preconditions:** Signed out; credentials for a **2FA-enabled** account.
**Steps:**
1. Submit valid credentials.
**Expected Result:** `signIn` resolves with `kind:'2fa'`; app navigates to **TwoFactor**
carrying `pending2FA` (verificationGuid). No session yet.

---

### JLM-AUTH-008 — Valid OTP completes 2FA sign-in
**Category:** Functional, Positive · **Priority:** P0 · **Platform:** Both
**Preconditions:** On TwoFactor with a valid `pending2FA`.
**Steps:**
1. Enter the correct 4–6 digit code; submit.
**Expected Result:** `verify2FA` succeeds → tokens + user set → authenticated → Home.

---

### JLM-AUTH-009 — 2FA code field accepts digits only, max 6
**Category:** Boundary, Negative · **Priority:** P1 · **Platform:** Both
**Preconditions:** On TwoFactor.
**Steps:**
1. Try typing letters/symbols; try typing 7 digits.
**Expected Result:** Non-digits rejected; input caps at 6 characters; submit stays disabled
below 4 digits and while loading, and requires a present `pending2FA`.

---

### JLM-AUTH-010 — Wrong OTP shows inline error, stays on screen
**Category:** Negative · **Priority:** P0 · **Platform:** Both
**Preconditions:** On TwoFactor.
**Steps:**
1. Enter an incorrect code; submit.
**Expected Result:** Inline error; remains on TwoFactor; can retry.

---

### JLM-AUTH-011 — Expired 2FA challenge is rejected clearly
**Category:** Negative, Boundary · **Priority:** P1 · **Platform:** Both
**Preconditions:** On TwoFactor; let `pending2FA` expire (or backend expires it).
**Steps:**
1. Submit a code after expiry.
**Expected Result:** Rejected with a "session expired" style message; user can go back and
re-initiate sign-in.

---

### JLM-AUTH-012 — "Trust this device" checkbox default and effect
**Category:** Functional, Security · **Priority:** P2 · **Platform:** Both
**Preconditions:** On TwoFactor.
**Steps:**
1. Note the checkbox default; complete 2FA with it ON, then in a later sign-in with it OFF.
**Expected Result:** Defaults to ON; value is passed through as `rememberMe`. Behavior
matches server trust policy (trusted device may skip future 2FA per backend rules).

---

### JLM-AUTH-013 — Turnstile CAPTCHA shown only when configured
**Category:** Security, Integration · **Priority:** P1 · **Platform:** Both
**Preconditions:** (a) `TURNSTILE_SITE_KEY` empty, (b) site key set.
**Steps:**
1. Open Sign In in each config.
**Expected Result:** (a) No CAPTCHA; submit needs only email+password. (b) TurnstileWidget
renders; submit is blocked until a token is obtained; token passed to `signIn`.

---

### JLM-AUTH-014 — Turnstile token is single-use; widget remounts on failed attempt
**Category:** Security, Regression · **Priority:** P1 · **Platform:** Both
**Preconditions:** Turnstile enabled; a sign-in attempt fails (wrong password).
**Steps:**
1. Solve CAPTCHA, submit wrong password, then correct it and resubmit.
**Expected Result:** After the failed attempt the widget remounts to issue a fresh token
(the used token isn't replayed); resubmission uses the new token.

---

### JLM-AUTH-015 — Sign-in timeout is not silently retried
**Category:** Integration, Security · **Priority:** P1 · **Platform:** Both
**Preconditions:** Simulate a 30s TCP stall on `/signin`.
**Steps:**
1. Submit valid credentials on a stalled connection.
**Expected Result:** After `API_TIMEOUT_MS` (30s) the request aborts with an error; it is
**not** auto-retried (single-use CAPTCHA/OTP could be consumed). User can retry manually.

---

### JLM-AUTH-016 — Network error on sign-in retries up to twice
**Category:** Integration · **Priority:** P2 · **Platform:** Both
**Preconditions:** Transient `ERR_NETWORK` (request never reaches server).
**Steps:**
1. Submit while connectivity blips.
**Expected Result:** Client retries up to 2× with backoff; if it then succeeds, user signs
in; if it keeps failing, an error is shown. (Distinct from the timeout case above.)

---

### JLM-AUTH-017 — Navigation links from Sign In
**Category:** Functional · **Priority:** P2 · **Platform:** Both
**Preconditions:** On Sign In.
**Steps:**
1. Tap "Forgot password?"; go back. Tap "New? Sign up".
**Expected Result:** Navigate to ForgotPassword and SignUp respectively; back returns to
Sign In with fields preserved as expected.

---

### JLM-AUTH-018 — Back from Sign In goes to Welcome when no history
**Category:** UI/UX · **Priority:** P2 · **Platform:** Both
**Preconditions:** On Sign In reached directly (returning user).
**Steps:**
1. Tap the back arrow.
**Expected Result:** Falls back to Welcome (per screen logic) rather than exiting the app
unexpectedly.

---

### JLM-AUTH-019 — CSRF cookies stripped so sign-in/mutations don't 403
**Category:** Security, Regression · **Priority:** P1 · **Platform:** Both
**Preconditions:** A stale `jv_session`/`jv_csrf` cookie exists.
**Steps:**
1. Sign in and perform a mutation (e.g. like a song).
**Expected Result:** `clearSessionCookies` strips the cookies before each request so the
server treats the app as a pure Bearer client; no 403 on mutations.


---

### JLM-AUTH-020 — Email lookup routes a returning member to the password step
**Category:** Functional, Positive, Integration · **Priority:** P0 · **Platform:** Both
**Preconditions:** Signed out, on the Jubilee Door; an email with an existing KJubilee account; Online.
**Steps:**
1. Type the email. Tap **Continue**.
**Expected Result:** `GET /api/auth/lookup?email=` is called once and answers
`existsLocally: true`. The door shows **Welcome back** with the account chip, a password
field, "Forgot your password?", the "Keep me signed in on this device" checkbox (checked by
default) and the Turnstile widget.

---

### JLM-AUTH-021 — Email lookup routes a brand-new address to registration
**Category:** Functional, Positive · **Priority:** P0 · **Platform:** Both
**Preconditions:** Signed out, on the Jubilee Door; an email with no account anywhere.
**Steps:**
1. Type the email. Tap **Continue**.
**Expected Result:** Lookup answers all-false and the door shows **Let's create your
Jubilee ID** with the email pre-filled and read-only.

---

### JLM-AUTH-022 — Email lookup routes a cross-site Jubilee ID to "Confirm it's you"
**Category:** Functional, Integration · **Priority:** P0 · **Platform:** Both
**Preconditions:** Server running `AUTH_LOGIN_MODE=sso`; an email with a Jubilee ID but no
KJubilee account. In `local`/`ji` mode `existsInSso === existsLocally`, so this branch is
unreachable — confirm the deployed mode before failing this case.
**Steps:**
1. Type the email. Tap **Continue**. Enter the Jubilee ID password. Tap **Continue**.
**Expected Result:** Step 1 shows **Confirm it's you**. The password POSTs with
`preview: true`; the server answers 200 `{ success: false, needsProfile: true, profile }`
and the door advances to **Create your KJubilee account** with first/last name and date of
birth **pre-filled from `profile`** and **no password field**.

---

### JLM-AUTH-023 — A failed lookup never advances the door
**Category:** Negative, Integration · **Priority:** P0 · **Platform:** Both
**Preconditions:** On the Jubilee Door with a valid email typed. Airplane mode, or block
`api.kjubilee.com`.
**Steps:**
1. Tap **Continue**.
**Expected Result:** The door STAYS on the email step and shows "We are having trouble
reaching your account right now. Please try again in a moment." It must **not** fall
through to registration: "no account found" and "couldn't ask" are indistinguishable here,
and guessing wrong pushes an existing member into a sign-up they cannot complete.

---

### JLM-AUTH-024 — A malformed email is rejected without a network call
**Category:** Negative, Boundary, Performance · **Priority:** P1 · **Platform:** Both
**Preconditions:** On the Jubilee Door. Network inspector attached.
**Steps:**
1. Type `not-an-email`. Tap **Continue**.
**Expected Result:** "That does not look like a complete email address. Please check it."
and **no request is sent**. `/api/auth/*` allows 50 requests per 15 minutes per IP and
carrier NAT shares one address across many users, so a locally-rejectable address must not
spend from that budget.

---

### JLM-AUTH-025 — The lookup is submit-only and fires once per address
**Category:** Performance, Integration · **Priority:** P1 · **Platform:** Both
**Preconditions:** On the Jubilee Door. Network inspector attached.
**Steps:**
1. Type a full valid email character by character; watch for requests.
2. Tap **Continue**; then tap it twice in rapid succession.
3. Tap "Use a different email", then re-submit the same address.
**Expected Result:** No request while typing. Exactly one request on submit, and a fast
double-tap produces no second request. Re-submitting the same address is answered from the
session memo with no further request.

---

### JLM-AUTH-026 — Turnstile renders with the email field and unmounts on leaving it
**Category:** Security, UI/UX · **Priority:** P1 · **Platform:** Both
**Preconditions:** `turnstileSiteKey` configured.
**Steps:**
1. Observe the email step. 2. Solve the challenge and Continue to **Welcome back**; observe.
3. Go back to the email step; observe.
**Expected Result:** The widget renders directly under the email field. On a successful
Continue the password step shows **no** challenge — the token is carried forward. Leaving
the email step unmounts the WebView; it must not stay alive behind another step, which is
what stalls the Android UI thread on the Old Architecture.

---

### JLM-AUTH-027 — Turnstile never permanently blocks sign-in
**Category:** Security, Negative · **Priority:** P0 · **Platform:** Both
**Preconditions:** `turnstileSiteKey` configured. Block `challenges.cloudflare.com`, or use
a site key not allow-listed for `turnstileBaseUrl`.
**Steps:**
1. Open the door. Wait 10 seconds. Enter an email and tap **Continue**.
**Expected Result:** After ~8s the gate reports ready and submit proceeds without a token;
the widget still offers "Tap to retry". Rationale: the server does not verify the token in
SSO mode, so a challenge that silently renders nothing must not become a wall.

---

### JLM-AUTH-028 — A failed sign-in re-shows the challenge for a fresh token
**Category:** Security, Integration · **Priority:** P0 · **Platform:** Both
**Preconditions:** `turnstileSiteKey` configured; challenge solved at the email step; now on
the password step, which shows no challenge.
**Steps:**
1. Enter a WRONG password and submit. Observe the step after the error.
2. Enter the correct password and submit.
**Expected Result:** The first attempt fails inline AND a Turnstile widget now appears on
the password step — the token minted at the email step was single-use and has been spent,
and the widget that produced it is two steps back. The retry uses the fresh token and
succeeds. The same token is never sent twice, and the user is never forced back to the
email step to get one.

---

### JLM-AUTH-029 — Android hardware back walks the steps, not the stack
**Category:** Functional, UI/UX · **Priority:** P0 · **Platform:** Android
**Preconditions:** Signed out.
**Steps:**
1. From the email step, press back.
2. From **Welcome back**, press back.
3. From **Confirm it's you** → **Create your KJubilee account**, press back.
4. From the code step, press back.
**Expected Result:** (1) leaves the door. (2) returns to the email step with the address
still filled and the password cleared. (3) returns to **Confirm it's you** so the password
can be re-entered — NOT to the email step. (4) returns to **Welcome back** for a login code
or the registration form for a signup code, clearing the entered digits.

---

### JLM-AUTH-030 — iOS edge-swipe cannot escape a mid-flow step
**Category:** Functional · **Priority:** P1 · **Platform:** iOS
**Preconditions:** Signed out, past the email step.
**Steps:**
1. Swipe from the left edge on each of the password, create and code steps.
**Expected Result:** The swipe-back gesture is disabled anywhere except the email step, so
the door cannot be popped from the middle of the flow.

---

### JLM-AUTH-031 — "Use a different email" keeps the address but clears everything else
**Category:** Functional, Security · **Priority:** P1 · **Platform:** Both
**Preconditions:** On any step past the email step, with fields filled.
**Steps:**
1. Tap "Use a different email".
**Expected Result:** Back to the email step with the typed address preserved (a typo is one
edit, not a retype) and unlocked. Password, confirmation, names, date of birth, the held
Jubilee ID password and the Turnstile token are all cleared.

---

### JLM-AUTH-032 — Account lockout is surfaced and honoured
**Category:** Negative, Security · **Priority:** P1 · **Platform:** Both
**Preconditions:** An account whose `locked_until` is in the future — trip it by exhausting
sign-in code resends.
**Steps:**
1. Reach the password step for that account and submit.
**Expected Result:** The 423 is shown as an error, with no navigation and no token stored.
The door must not treat 423 as a generic failure.

---

### JLM-AUTH-033 — The rate limiter's plain-text 429 does not leak into the UI
**Category:** Negative, Integration · **Priority:** P1 · **Platform:** Both
**Preconditions:** Trip the limiter — 50 `/api/auth/*` requests within 15 minutes from one IP.
**Steps:**
1. Submit an email at the door.
**Expected Result:** "Too many attempts from this network. Please wait a few minutes and
try again." No raw body text or HTML is shown, and parsing it does not crash — the limiter
answers with plain text, not JSON.
