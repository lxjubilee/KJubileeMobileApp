# 19 — Player (Mini / Floating / Full)

Covers `MiniPlayer`, `FloatingMiniPlayer`, `MusicPlayerScreen`, `ProgressBar`,
transport controls, queue sheet, repeat/shuffle, and track options. **Requires a dev
build** — audio no-ops in Expo Go.

---

### JLM-PLYR-001 — MiniPlayer appears when a track plays
**Category:** Functional, Positive · **Priority:** P0 · **Platform:** Both (Dev build)
**Preconditions:** Dev build; start playback.
**Steps:**
1. Play any track; view the tab bar area.
**Expected Result:** MiniPlayer shows above the tab bar with artwork, title, artist,
play/pause, skip-forward, and a thin progress fill. Renders nothing when no track.

---

### JLM-PLYR-002 — MiniPlayer play/pause and skip
**Category:** Functional · **Priority:** P0 · **Platform:** Both (Dev build)
**Preconditions:** A track playing.
**Steps:**
1. Tap pause; tap play; tap skip-forward.
**Expected Result:** Toggles play/pause (buffering spinner while buffering); skip advances to
the next track.

---

### JLM-PLYR-003 — MiniPlayer opens the full player
**Category:** Functional · **Priority:** P1 · **Platform:** Both (Dev build)
**Preconditions:** A track playing.
**Steps:**
1. Tap the MiniPlayer body.
**Expected Result:** The MusicPlayer modal slides up.

---

### JLM-PLYR-004 — Full player layout
**Category:** UI/UX · **Priority:** P1 · **Platform:** Both (Dev build)
**Preconditions:** MusicPlayer open with a track.
**Steps:**
1. Inspect the screen.
**Expected Result:** Blurred artwork background, header (close chevron, album name, "⋮"),
large artwork, title + artist link, add-to-playlist + like, ProgressBar, transport (shuffle,
prev, play/pause, next, repeat), footer share + queue buttons.

---

### JLM-PLYR-005 — Seek via ProgressBar (tap and drag)
**Category:** Functional, Regression · **Priority:** P0 · **Platform:** Both (Dev build)
**Preconditions:** A track playing.
**Steps:**
1. Tap a point on the ProgressBar; then drag the thumb and release.
**Expected Result:** Playback seeks to the tapped/dragged position; the thumb holds the
dragged value until the real position catches up (no snap-back).

---

### JLM-PLYR-006 — Next / previous
**Category:** Functional · **Priority:** P0 · **Platform:** Both (Dev build)
**Preconditions:** A multi-track queue.
**Steps:**
1. Tap next; tap previous.
**Expected Result:** Advances/retreats through the queue; artwork/title update.

---

### JLM-PLYR-007 — Repeat mode cycling
**Category:** Functional · **Priority:** P1 · **Platform:** Both (Dev build)
**Preconditions:** MusicPlayer open.
**Steps:**
1. Tap the repeat button repeatedly.
**Expected Result:** Cycles off → repeat-queue → repeat-track; behavior at end of queue
matches the selected mode; the setting persists (`playerSlice`).

---

### JLM-PLYR-008 — Shuffle toggle
**Category:** Functional · **Priority:** P1 · **Platform:** Both (Dev build)
**Preconditions:** MusicPlayer open; multi-track queue.
**Steps:**
1. Toggle shuffle on; observe upcoming order; toggle off.
**Expected Result:** Shuffle reorders only the upcoming queue (current track keeps playing);
persists across relaunch.

---

### JLM-PLYR-009 — Queue sheet
**Category:** Functional · **Priority:** P1 · **Platform:** Both (Dev build)
**Preconditions:** MusicPlayer open.
**Steps:**
1. Tap the queue button; tap a track in "Up Next".
**Expected Result:** The queue sheet lists upcoming tracks (active highlighted); tapping
plays that track (`playFrom`). Empty queue shows "queueEmpty".

---

### JLM-PLYR-010 — Track options from the full player
**Category:** Functional · **Priority:** P1 · **Platform:** Both (Dev build)
**Preconditions:** MusicPlayer open.
**Steps:**
1. Tap "⋮"; try Like, Go to Album, Go to Artist, Share.
**Expected Result:** Each action works — like toggles, navigation opens the right screen (and
closes the modal appropriately), share opens the sheet.

---

### JLM-PLYR-011 — Like/add-to-playlist from full player
**Category:** Functional · **Priority:** P1 · **Platform:** Both (Dev build)
**Preconditions:** MusicPlayer open.
**Steps:**
1. Tap the heart; tap add-to-playlist.
**Expected Result:** Heart toggles the song like; add-to-playlist opens the picker.

---

### JLM-PLYR-012 — Nothing-playing empty state
**Category:** Boundary, UI/UX · **Priority:** P2 · **Platform:** Both (Dev build)
**Preconditions:** No current track; open MusicPlayer (e.g. via deep link `player`).
**Steps:**
1. Open the player with nothing playing.
**Expected Result:** An empty view with a close control; no crash.

---

### JLM-PLYR-013 — Buffering indicator
**Category:** UI/UX · **Priority:** P2 · **Platform:** Both (Dev build)
**Preconditions:** Slow network during playback.
**Steps:**
1. Start a track on a slow connection.
**Expected Result:** Play/pause shows a buffering spinner; buffering is treated as "playing"
(icon doesn't flicker).

---

### JLM-PLYR-014 — Lock-screen / notification controls
**Category:** Integration, Compatibility · **Priority:** P0 · **Platform:** Both (Dev build)
**Preconditions:** A track playing; lock the device / pull the notification.
**Steps:**
1. Use play/pause, next/prev, seek, and jump ±15s from the lock screen/notification.
2. Unplug headphones during playback.
**Expected Result:** Remote controls map to engine actions (`playbackService`); metadata/
artwork show; headset unplug behaves per OS. Android shows a media-playback foreground
notification.

---

### JLM-PLYR-015 — Background playback continues
**Category:** Functional, Compatibility · **Priority:** P0 · **Platform:** Both (Dev build)
**Preconditions:** A track playing.
**Steps:**
1. Background the app; lock the screen.
**Expected Result:** Audio continues in the background (iOS `UIBackgroundModes: audio`,
Android foreground service).

---

### JLM-PLYR-016 — App-kill stops playback (Android)
**Category:** Integration, Regression · **Priority:** P1 · **Platform:** Android (Dev build)
**Preconditions:** A track playing.
**Steps:**
1. Swipe the app away from recents.
**Expected Result:** Playback stops and the notification is removed
(`StopPlaybackAndRemoveNotification`).

---

### JLM-PLYR-017 — Queue fill is deferred but complete
**Category:** Performance, Integration · **Priority:** P1 · **Platform:** Both (Dev build)
**Preconditions:** Play a large album.
**Steps:**
1. Play an album; immediately open the queue sheet.
**Expected Result:** Playback starts near-instantly (only the start track is added first);
the remaining queue fills on the next tick without blocking the UI.

---

### JLM-PLYR-018 — MiniPlayer visibility by surface
**Category:** UI/UX, Regression · **Priority:** P1 · **Platform:** Both (Dev build)
**Preconditions:** A track playing.
**Steps:**
1. Visit tabs, then a detail push (AlbumDetails), then Profile.
**Expected Result:** Tab screens show the tab-bar MiniPlayer; full-screen pushes show the
FloatingMiniPlayer; **Profile hides the MiniPlayer** entirely.

---

### JLM-PLYR-019 — Progress does not overrun on track change
**Category:** Regression · **Priority:** P2 · **Platform:** Both (Dev build)
**Preconditions:** Auto-advance to the next track.
**Steps:**
1. Let a track finish and the next begin.
**Expected Result:** Progress resets cleanly for the new track (`useSafeProgress`); no stale
position/flicker.

---

### JLM-PLYR-020 — Audio no-ops in Expo Go
**Category:** Compatibility · **Priority:** P2 · **Platform:** Both (Expo Go)
**Preconditions:** Running in Expo Go.
**Steps:**
1. Tap Play anywhere.
**Expected Result:** No audio, no crash; UI reflects no active track (engine guarded by
`isExpoGo`).
