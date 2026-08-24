# KJubilee

A premium music-streaming mobile app (React Native + Expo, TypeScript) with a Netflix-style
experience — dark theme, edge-to-edge artwork, horizontally-scrolling rails, immersive detail
screens, and a persistent mini-player — for **music, albums, artists, and playlists**.

All media is served from **cdn.kjubilee.com** (see `extra.cdnBaseUrl` in [app.json](app.json)).

## Important: requires a Dev Build (not Expo Go)

Audio uses **react-native-track-player** for true background playback and lock-screen /
notification controls. This needs a custom native build:

```bash
npm install
npx expo prebuild          # generates native android/ + ios/ projects
npx expo run:android       # or: npx expo run:ios  (macOS only)
```

Then `npm start` runs the dev server for that build. **Expo Go will not work.**

`npm run typecheck` runs `tsc --noEmit`.

## Architecture

```
src/
├── assets/mock/        # bundled mock JSON (albums, artists, tracks, home rails)
├── components/         # common / cards / player / modals — reusable, theme-driven
├── screens/            # one folder per screen (Home, AlbumDetails, … fully built; rest stubs)
├── navigation/         # RootNavigator + MainTabNavigator + LibraryStack + types + linking
├── services/
│   ├── api/            # axios client, endpoints, DTOs, DTO→model mappers
│   ├── music/          # track-player setup, playback service, queue helpers
│   └── storage/        # AsyncStorage wrapper + keys
├── repositories/       # DataSource interface + Mock/Api implementations + repositories
├── redux/              # slices (player, library, home, search, downloads, auth) + store
├── hooks/              # usePlayer, usePlayerSync, useDebounce, typed redux + theme hooks
├── context/            # ThemeProvider
├── theme/              # colors / typography / spacing tokens (dark default)
├── localization/       # i18next setup + en.json
├── utils/              # cdn url builder, formatters, logger
├── constants/          # env, config flags, route names
└── types/              # domain models
```

### Key patterns

- **Repository + swappable DataSource** — `src/repositories`. Flip `extra.useMock` in
  [app.json](app.json) (read via `CONFIG.USE_MOCK`) to switch from bundled mock JSON
  (`MockDataSource`) to the live API (`ApiDataSource`). Nothing above the data source changes.
- **DTOs decoupled from domain models** — `services/api/dto.ts` + `mappers.ts`. Backend field
  changes are absorbed in the mappers only.
- **Single CDN entry point** — `utils/cdn.ts` `cdnUrl()` resolves every relative media path.
- **Redux Toolkit, slice-per-domain**, with `redux-persist` persisting only durable data
  (library, downloads, player prefs, recent searches).
- **track-player as the engine source of truth**; `usePlayerSync` mirrors it into Redux,
  `usePlayer` exposes read state + commands to screens.
- **Typed navigation** — `navigation/types.ts` param lists; deep links in `navigation/linking.ts`.
- **Path alias** `@/*` → `src/*` (tsconfig + Metro).

### Navigation

```
RootNavigator (native-stack)
├── MainTabs (Home · Browse · Search · Library)   ← MiniPlayer floats above tab bar
│   └── LibraryTab stack: Library → Downloads / Profile
├── AlbumDetails / ArtistDetails   (full-screen push)
└── MusicPlayer / Auth             (modal, slide-up)
```

## Notes on mock data

`src/assets/mock` uses absolute sample audio (SoundHelix) and image (picsum) URLs so playback
and artwork work immediately in development. When the real API is ready, store CDN-relative
paths and flip `useMock` to `false`.
