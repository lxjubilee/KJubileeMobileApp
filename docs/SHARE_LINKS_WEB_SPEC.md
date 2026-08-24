# Share Links — KJubilee.com web/backend spec (hand-off)

The mobile app now shares a track as an **https link to the album page** and deep-links
back into the app. To complete the seamless "rich preview + open app or go to store"
experience, the **KJubilee.com** repo (`D:\Projects Data\KJubilee.com`, Next.js web in
`app/web`) needs the three pieces below. The mobile side is already done.

## Canonical share URL
```
https://kjubilee.com/album?c=<ALBUM_CODE>
```
- `c` = album code (e.g. `EAIM1001RO`), already the web album page's param.

Sharing is **album-level**: a shared link always opens the album (the app navigates
to the album screen; there is no per-track web page). The mobile app emits exactly
this URL and parses it on open (`src/services/share/shareLinks.ts`).

## Credentials required (please provide)
| Value | Where to get it | Used in |
|---|---|---|
| **Apple Team ID** (10 chars) | Apple Developer account / `eas credentials` | `apple-app-site-association` |
| **App Store ID** (numeric, e.g. `123456789`) | App Store Connect listing | store redirect + smart banner |
| **Play Store URL** | `https://play.google.com/store/apps/details?id=com.kjubilee.app` | store redirect |
| **Android signing SHA-256** | `eas credentials` → Android → Keystore (or Play App Signing cert) | `assetlinks.json` |

Bundle id / package is `com.kjubilee.app` (both platforms).

---

## 1. Rich link preview (Open Graph) on the album page

Enrich `generateMetadata()` in `app/web/app/album/page.tsx` with dynamic Open Graph +
Twitter tags. The cover image already exists at `/cover/<code>.png`
(`app/web/app/cover/[code]/route.ts`).

```ts
export function generateMetadata({ searchParams }): Metadata {
  const code = albumCode(searchParams);            // existing helper
  const album = code ? getAlbumByCode(code) : null;
  if (!album) return { title: 'Album not found' };

  const url = `https://kjubilee.com/album?c=${album.code}`;
  const image = `https://kjubilee.com/cover/${album.code}.png`;
  const title = `${album.title} — ${album.artistName}`;
  const description =
    `${album.title} by ${album.artistName}. ${album.trackCount} tracks. Listen on KJubilee.`;

  return {
    title,
    description,
    openGraph: {
      title, description, url, siteName: 'KJubilee.com',
      type: 'music.album',
      images: [{ url: image, width: 1200, height: 1200, alt: title }],
    },
    twitter: { card: 'summary_large_image', title, description, images: [image] },
  };
}
```
Pages are server-rendered, so crawlers (WhatsApp, iMessage, Facebook, etc.) will read these.

## 2. Universal Links (iOS) + App Links (Android) association files

Serve both as **raw JSON with `Content-Type: application/json`** and **no redirects**.
In Next.js App Router, add route handlers:

`app/web/app/.well-known/apple-app-site-association/route.ts`
```ts
export function GET() {
  return Response.json({
    applinks: {
      apps: [],
      details: [
        { appID: '<APPLE_TEAM_ID>.com.kjubilee.app', paths: ['/album', '/album/*'] },
      ],
    },
  });
}
```

`app/web/app/.well-known/assetlinks.json/route.ts`
```ts
export function GET() {
  return Response.json([
    {
      relation: ['delegate_permission/common.handle_all_urls'],
      target: {
        namespace: 'android_app',
        package_name: 'com.kjubilee.app',
        sha256_cert_fingerprints: ['<ANDROID_SHA256_UPPERCASE_COLON_SEPARATED>'],
      },
    },
  ]);
}
```
Verify after deploy:
- `https://kjubilee.com/.well-known/apple-app-site-association` → 200, JSON, `application/json`.
- `https://kjubilee.com/.well-known/assetlinks.json` → 200, JSON.

## 3. Force install (store redirect) when the app isn't installed

Goal: when the app is **not** installed, send the recipient straight to the store to
install — don't show web content. An https link must pass through the web for a moment
(that's what makes "open app if installed" work), so the landing page does an **instant,
UA-gated redirect**:

```tsx
// client component on the album page; reuse UA logic from app/api/src/util/ua.js
const APP_STORE = 'https://apps.apple.com/app/id<APP_STORE_ID>';
const PLAY_STORE = 'https://play.google.com/store/apps/details?id=com.kjubilee.app';

// On mount, real mobile browser only (NOT crawlers, NOT desktop):
//   iOS     -> window.location.replace(APP_STORE)
//   Android -> window.location.replace(PLAY_STORE)
//   desktop -> stay on web (can't install a phone app) — show album / "scan QR for the app"
// Crawlers (WhatsApp/iMessage/Facebook bots): never redirect — they must read the OG tags
// from §1 so the preview renders. Gate on User-Agent server-side or skip redirect for bots.
```

When the app **is** installed, the Universal/App Link opens it directly and this page is
never seen — so this redirect only ever affects the not-installed case.

> **Caveat — landing on the album after install.** A plain Universal/App Link does **not**
> survive a fresh store install: after installing, the app opens to **Home**, not the
> shared album. To make the app open to the *exact shared album* after a new install
> (deferred deep linking), use **Branch.io** or **AppsFlyer OneLink** (Firebase Dynamic
> Links is discontinued). That's a separate, larger integration in both repos; the redirect
> above gives "force install" but not "install → open this album."

Optionally keep the iOS smart banner for the in-page case:
Also add the iOS smart banner in the album page `<head>`:
```ts
other: { 'apple-itunes-app': 'app-id=<APP_STORE_ID>, app-argument=https://kjubilee.com/album?c=<code>' }
```
(Universal/App Links open the app directly when installed — no banner needed there. The
banner/redirect is the *not-installed* path.)

---

## Notes
- iOS Universal Links and Android App Links only **verify** once these files are live on
  `kjubilee.com` **and** the app is rebuilt via EAS (the app already declares
  `associatedDomains` / `intentFilters` in `app.json`).
- The mobile app already opens the shared album from these links once installed;
  no further app changes are needed for the web side beyond hosting the files above.
