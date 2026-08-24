# 00 — Conventions

This file defines the shared vocabulary for every test case in the suite.

## Test-case ID scheme

`JLM-<AREA>-<NNN>`

- `JLM` — KJubilee Mobile.
- `<AREA>` — the area code from the module table in [README.md](README.md)
  (e.g. `AUTH`, `PLYR`, `UUID`).
- `<NNN>` — zero-padded sequence within that area (`001`, `002`, …).

Example: `JLM-AUTH-014`. IDs are stable — never renumber; append new cases at the end
of an area and reuse numbers only for deleted+replaced cases.

## Case format

Each case is written as:

> **JLM-XXX-NNN — Title**
> **Category:** one or more of the tags below · **Priority:** P0/P1/P2 · **Platform:** iOS / Android / Both
> **Preconditions:** state required before step 1.
> **Steps:**
> 1. …
> 2. …
> **Expected Result:** observable, verifiable outcome.

## Category tags

| Tag | Meaning |
|-----|---------|
| **Positive** | Valid input / happy path produces the correct result. |
| **Negative** | Invalid input / misuse is rejected gracefully. |
| **Boundary** | Values at/around limits (min, max, off-by-one). |
| **UI/UX** | Layout, states, animation, theming, copy, affordances. |
| **Functional** | Feature logic behaves per spec. |
| **Integration** | Cross-module / client↔backend behavior, including failure & retry. |
| **Performance** | Speed, memory, responsiveness, large-data handling. |
| **Security** | Auth, tokens, data exposure, input sanitization, CAPTCHA. |
| **Compatibility** | Device, OS version, orientation, font scaling, Expo Go. |
| **Regression** | Guards a previously-fixed defect or a known fragile constraint. |

## Priority levels

- **P0** — Blocker/critical. Release-gating: auth, playback, payments/gate, data loss,
  crash/freeze, security. Must pass.
- **P1** — High. Core feature correctness and common flows.
- **P2** — Medium/low. Edge cases, cosmetics, rarely-hit paths, disabled-feature checks.

## Precondition glossary (referenced by shorthand)

| Shorthand | Meaning |
|-----------|---------|
| **Signed out** | No session; app shows the Auth navigator. |
| **Signed in (Free)** | Authenticated on a Free-plan account. |
| **Signed in (Paid)** | Authenticated on a Paid-plan account. |
| **Onboarded** | `ONBOARDING_DONE` flag set (returning user; Welcome not shown). |
| **First run** | Fresh install, no persisted state, `ONBOARDING_DONE` unset. |
| **Dev build** | Running a native dev/prod build (not Expo Go) — audio works. |
| **Catalog warm** | Catalog manifest already cached from a prior launch. |
| **Catalog cold** | No cached manifest (first-ever launch or cache cleared). |
| **Online / Offline** | Device has / lacks network connectivity. |
| **Has content** | Account has existing likes/playlists/reviews as noted. |
| **Empty content** | Account has none of the relevant user data. |

## Standard boundary values

Use these exact values so results are comparable across runs.

| Field | Just below | At limit | Just above |
|-------|-----------|----------|------------|
| Password length | 7 chars | 8 chars (min valid) | — |
| Signup/2FA OTP submit-enable | 3 digits | 4 digits (enabled) | — |
| Signup OTP length | — | 6 digits (auto-submit) | 7 (blocked by maxLength) |
| Review title | 149 chars | 150 chars (max) | 151 (blocked by maxLength) |
| Review body | 4999 chars | 5000 chars (max) | 5001 (blocked) |
| Age (DateField) | 12 years | 13 (min) / 100 (max) | 101 years |
| Recent searches | 9 entries | 10 (limit) | 11th evicts oldest |
| Playlist name | empty (disabled) | 1 char (enabled) | 80 chars (max) / 81 (blocked) |
| Resend cooldown | during 60s (disabled) | at 0s (enabled) | — |

## Global expectations (assumed unless a case overrides)

- **Dark theme** everywhere (`#0B0B0F` background, azure `#007FFF` accent); portrait-only.
- **All copy is localized** via i18n keys; untranslated languages fall back to English.
- **Artwork-less** albums/artists/tracks are hidden from every list (`useVisible*` hooks).
- **Modals mount only while open** — no permanently-mounted hidden `<Modal>` (Old-Arch
  freeze constraint). Rapid open/close must not wedge touches.
- **No crash, no freeze, no unhandled promise rejection** is an implicit expected result
  of every case.
