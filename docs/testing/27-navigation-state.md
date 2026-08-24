# 27 — Navigation & State

Covers `RootNavigator`, `MainTabNavigator` (custom tab bar), `LibraryStackNavigator`,
the auth tree-swap, mini-player visibility, and modal mount/hand-off timing.

The auth stack is now five routes: `Welcome`, `JubileeDoor`, `ForgotPassword`,
`PrivacyPolicy`, `TermsOfUse`. Sign in, sign up, two-factor and signup verification are
**steps inside `JubileeDoor`**, not routes — see [03](03-auth-signin-2fa.md).

---

### JLM-NAV-001 — Auth tree-swap on sign-in / sign-out
**Category:** Integration, Regression · **Priority:** P0 · **Platform:** Both
**Preconditions:** Signed out.
**Steps:**
1. Sign in; then sign out.
**Expected Result:** RootGate swaps the entire navigator based on `auth.user` — Auth and Root
navigators never coexist. Any in-progress modal/queue state from the previous tree is reset
on swap.

---

### JLM-NAV-002 — Bottom tabs switch correctly
**Category:** Functional · **Priority:** P1 · **Platform:** Both
**Preconditions:** Signed in.
**Steps:**
1. Tap Home, Browse, Search, Library.
**Expected Result:** Each tab activates its screen with the correct icon highlighted.

---

### JLM-NAV-003 — Library tab resets to root on tap
**Category:** Regression · **Priority:** P1 · **Platform:** Both
**Preconditions:** Deep in the Library stack (e.g. Change Password).
**Steps:**
1. Tap the Library tab.
**Expected Result:** Resets to the Library root (tabPress override), not the deep screen.

---

### JLM-NAV-004 — Full-screen pushes over tabs
**Category:** UI/UX · **Priority:** P2 · **Platform:** Both
**Preconditions:** On any tab.
**Steps:**
1. Open AlbumDetails/ArtistDetails/AlbumList/PlaylistDetails.
**Expected Result:** They push full-screen over the tab bar (Netflix-style), with a
FloatingMiniPlayer instead of the tab-bar MiniPlayer.

---

### JLM-NAV-005 — Modal group screens present as slide-ups
**Category:** UI/UX · **Priority:** P2 · **Platform:** Both
**Preconditions:** On any screen.
**Steps:**
1. Open MusicPlayer and PlaylistAddSongs.
**Expected Result:** Both present as modal slide-ups (`presentation:'modal'`).

---

### JLM-NAV-006 — Mini-player visibility rules
**Category:** UI/UX, Regression · **Priority:** P1 · **Platform:** Both (Dev build)
**Preconditions:** A track playing.
**Steps:**
1. Visit tabs, a detail push, and Profile.
**Expected Result:** Tab-bar MiniPlayer on tabs; FloatingMiniPlayer on pushes; hidden on
Profile and when nothing plays.

---

### JLM-NAV-007 — No permanently-mounted hidden modals (freeze guard)
**Category:** Regression, Compatibility · **Priority:** P0 · **Platform:** Android
**Preconditions:** Screens that host modals (PlaylistDetails, PlaylistMenu, Language, Reviews).
**Steps:**
1. Navigate through these screens; open/close their modals rapidly.
**Expected Result:** Native `<Modal>`s mount only while visible; the Android UI thread never
wedges; touches stay responsive (Old-Arch constraint).

---

### JLM-NAV-008 — Sequential modal hand-off timing
**Category:** Regression · **Priority:** P1 · **Platform:** Both
**Preconditions:** Flows that chain two modals (TrackOptions → PlaylistPicker → NameDialog).
**Steps:**
1. Add a track to a new playlist through the chained sheets.
**Expected Result:** The ~260ms hand-off sequences the modals so the second is not swallowed
(iOS double-modal fix); the flow completes.

---

### JLM-NAV-009 — Back navigation and Android hardware back
**Category:** Functional, Compatibility · **Priority:** P1 · **Platform:** Android
**Preconditions:** Various screens/modals.
**Steps:**
1. Use the Android back button on detail screens, modals, and the tab root.
**Expected Result:** Back closes modals / pops screens sensibly; from a tab root it does not
crash (predictive back disabled); the app exits only from the expected root.

---

### JLM-NAV-010 — State persistence across relaunch
**Category:** Integration · **Priority:** P2 · **Platform:** Both
**Preconditions:** Set language, repeat/shuffle, recent searches, follows, likes.
**Steps:**
1. Relaunch.
**Expected Result:** Persisted slices restore (settings/player/search.recent/library/likes
keys/home.feed/artwork); non-persisted state (playlists, reviews, entitlement) refetches.

---

### JLM-NAV-011 — Portrait-lock enforced
**Category:** Compatibility · **Priority:** P2 · **Platform:** Both
**Preconditions:** Any screen.
**Steps:**
1. Rotate the device.
**Expected Result:** UI stays portrait (orientation locked); no landscape layout breakage.

---

### JLM-NAV-012 — Rapid navigation stress
**Category:** Performance, Regression · **Priority:** P2 · **Platform:** Both
**Preconditions:** Signed in.
**Steps:**
1. Rapidly open/close details, modals, tabs, and the player in succession.
**Expected Result:** No freeze, crash, dropped touches, or navigation deadlock.
