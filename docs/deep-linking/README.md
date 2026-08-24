# Deep linking — open shared album links in the KJubilee app

**Goal:** tapping `https://kjubilee.com/album?c=<CODE>` opens the installed app on the
Album screen (iOS Universal Links / Android App Links), and falls back to the website
when the app isn't installed.

## Status

The **mobile app is already fully configured** — no app code change is required:

- `app.json` → `ios.associatedDomains`: `applinks:kjubilee.com`, `applinks:www.kjubilee.com`
- `app.json` → `android.intentFilters`: `autoVerify: true` for `https://(www.)kjubilee.com/album*`
- `app.json` → `scheme: "kjubilee"` (custom-scheme fallback: `kjubilee://album/<CODE>`)
- `src/navigation/linking.ts` + `src/navigation/useShareDeepLinks.ts` parse the incoming
  URL (`/album?c=CODE`, `/album/CODE`, legacy `/track/...`) and navigate to `AlbumDetails`.

**The only missing piece is server-side:** the two "digital asset" files below are NOT
hosted on kjubilee.com. Without them the OS cannot verify the domain→app link and opens
the website instead of the app. These files must be served from the **kjubilee.com web
app** (this repo only holds the ready-to-deploy copies as a hand-off).

## What to deploy on kjubilee.com

Serve these two files (this folder holds them) at exactly these URLs, over HTTPS, with
**no redirects**, **no auth**, and `Content-Type: application/json`:

| File | Must be reachable at |
| --- | --- |
| `apple-app-site-association` (no extension) | `https://kjubilee.com/.well-known/apple-app-site-association` |
| `assetlinks.json` | `https://kjubilee.com/.well-known/assetlinks.json` |

Also serve both on `https://www.kjubilee.com/.well-known/...` (the app associates the
`www` host too).

For the Next.js site this is a static drop-in: place both files in
`app/web/public/.well-known/`. Next.js serves `public/.well-known/*` automatically. Verify
after deploy that a plain `curl` returns the JSON with `200` and `application/json` (some
CDNs strip extension-less files or add auth walls — check the AASA one specifically).

## Fill in the two placeholders first

1. **`apple-app-site-association` → `appID`** = `<AppleTeamID>.com.kjubilee.app`
   - Get the 10-char Team ID from Apple Developer → Membership, or run `eas credentials`
     (platform iOS) and read the Team ID, or App Store Connect.

2. **`assetlinks.json` → `sha256_cert_fingerprints`** = the app's release signing SHA-256.
   - EAS manages the keystore. Run `eas credentials` (platform Android) → view the keystore
     → copy the **SHA-256 Fingerprint** (this is the EAS upload key).
   - If the app is (or will be) distributed via Google Play with **Play App Signing**
     (default), ALSO include the **App signing key** SHA-256 from Play Console → *Test and
     release → App integrity → App signing key certificate*. Keeping both fingerprints means
     links verify whether the APK is signed by the upload key (internal/dev builds) or
     re-signed by Google (Play).
   - Remove the placeholder line(s) you don't use.

## Testing after deploy

- **Google Statement List Tester:** paste
  `https://digitalassetlinks.googleapis.com/v1/statements:list?source.web.site=https://kjubilee.com&relation=delegate_permission/common.handle_all_urls`
  → should return your `assetlinks.json` statement.
- **Apple AASA validator:** `https://app-site-association.cdn-apple.com/a/v1/kjubilee.com`
  (Apple's CDN cache) or any AASA validator → should show the `/album` paths.
- **Android device (app installed):**
  `adb shell am start -a android.intent.action.VIEW -d "https://kjubilee.com/album?c=JEIM1071EN"`
  → opens the app on the album. Check verification with
  `adb shell pm get-app-links com.kjubilee.app` (domain should be `verified`).
- **iOS device:** tap the link from Notes/Messages (not from Safari's address bar). iOS
  caches AASA — reinstall the app or wait if it doesn't associate immediately.

## Notes

- EAS prebuild regenerates native projects from `app.json`, so the intent filters /
  associated domains ship automatically — do not hand-edit `android/` or `ios/`.
- Sharing is album-level (there is no per-track web page); "music" links resolve to their
  album. If per-artist links (`/artist/...`) should also open the app later, add
  `"/artist"`, `"/artist/*"` to the AASA `paths` and a second Android intent-filter data
  entry with `pathPrefix: "/artist"`, then redeploy the AASA file.
