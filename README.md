# KJubilee

The KJubilee radio network on mobile (React Native + Expo, TypeScript): 105 stations on the
HM 300–399.90 band, tuned with a rotary dial, browsed by category, and placed on a broadcast
map, with a persistent now-playing bar.

Station audio is served from the CDN as clock-resolved day files (see `extra.cdnBaseUrl` in
[app.json](app.json)).

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
├── assets/radio/       # station catalog, sections, artwork, band articles, world map
├── components/         # common / auth / player / station — reusable, theme-driven
├── screens/            # one folder per screen (Home, Dial, Browse, Map, StationDetail, …)
├── navigation/         # RootNavigator + MainTabNavigator + ProfileStack + types + linking
├── services/
│   ├── radio/          # station catalog, day-file resolver, schedule, radio player
│   ├── music/          # track-player setup + background playback service
│   ├── auth/           # Jubilee ID sign-in, tokens, SSO
│   ├── stationEngagement/  # station favourites + like/dislike feedback
│   └── storage/        # AsyncStorage wrapper + keys
├── redux/              # slices (auth, station favourites, station likes, settings) + store
├── hooks/              # useRadio, useStationEngagement, typed redux + theme hooks
├── context/            # ThemeProvider
├── theme/              # colors / typography / spacing tokens (dark default)
├── localization/       # i18next setup + locales
├── utils/              # cdn url builder, formatters, logger
└── constants/          # env, config flags, route names
```

### Key patterns

- **Stations are clock-resolved day files**, not live streams: the radio engine picks the
  entry that should be sounding now and seeks into it, so every listener hears the same thing.
- **Redux Toolkit, slice-per-domain**, with `redux-persist` persisting only durable data
  (station favourites and likes, language).
- **Sign-in is optional** — the Jubilee Door is a modal route, opened only for account features.
- **Typed navigation** — `navigation/types.ts` param lists; deep links in `navigation/linking.ts`,
  frequency links (`kjubilee.com/hm308.70`) in `navigation/useShareDeepLinks.ts`.
- **Path alias** `@/*` → `src/*` (tsconfig + Metro).

### Navigation

```
RootNavigator (native-stack)
├── MainTabs (Home · Dial · Browse · Map · Profile)   ← MiniPlayer floats above tab bar
│   └── ProfileTab stack: Profile → EditName / ChangePassword / Legal
├── StationDetail / StationList / FavoriteStations / BandArticles   (full-screen push)
└── JubileeDoor                                                      (modal, slide-up)
```
