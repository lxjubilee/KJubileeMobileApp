# 22 — Profile & Account

Covers `screens/Profile/index.tsx` — account hub, avatar, MyContributions, menu rows,
sign out, and the delete-account flow. (Delete/session details also in module 06.)

---

### JLM-PROF-001 — Profile renders account details
**Category:** Functional, Positive · **Priority:** P0 · **Platform:** Both
**Preconditions:** Signed in.
**Steps:**
1. Open Profile (Home/Library ProfileButton).
**Expected Result:** Avatar (initial or person icon), display name and email,
MyContributions section, account rows (Change Password, Privacy Policy, Terms of Use,
Delete Account), and a Sign Out button.

---

### JLM-PROF-002 — Avatar shows initial or fallback
**Category:** UI/UX · **Priority:** P2 · **Platform:** Both
**Preconditions:** Accounts with and without a display name.
**Steps:**
1. Compare the avatar for each.
**Expected Result:** Shows the name initial when available, else a person icon. Avatar text
does not scale with OS font settings.

---

### JLM-PROF-003 — Menu row navigation
**Category:** Functional · **Priority:** P1 · **Platform:** Both
**Preconditions:** On Profile.
**Steps:**
1. Tap Change Password, Privacy Policy, Terms of Use (return after each).
**Expected Result:** Each navigates to the corresponding screen and back cleanly.

---

### JLM-PROF-004 — MiniPlayer hidden on Profile
**Category:** UI/UX, Regression · **Priority:** P1 · **Platform:** Both (Dev build)
**Preconditions:** A track playing; open Profile.
**Steps:**
1. Observe the bottom of Profile.
**Expected Result:** The MiniPlayer is hidden on the Profile route (per `HIDE_MINI_PLAYER_ON`).

---

### JLM-PROF-005 — Sign out
**Category:** Functional · **Priority:** P0 · **Platform:** Both
**Preconditions:** On Profile.
**Steps:**
1. Tap Sign Out.
**Expected Result:** Returns to Sign In (see module 06 for teardown details).

---

### JLM-PROF-006 — Delete account confirm / success / error modes
**Category:** Functional, Negative · **Priority:** P0 · **Platform:** Both
**Preconditions:** Disposable account (success) and a blocked endpoint (error).
**Steps:**
1. Delete → confirm → success → OK.
2. Repeat with `/account` failing.
**Expected Result:** Confirm mode → success dialog → OK clears session; failure → error
dialog with the message, account intact (cases JLM-SESS-005/007/008).

---

### JLM-PROF-007 — Guest / not-signed-in labels
**Category:** Boundary, UI/UX · **Priority:** P2 · **Platform:** Both
**Preconditions:** Edge state where user is null but Profile renders.
**Steps:**
1. Observe the header.
**Expected Result:** Shows "Guest"/"notSignedIn" copy rather than blank or a crash.

---

### JLM-PROF-008 — Profile reachable from both Home and Library
**Category:** Functional · **Priority:** P2 · **Platform:** Both
**Preconditions:** Signed in.
**Steps:**
1. Open Profile via the Home header, then via the Library ProfileButton.
**Expected Result:** Both entry points reach Profile; back returns to the originating surface.
