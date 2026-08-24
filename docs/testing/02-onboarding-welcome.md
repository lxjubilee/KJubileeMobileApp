# 02 — Onboarding & Welcome

Covers `Welcome.tsx` (the live first-run flow) and the legacy `GetStarted.tsx` /
`Onboarding/index.tsx` screens (present but **not wired** into the Auth navigator).

---

### JLM-ONBD-001 — Welcome shows on first run only
**Category:** Functional, Positive · **Priority:** P0 · **Platform:** Both
**Preconditions:** First run.
**Steps:**
1. Launch the app.
**Expected Result:** Welcome screen appears with brand logo, top links PRIVACY & SIGN IN,
a paged slide carousel (4 slides), pagination dots, and a fixed "Get Started" CTA.

---

### JLM-ONBD-002 — Swiping through slides updates pagination
**Category:** UI/UX · **Priority:** P1 · **Platform:** Both
**Preconditions:** On Welcome.
**Steps:**
1. Swipe horizontally through all 4 slides.
**Expected Result:** First slide is the tilted PosterCollage; remaining slides show poster
+ headline/subtitle. Pagination dots animate to track the active slide; swipe is smooth.

---

### JLM-ONBD-003 — "Get Started" marks onboarding done and opens the Jubilee Door
**Category:** Functional, Positive · **Priority:** P0 · **Platform:** Both
**Preconditions:** On Welcome (First run).
**Steps:**
1. Tap **Get Started**.
2. Force-close and relaunch the app while signed out.
**Expected Result:** Navigates to the **Jubilee Door** (`JubileeDoor`); `ONBOARDING_DONE` is
persisted so the relaunch lands directly on the door (Welcome no longer appears).

---

### JLM-ONBD-004 — "SIGN IN" top link behaves like Get Started
**Category:** Functional · **Priority:** P1 · **Platform:** Both
**Preconditions:** On Welcome.
**Steps:**
1. Tap the **SIGN IN** link (top-right).
**Expected Result:** Same as Get Started — sets `ONBOARDING_DONE` and opens the Jubilee Door.

---

### JLM-ONBD-005 — "PRIVACY" top link opens the web privacy page
**Category:** Functional, Integration · **Priority:** P2 · **Platform:** Both
**Preconditions:** On Welcome, Online.
**Steps:**
1. Tap the **PRIVACY** link.
**Expected Result:** The external web privacy URL opens (in-app browser / system browser).
Returning to the app leaves Welcome state intact.

---

### JLM-ONBD-006 — Onboarding is not shown again after completion
**Category:** Regression · **Priority:** P1 · **Platform:** Both
**Preconditions:** Onboarded, Signed out.
**Steps:**
1. Sign in, then sign out.
2. Relaunch.
**Expected Result:** Welcome never reappears once onboarded; user always lands on the door
while signed out.

---

### JLM-ONBD-007 — Legacy GetStarted / Onboarding screens unreachable ⚠ NOT WIRED IN V1
**Category:** Functional, Regression · **Priority:** P2 · **Platform:** Both
**Preconditions:** Any.
**Steps:**
1. Attempt to reach `GetStarted`/`Onboarding/index` through normal navigation.
**Expected Result:** These screens are not registered in `AuthNavigator`; no navigation
path reaches them. Their "Continue"/"Get Help" stubs are never exercised in v1. Confirm no
menu, link, or deep link exposes them.
