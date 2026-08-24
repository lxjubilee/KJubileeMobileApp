# 23 — Legal (Privacy Policy & Terms of Use)

Covers `screens/Legal/LegalScreen.tsx`, `PrivacyPolicyScreen`, `TermsOfUseScreen`, and
`content.ts` (`PRIVACY_POLICY` / `TERMS_OF_USE`).

---

### JLM-LEGL-001 — Privacy Policy renders
**Category:** Functional, Positive · **Priority:** P1 · **Platform:** Both
**Preconditions:** Reach Privacy Policy (Profile / Auth / Sign Up link).
**Steps:**
1. Open Privacy Policy.
**Expected Result:** Back header + scrollable structured document (intro, sections,
subheadings, bullets, effective date) rendered from `PRIVACY_POLICY`.

---

### JLM-LEGL-002 — Terms of Use renders
**Category:** Functional, Positive · **Priority:** P1 · **Platform:** Both
**Preconditions:** Reach Terms of Use.
**Steps:**
1. Open Terms of Use.
**Expected Result:** Same structured layout rendered from `TERMS_OF_USE`.

---

### JLM-LEGL-003 — Reachable from all entry points
**Category:** Functional · **Priority:** P2 · **Platform:** Both
**Preconditions:** Various.
**Steps:**
1. Open both docs from: Sign Up inline links, Auth navigator, Library stack, and Profile.
**Expected Result:** Each entry point opens the correct doc and back returns to origin.

---

### JLM-LEGL-004 — Long-document scroll and formatting
**Category:** UI/UX, Performance · **Priority:** P2 · **Platform:** Both
**Preconditions:** On a legal doc.
**Steps:**
1. Scroll top to bottom.
**Expected Result:** Smooth scroll; headings/bullets/effective-date formatted correctly; no
clipped text; content fits the safe area.

---

### JLM-LEGL-005 — Localized legal content
**Category:** Compatibility · **Priority:** P2 · **Platform:** Both
**Preconditions:** Switch UI language.
**Steps:**
1. Open the legal docs in a non-English language.
**Expected Result:** Copy follows localization where provided; falls back to English
gracefully with no raw keys.
