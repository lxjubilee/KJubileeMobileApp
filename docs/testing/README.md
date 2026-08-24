# KJubilee Mobile App — Test-Case Suite

This directory holds the full pre-release validation suite for the KJubilee mobile
app (Expo SDK 54 / React Native 0.81.5, Old Architecture, app version `2.0.x`).

Every screen, user flow, API integration, and edge case is covered across
**positive, negative, boundary, UI/UX, functional, integration, performance,
security, compatibility, and regression** scenarios. Each case is written in full
form — ID, category, priority, preconditions, numbered steps, and expected result.

## How to read this suite

- Start with [00-conventions.md](00-conventions.md) — it defines the **ID scheme**,
  **category tags**, **priority levels**, the **precondition glossary**, and the
  standard **boundary values** referenced throughout.
- Each numbered file is one functional area. Run a file top-to-bottom; preconditions
  are stated per case so they can also be run individually.
- Cases tagged **⚠ NOT WIRED IN V1** describe features whose code exists but is not
  reachable/functional in the shipping build. Their "Expected Result" documents the
  *current* correct behavior (unreachable / no-op), so QA does not raise false bugs.

## Module index

| File | Area | Area code |
|------|------|-----------|
| [01-app-bootstrap-splash.md](01-app-bootstrap-splash.md) | App bootstrap, splash, RootGate, session restore | BOOT |
| [02-onboarding-welcome.md](02-onboarding-welcome.md) | Welcome slides, onboarding flag | ONBD |
| [03-auth-signin-2fa.md](03-auth-signin-2fa.md) | Jubilee Door: email lookup, sign in, Turnstile, two-factor | AUTH |
| [04-auth-signup-verify.md](04-auth-signup-verify.md) | Jubilee Door: registration, linked accounts, date of birth, signup OTP | SGNP |
| [05-auth-forgot-change-pw.md](05-auth-forgot-change-pw.md) | Forgot password, change password | PWD |
| [06-auth-session-mgmt.md](06-auth-session-mgmt.md) | Sign out, delete account, token refresh | SESS |
| [07-home-feed.md](07-home-feed.md) | Home hero carousel, rails, header, states | HOME |
| [08-language-localization.md](08-language-localization.md) | Language panel, 40 locales, catalog filter | LANG |
| [09-browse.md](09-browse.md) | Browse album grid | BRWS |
| [10-search.md](10-search.md) | Search, recent searches | SRCH |
| [11-library-hub.md](11-library-hub.md) | Library hub, playlist create | LIB |
| [12-album-details.md](12-album-details.md) | Album details, actions, tracks, ratings | ALBM |
| [13-artist-details.md](13-artist-details.md) | Artist details, follow, discography | ARTS |
| [14-album-reviews.md](14-album-reviews.md) | Album reviews list, sort, pagination | RVWL |
| [15-album-list.md](15-album-list.md) | See-all album grid | ALST |
| [16-playlists.md](16-playlists.md) | Playlist details + add songs | PLST |
| [17-likes-favorites.md](17-likes-favorites.md) | Likes/favorites, liked songs | LIKE |
| [18-reviews-ratings.md](18-reviews-ratings.md) | Ratings, review composer, contributions | RVW |
| [19-player.md](19-player.md) | Mini/floating/full player, transport, queue | PLYR |
| [20-playback-gate-entitlement.md](20-playback-gate-entitlement.md) | Free-plan gate, entitlement | GATE |
| [21-analytics-listening.md](21-analytics-listening.md) | Listening analytics, heartbeat | ANLY |
| [22-profile-account.md](22-profile-account.md) | Profile hub, account actions | PROF |
| [23-legal-static.md](23-legal-static.md) | Privacy policy, terms of use | LEGL |
| [24-deep-share-links.md](24-deep-share-links.md) | Deep links, universal links, sharing | LINK |
| [25-catalog-manifest-offline.md](25-catalog-manifest-offline.md) | Manifest SWR cache, mobile config, offline | CTLG |
| [26-uuid-conversion.md](26-uuid-conversion.md) | Catalog-code ↔ UUIDv5 conversion | UUID |
| [27-navigation-state.md](27-navigation-state.md) | Navigation, tab bar, mini-player visibility, modals | NAV |
| [28-disabled-stub-features.md](28-disabled-stub-features.md) | Downloads, ChooseProfile, legacy code | STUB |
| [29-nonfunctional.md](29-nonfunctional.md) | Performance, security, compatibility, regression | NFR |

## Environment & test-data prerequisites

**Build**: The app **requires a development/production build** — `react-native-track-player`
is a native module absent from Expo Go, so **all playback, analytics, and gate cases
fail silently (no-op) in Expo Go**. Use `expo prebuild` + `expo run:android` /
`run:ios`, or an EAS `development`/`preview` build. UI-only cases can be previewed in
Expo Go but must be finally validated on a real build.

**Backends** (configured in `app.json` → `expo.extra`):
- CDN catalog manifest — `https://cdn.jubileeverse.com` (anonymous)
- Unified kjubilee-api — `https://api.kjubilee.com` (Bearer JWT, powers auth,
  likes, playlists, reviews, analytics, listening gate, entitlement, mobile config)
- jubileeverse REST — `https://api.jubileeverse.com/v1` (`DATA_SOURCE='api'`, not used in prod)

**Test accounts needed**:
- A **Free-plan** account (to exercise the daily playback limit / gate).
- A **Paid-plan** account (unlimited playback).
- An account with **2FA enabled** and one **without**.
- A **fresh/unused email** for each sign-up run (sign-up creates a real account).
- An account with **existing likes, playlists, reviews** for populated-state cases.
- An account with **no user data** for empty-state cases.

**Devices** (compatibility matrix, see 29-nonfunctional.md): at minimum one iOS phone,
one Android phone, one tablet; oldest and newest supported OS of each.

**Network tooling**: ability to simulate offline / slow / server-error responses
(e.g. Charles/Proxyman, airplane mode, or a staging backend returning 401/500).
