# 18 — Reviews & Ratings

Covers `ReviewComposer`, `StarRating`, `SongRatingControl`, `AlbumRatingSummary`,
`MyContributions`, and `reviewsApi` (`/api/reviews/*`). Album & song targets key by
`albumUuid` / `songUuid`.

---

### JLM-RVW-001 — Create an album rating + review
**Category:** Functional, Positive, Integration · **Priority:** P0 · **Platform:** Both
**Preconditions:** Signed in; album open; no prior review by this user.
**Steps:**
1. Tap Rate; set stars; optionally add title/body; Save.
**Expected Result:** `upsert` (PUT) succeeds; summary/average/count update; the composer
closes.

---

### JLM-RVW-002 — Rating is required (min 1 star)
**Category:** Negative, Boundary · **Priority:** P0 · **Platform:** Both
**Preconditions:** Composer open.
**Steps:**
1. Try to Save with 0 stars.
**Expected Result:** Save is blocked until at least 1 star is selected.

---

### JLM-RVW-003 — Title max length (boundary)
**Category:** Boundary · **Priority:** P1 · **Platform:** Both
**Preconditions:** Composer open.
**Steps:**
1. Enter 149, 150, then attempt 151 chars in the title.
**Expected Result:** Input caps at 150 (`maxLength`); 151st char not accepted.

---

### JLM-RVW-004 — Body max length + counter (boundary)
**Category:** Boundary, UI/UX · **Priority:** P1 · **Platform:** Both
**Preconditions:** Composer open.
**Steps:**
1. Enter 4999, 5000, then attempt 5001 chars in the body.
**Expected Result:** Char counter updates; input caps at 5000; 5001st not accepted.

---

### JLM-RVW-005 — Edit an existing review
**Category:** Functional · **Priority:** P1 · **Platform:** Both
**Preconditions:** User has a review on this target.
**Steps:**
1. Open the composer (shows "Edit your rating"); change stars/text; Save.
**Expected Result:** The review updates (same PUT upsert); "· edited" appears on the item.

---

### JLM-RVW-006 — Delete a review
**Category:** Functional · **Priority:** P1 · **Platform:** Both
**Preconditions:** Composer open in edit mode.
**Steps:**
1. Tap Delete.
**Expected Result:** `remove` (DELETE) runs; summary/count decrement; the user's review is gone.

---

### JLM-RVW-007 — Per-song rating
**Category:** Functional · **Priority:** P1 · **Platform:** Both
**Preconditions:** Album open with tracks.
**Steps:**
1. Rate an individual track via SongRatingControl.
**Expected Result:** Composer opens with a song target (`songUuid`); saving shows the
per-song rating pill ("Your rating") and count.

---

### JLM-RVW-008 — StarRating interactive selection
**Category:** UI/UX · **Priority:** P2 · **Platform:** Both
**Preconditions:** Composer open.
**Steps:**
1. Tap each of the 5 stars.
**Expected Result:** Star selection updates 1–5; gold fill (`#F6B01E`) reflects the value.

---

### JLM-RVW-009 — StarRating fractional display
**Category:** UI/UX · **Priority:** P2 · **Platform:** Both
**Preconditions:** A target with a non-integer average (e.g. 4.8).
**Steps:**
1. View the summary stars.
**Expected Result:** The average renders with a fractional gold fill clip (partial star).

---

### JLM-RVW-010 — Save failure keeps composer open with error
**Category:** Negative, Integration · **Priority:** P1 · **Platform:** Both
**Preconditions:** Force `upsert` to fail.
**Steps:**
1. Save a review with the API failing.
**Expected Result:** Error text shown; composer stays open; no phantom review appears.

---

### JLM-RVW-011 — MyContributions on Profile
**Category:** Functional, Integration · **Priority:** P1 · **Platform:** Both
**Preconditions:** Signed in with reviews.
**Steps:**
1. Open Profile.
**Expected Result:** MyContributions shows stat cards (albumsRated, songsRated,
reviewsWritten, helpfulReceived, total) and the user's reviews with status pills
(published/other) and target-type pills.

---

### JLM-RVW-012 — MyContributions empty/loading states
**Category:** Boundary, UI/UX · **Priority:** P2 · **Platform:** Both
**Preconditions:** (a) no reviews, (b) slow fetch.
**Steps:**
1. Open Profile with each condition.
**Expected Result:** (a) An empty state for own reviews; (b) a loading state while
`getContributions`/`getMyReviews` resolve.

---

### JLM-RVW-013 — Composer keyboard handling
**Category:** UI/UX, Compatibility · **Priority:** P2 · **Platform:** Both
**Preconditions:** Composer open.
**Steps:**
1. Focus the body field with the keyboard up; scroll; dismiss.
**Expected Result:** KeyboardAvoidingView keeps inputs visible (iOS padding); no fields
hidden behind the keyboard; closing the composer dismisses the keyboard.

---

### JLM-RVW-014 — Batch summaries keyed correctly
**Category:** Integration · **Priority:** P2 · **Platform:** Both
**Preconditions:** Album with multiple tracks having ratings.
**Steps:**
1. Open an album and observe per-song rating controls populate.
**Expected Result:** `batchSummaries` returns summaries keyed by `"{type}:{id}"` and each
track's control shows its own correct average/count.

---

### JLM-RVW-015 — Reviews require sign-in
**Category:** Security · **Priority:** P2 · **Platform:** Both
**Preconditions:** N/A (reviews are an authed action).
**Steps:**
1. Confirm rating/review actions require an authenticated session.
**Expected Result:** The composer/upsert is only reachable while signed in; the request uses
the Bearer token.
