# 14 — Album Reviews List

Covers `screens/AlbumReviews/index.tsx` — distribution bars, sort chips, infinite
scroll pagination, and the composer entry point.

---

### JLM-RVWL-001 — Reviews list renders with summary and distribution
**Category:** Functional, Positive · **Priority:** P0 · **Platform:** Both
**Preconditions:** Album with several reviews; open AlbumReviews.
**Steps:**
1. Open "See all reviews" from an album.
**Expected Result:** Header + album subtitle, AlbumRatingSummary, 5→1★ distribution bars,
sort chips, and a list of ReviewItems.

---

### JLM-RVWL-002 — Empty reviews state
**Category:** Boundary, UI/UX · **Priority:** P1 · **Platform:** Both
**Preconditions:** Album with no reviews.
**Steps:**
1. Open its AlbumReviews.
**Expected Result:** A star + "no reviews" empty state; the Rate action still works.

---

### JLM-RVWL-003 — Loading state
**Category:** UI/UX · **Priority:** P2 · **Platform:** Both
**Preconditions:** Slow network.
**Steps:**
1. Open AlbumReviews.
**Expected Result:** A spinner shows in the list-empty area while the first page loads.

---

### JLM-RVWL-004 — Sort chips (recent / highest / lowest)
**Category:** Functional · **Priority:** P1 · **Platform:** Both
**Preconditions:** Album with mixed-rating reviews.
**Steps:**
1. Tap each sort chip.
**Expected Result:** The list re-sorts accordingly and reloads from page 1. (Note: a
`helpful` sort collapses to `recent` in the mapper.)

---

### JLM-RVWL-005 — Infinite scroll pagination
**Category:** Functional, Performance · **Priority:** P1 · **Platform:** Both
**Preconditions:** Album with > 10 reviews.
**Steps:**
1. Scroll to the bottom repeatedly.
**Expected Result:** `onEndReached` loads the next page (size 10) with a footer spinner;
pages append without duplicates; stops at the end.

---

### JLM-RVWL-006 — Rate from the reviews screen
**Category:** Functional · **Priority:** P1 · **Platform:** Both
**Preconditions:** Signed in; AlbumReviews open.
**Steps:**
1. Tap Rate in the summary.
**Expected Result:** ReviewComposer opens; saving refreshes the summary/list.

---

### JLM-RVWL-007 — Distribution bars reflect data
**Category:** Functional · **Priority:** P2 · **Platform:** Both
**Preconditions:** Album with a known rating spread.
**Steps:**
1. Compare bar lengths to the actual star distribution.
**Expected Result:** Bars are proportional to counts per star level.

---

### JLM-RVWL-008 — Album code → uuid conversion for API
**Category:** Integration, Regression · **Priority:** P1 · **Platform:** Both
**Preconditions:** AlbumReviews open.
**Steps:**
1. Observe reviews load for the correct album.
**Expected Result:** The album code is converted to `albumUuid` for the reviews API; correct
reviews load (not another album's).

---

### JLM-RVWL-009 — Review dates render without Intl
**Category:** Compatibility, Regression · **Priority:** P2 · **Platform:** Both
**Preconditions:** Reviews present.
**Steps:**
1. Inspect review dates.
**Expected Result:** Dates show like "May 2026" using the manual month table (no Hermes Intl
gap crash); edited reviews show "· edited".
