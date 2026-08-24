# 24 — Deep Links, Universal Links & Sharing

Covers `linking.ts`, `useShareDeepLinks`, `parseShareLink` / `buildAlbumShareUrl` /
`shareAlbum` (`shareLinks.ts`), iOS associated domains, and Android autoVerify.
Sharing is **album-level only**.

---

### JLM-LINK-001 — Custom-scheme album link opens AlbumDetails
**Category:** Integration, Positive · **Priority:** P0 · **Platform:** Both
**Preconditions:** Signed in; app running.
**Steps:**
1. Trigger `kjubilee://album/<CODE>`.
**Expected Result:** Navigates to AlbumDetails for `<CODE>`.

---

### JLM-LINK-002 — Universal link `?c=` opens the album
**Category:** Integration · **Priority:** P0 · **Platform:** Both
**Preconditions:** Signed in.
**Steps:**
1. Open `https://kjubilee.com/album?c=<CODE>` (and `?code=<CODE>`).
**Expected Result:** `parseShareLink` extracts the code; AlbumDetails opens.

---

### JLM-LINK-003 — Path-style `/album/<CODE>` opens the album
**Category:** Integration · **Priority:** P1 · **Platform:** Both
**Preconditions:** Signed in.
**Steps:**
1. Open `https://kjubilee.com/album/<CODE>`.
**Expected Result:** AlbumDetails opens for `<CODE>`.

---

### JLM-LINK-004 — Legacy `/track/<code>-<i>-<n>` resolves to the album
**Category:** Integration, Regression · **Priority:** P2 · **Platform:** Both
**Preconditions:** Signed in.
**Steps:**
1. Open a legacy track share URL.
**Expected Result:** The last two segments are stripped; the album for `<code>` opens.

---

### JLM-LINK-005 — Cold-start link resolves after auth (signed out)
**Category:** Integration, Regression · **Priority:** P0 · **Platform:** Both
**Preconditions:** Signed out; app not running.
**Steps:**
1. Tap an album link; sign in when prompted.
**Expected Result:** `getInitialURL` + the retry loop (≤ 20×150ms until the nav container is
ready) resolves the pending link **after** authentication and opens AlbumDetails.

---

### JLM-LINK-006 — Cold-start link with a valid session
**Category:** Integration · **Priority:** P1 · **Platform:** Both
**Preconditions:** Signed in previously; app not running.
**Steps:**
1. Tap an album link.
**Expected Result:** App launches, restores session, and opens the album.

---

### JLM-LINK-007 — Tab deep links
**Category:** Integration · **Priority:** P2 · **Platform:** Both
**Preconditions:** Signed in.
**Steps:**
1. Open `kjubilee://home`, `/browse`, `/search`, `/library`.
**Expected Result:** Each selects the corresponding tab.

---

### JLM-LINK-008 — Artist deep link
**Category:** Integration · **Priority:** P2 · **Platform:** Both
**Preconditions:** Signed in.
**Steps:**
1. Open `kjubilee://artist/<ID>`.
**Expected Result:** ArtistDetails opens.

---

### JLM-LINK-009 — Player deep link
**Category:** Integration · **Priority:** P2 · **Platform:** Both (Dev build)
**Preconditions:** Signed in.
**Steps:**
1. Open `kjubilee://player`.
**Expected Result:** The MusicPlayer modal opens (nothing-playing empty state if idle).

---

### JLM-LINK-010 — Share an album (native sheet)
**Category:** Functional, Integration · **Priority:** P1 · **Platform:** Both
**Preconditions:** Album open or full player.
**Steps:**
1. Tap Share.
**Expected Result:** Native share sheet with `https://kjubilee.com/album?c=<CODE>` (iOS
`url` field; Android folds into the message). Sharing back to the app opens the album.

---

### JLM-LINK-011 — iOS universal link opens app not Safari
**Category:** Compatibility, Integration · **Priority:** P1 · **Platform:** iOS
**Preconditions:** iOS; app installed; AASA served on kjubilee.com.
**Steps:**
1. Tap an `https://kjubilee.com/album/...` link from another app.
**Expected Result:** Opens directly in the app via associated domains (`applinks:kjubilee.com`,
`applinks:www.kjubilee.com`). *Known dependency: requires the `.well-known/AASA` file
deployed on the domain.*

---

### JLM-LINK-012 — Android verified link opens app not browser
**Category:** Compatibility, Integration · **Priority:** P1 · **Platform:** Android
**Preconditions:** Android; app installed; assetlinks.json served.
**Steps:**
1. Tap an `https://kjubilee.com/album/...` link.
**Expected Result:** Opens the app directly via the `autoVerify` intent filter (host
kjubilee.com/www, `pathPrefix /album`). *Known dependency: requires
`.well-known/assetlinks.json` on the domain.*

---

### JLM-LINK-013 — Malformed / unknown link handled gracefully
**Category:** Negative, Boundary · **Priority:** P2 · **Platform:** Both
**Preconditions:** Signed in.
**Steps:**
1. Open `kjubilee://album/` (no code), a bad code, and an unrelated path.
**Expected Result:** No crash; either a not-found album state or a safe no-op; the app stays
usable.
