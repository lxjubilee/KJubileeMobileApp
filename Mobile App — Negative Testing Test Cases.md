# Mobile App — Negative Testing Test Cases

## 1. App Launch & Initialization

| TC ID | Test Case | Expected Result |
|---|---|---|
| NEG-001 | Launch the app with no internet connection | App should not crash; show an appropriate offline/error message |
| NEG-002 | Launch the app with very slow internet | App should remain responsive and show loading state |
| NEG-003 | Launch the app while the backend/server is unavailable | App should show a proper error state instead of crashing |
| NEG-004 | Launch the app with expired authentication/session | User should be redirected to login or session recovery |
| NEG-005 | Kill the app during startup and reopen it | App should recover normally |
| NEG-006 | Repeatedly open and close the app | App should not crash or create duplicate sessions/processes |
| NEG-007 | Launch the app with insufficient device storage | App should handle failures gracefully |

## 2. Network & API Failures

| TC ID | Test Case | Expected Result |
|---|---|---|
| NEG-008 | Turn off internet while an API request is running | Request should fail gracefully |
| NEG-009 | Switch between Wi-Fi and mobile data during a request | App should recover without crashing |
| NEG-010 | API returns HTTP 400 | Show appropriate error handling |
| NEG-011 | API returns HTTP 401 | Handle authentication failure correctly |
| NEG-012 | API returns HTTP 403 | Show permission/access error |
| NEG-013 | API returns HTTP 404 | Show appropriate unavailable/not-found state |
| NEG-014 | API returns HTTP 500 | Show server error without crashing |
| NEG-015 | API request takes too long | Show timeout/retry handling |
| NEG-016 | API returns malformed/invalid JSON | App should not crash |
| NEG-017 | API returns empty response | App should display a proper empty state |
| NEG-018 | API returns missing fields | App should use safe fallbacks |
| NEG-019 | API returns unexpected data types | App should not crash |
| NEG-020 | Multiple API requests fail at the same time | App should remain stable |

## 3. Login & Authentication

| TC ID | Test Case | Expected Result |
|---|---|---|
| NEG-021 | Submit login with empty email | Validation message should appear |
| NEG-022 | Submit login with empty password | Validation message should appear |
| NEG-023 | Enter invalid email format | Invalid email message should appear |
| NEG-024 | Enter incorrect password | Login should fail with a clear message |
| NEG-025 | Enter incorrect email and password | Login should fail safely |
| NEG-026 | Enter spaces as email | Validation should prevent invalid login |
| NEG-027 | Enter spaces as password | App should handle correctly |
| NEG-028 | Enter extremely long email | App should not crash or break the layout |
| NEG-029 | Enter extremely long password | App should handle input safely |
| NEG-030 | Paste unexpected/special characters into login fields | App should handle input safely |
| NEG-031 | Tap Login repeatedly | Only one login request should be processed |
| NEG-032 | Disconnect internet during login | Login should fail gracefully |
| NEG-033 | Login with expired/invalid server session | User should be asked to authenticate again |
| NEG-034 | Close app immediately after login | Session should remain consistent |
| NEG-035 | Logout and press Back | Protected screens should not become accessible |

## 4. Registration / Signup

| TC ID | Test Case | Expected Result |
|---|---|---|
| NEG-036 | Submit signup with all fields empty | Required-field validation appears |
| NEG-037 | Use invalid email | Signup should be rejected |
| NEG-038 | Use an already registered email | Proper error should be displayed |
| NEG-039 | Use weak password | Password validation should appear |
| NEG-040 | Enter mismatched passwords | Signup should be prevented |
| NEG-041 | Enter extremely long values | UI should remain stable |
| NEG-042 | Submit signup repeatedly | Duplicate requests/accounts should not be created |
| NEG-043 | Disconnect network during signup | Signup should fail safely |
| NEG-044 | Backend returns validation error | Error should be displayed correctly |

## 5. Forms & Input Fields

| TC ID | Test Case | Expected Result |
|---|---|---|
| NEG-045 | Submit form with required fields empty | Validation should appear |
| NEG-046 | Enter only spaces | Input should be treated as invalid where appropriate |
| NEG-047 | Enter extremely long text | Text should not break the UI |
| NEG-048 | Enter special characters | App should handle safely |
| NEG-049 | Enter emoji where unsupported | App should not crash |
| NEG-050 | Paste large text into input | App should remain responsive |
| NEG-051 | Open keyboard while form is near bottom of screen | Input should remain visible |
| NEG-052 | Rotate/change device dimensions while keyboard is open | Layout should remain stable |
| NEG-053 | Press Submit multiple times quickly | Duplicate requests should not occur |
| NEG-054 | Navigate away while submitting | App should handle the pending request safely |

## 6. Navigation

| TC ID | Test Case | Expected Result |
|---|---|---|
| NEG-055 | Rapidly tap navigation buttons | App should not open duplicate screens |
| NEG-056 | Press Back repeatedly | App should navigate safely without crashing |
| NEG-057 | Press Back from the first screen | App should follow expected exit/navigation behavior |
| NEG-058 | Open protected screen without authentication | Access should be denied |
| NEG-059 | Navigate while data is still loading | App should remain stable |
| NEG-060 | Navigate away and return during an API request | Screen should recover correctly |
| NEG-061 | Open the same screen repeatedly | No duplicate or broken navigation stack |
| NEG-062 | Deep link to an invalid screen/route | App should show a safe fallback |

## 7. UI & Layout Negative Testing

| TC ID | Test Case | Expected Result |
|---|---|---|
| NEG-063 | Use very small screen/device | UI should not overlap or become unusable |
| NEG-064 | Use very large screen/device | UI should remain properly aligned |
| NEG-065 | Use large system font size | Text should not overlap or get cut off |
| NEG-066 | Use long translated text | UI should handle wrapping correctly |
| NEG-067 | Use missing/broken image URL | Placeholder/error state should appear |
| NEG-068 | Load extremely large image | App should not freeze or crash |
| NEG-069 | Test screen with empty data | Proper empty state should appear |
| NEG-070 | Test screen with a large amount of data | Scrolling and layout should remain stable |
| NEG-071 | Test buttons with long text | Button text should not overflow |
| NEG-072 | Test dark/light mode if supported | UI should remain readable and consistent |
| NEG-073 | Test status/navigation bar areas | Content should not overlap system UI |
| NEG-074 | Open/close modal repeatedly | Modal should not duplicate or become stuck |



| TC ID | Test Case | Expected Result |
|---|---|---|
| NEG-085 | Send an empty message | Sending should be prevented |
| NEG-086 | Send only spaces | Sending should be prevented |
| NEG-087 | Send extremely long message | App should handle it safely |
| NEG-088 | Send message while offline | Message should fail gracefully or be queued if supported |
| NEG-089 | Send message repeatedly very quickly | Duplicate messages should be prevented where appropriate |
| NEG-090 | Close app while message is sending | App should handle message state correctly |
| NEG-091 | API fails while sending message | User should see failure state and message should not silently disappear |
| NEG-092 | Receive malformed message data | App should not crash |
| NEG-093 | Open chat with no messages | Correct empty state should appear |
| NEG-094 | Load a very large chat history | App should remain responsive |
| NEG-095 | Scroll rapidly through chat history | No crashes, blank screens, or broken layout |

## 8. Audio / Radio Playback

| TC ID | Test Case | Expected Result |
|---|---|---|
| NEG-096 | Start playback without internet | Proper offline state should appear |
| NEG-097 | Disconnect internet during playback | Playback should stop/pause gracefully |
| NEG-098 | Audio URL returns 404 | App should handle playback failure |
| NEG-099 | Audio server returns 500 | App should show playback error |
| NEG-100 | Audio file is unavailable | App should not crash |
| NEG-101 | Rapidly press Play/Pause | Player should remain in a valid state |
| NEG-102 | Rapidly switch stations | Only the selected station should play |
| NEG-103 | Switch station while previous audio is loading | Previous playback should stop correctly |
| NEG-104 | Put app in background during playback | Playback should follow expected background behavior |
| NEG-105 | Kill app during playback and reopen | Player state should recover correctly |
| NEG-106 | Receive invalid/missing schedule data | App should handle missing schedule safely |
| NEG-107 | Current program data is unavailable | UI should show a safe fallback |
| NEG-108 | Device volume is zero | App should not show a false playback failure |
| NEG-109 | Connect/disconnect Bluetooth headphones during playback | Audio state should recover correctly |


|---|---|---|
| NEG-110 | Add the same song to favorites repeatedly | Duplicate favorites should not be created |
| NEG-111 | Remove a favorite that no longer exists | App should handle safely |
| NEG-112 | Favorite API fails | UI should not show an incorrect permanent state |
| NEG-113 | Add item while offline | Proper failure/queue behavior should occur |
| NEG-114 | Open empty playlist | Correct empty state should appear |
| NEG-115 | Delete playlist item repeatedly | App should remain stable |
| NEG-116 | Playlist API returns invalid data | App should not crash |

## 9. Permissions

| TC ID | Test Case | Expected Result |
|---|---|---|
| NEG-117 | Deny notification permission | App should continue working |
| NEG-118 | Deny photo/media permission | App should explain why access is required |
| NEG-119 | Deny microphone permission where required | Feature should fail gracefully |
| NEG-120 | Revoke permission from device settings | App should detect the missing permission |
| NEG-121 | Select "Don't Allow" repeatedly | App should not continuously crash/request incorrectly |
| NEG-122 | Use feature without required permission | User should receive a clear message |

## 10. Session & Security

| TC ID | Test Case | Expected Result |
|---|---|---|
| NEG-123 | Use expired access token | App should refresh or re-authenticate |
| NEG-124 | Use invalid refresh token | Session should be cleared safely |
| NEG-125 | Logout while API request is running | Protected data should not remain accessible |
| NEG-126 | Open app after session expiration | User should be redirected appropriately |
| NEG-127 | Access protected API without authentication | Request should be rejected |
| NEG-128 | Repeatedly refresh authentication | No duplicate refresh requests or loops |
| NEG-129 | Clear app data and reopen | App should start in a clean state |
| NEG-130 | Attempt to access another user's protected data | Access should be denied |

## 11. Performance & Stability

| TC ID | Test Case | Expected Result |
|---|---|---|
| NEG-131 | Rapidly navigate through all screens | No crash or memory issue |
| NEG-132 | Repeatedly open/close heavy screens | App should remain stable |
| NEG-133 | Scroll large lists continuously | No freezing or crashes |
| NEG-134 | Load many images simultaneously | App should remain responsive |
| NEG-135 | Keep app running for a long period | No major memory leak or degradation |
| NEG-136 | Switch app between foreground/background repeatedly | App should remain stable |
| NEG-137 | Receive multiple API failures continuously | App should not enter a broken state |
| NEG-138 | Rapidly trigger the same action | App should prevent duplicate processing |

## 12. Device & System Interruption

| TC ID | Test Case | Expected Result |
|---|---|---|
| NEG-139 | Receive a phone call while using the app | App should recover correctly |
| NEG-140 | Receive notification while app is open | UI should remain stable |
| NEG-141 | Lock device while app is open | App should recover after unlock |
| NEG-142 | Switch to another app and return | App state should be preserved where expected |
| NEG-143 | Device goes into low-power mode | App should handle system restrictions |
| NEG-144 | Device storage becomes full | App should fail gracefully |
| NEG-145 | Network changes from Wi-Fi to mobile data | Requests/playback should recover |
| NEG-146 | System font size is increased | Layout should remain usable |

## 13. Error Handling

| TC ID | Test Case | Expected Result |
|---|---|---|
| NEG-147 | Trigger an unknown application error | User should see a friendly error |
| NEG-148 | Backend returns unexpected error message | App should show a safe generic message |
| NEG-149 | API returns null values | App should not crash |
| NEG-150 | API returns empty arrays | Proper empty state should appear |
| NEG-151 | API response is delayed | Loading state should remain visible |
| NEG-152 | API request fails after loading state | Loading should stop and error should appear |
| NEG-153 | Retry a failed request | Retry should work correctly |
| NEG-154 | Retry repeatedly while offline | App should remain stable and avoid excessive requests |

# Final Negative Testing Requirements

After completing all test cases:

1. Test every major screen of the app.
2. Test every important user action with invalid input.
3. Test offline and poor-network scenarios.
4. Test API failure scenarios.
5. Test expired and invalid sessions.
6. Test permission denial.
7. Test empty, null, missing, and malformed API data.
8. Test extreme input lengths.
9. Test rapid/repeated user actions.
10. Test app background/foreground transitions.
11. Test device interruptions.
12. Verify that **no negative test causes an app crash**.
13. Verify that every failure has a clear and user-friendly response.
14. Verify that failed operations do not silently lose user data.
15. Re-test every issue after fixing it.

### Test Result Format

For every failed test case, record:

**Test Case ID:**  
**Screen/Feature:**  
**Steps to Reproduce:**  
**Expected Result:**  
**Actual Result:**  
**Severity:** Critical / High / Medium / Low  
**Status:** Failed / Fixed / Retested  
**Screenshot/Video:**  
**Additional Notes:**