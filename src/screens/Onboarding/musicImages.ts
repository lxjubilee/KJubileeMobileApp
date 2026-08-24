/**
 * Decorative, music-themed imagery for the onboarding flow (Unsplash).
 *
 * These are intentionally independent of the catalog so onboarding always
 * renders fast and looks on-brand (vinyl, live shows, headphones, instruments,
 * studios) regardless of the data source. All IDs are verified to resolve.
 */

const MUSIC_PHOTO_IDS = [
  'photo-1493225457124-a3eb161ffa5f', // live concert crowd
  'photo-1511671782779-c97d3d27a1d4', // headphones on yellow
  'photo-1459749411175-04bf5292ceea', // concert stage lights
  'photo-1470225620780-dba8ba36b745', // singer with mic
  'photo-1514525253161-7a46d19cd819', // crowd at a show
  'photo-1483412033650-1015ddeb83d1', // electric guitar
  'photo-1507838153414-b4b713384a76', // vinyl record close-up
  'photo-1516280440614-37939bbacd81', // dj mixing desk
  'photo-1485579149621-3123dd979885', // electric guitar player
  'photo-1454922915609-78549ad709bb', // vinyl records stack
  'photo-1501386761578-eac5c94b800a', // festival crowd
  'photo-1458560871784-56d23406c091', // turntable
  'photo-1471478331149-c72f17e33c73', // headphones flat-lay
  'photo-1429962714451-bb934ecdc4ec', // piano keys
  'photo-1462965326201-d02e4f455804', // concert silhouette
  'photo-1445985543470-41fba5c3144a', // recording studio mic
  'photo-1511735111819-9a3f7709049c', // acoustic guitar
  'photo-1574169208507-84376144848b', // dj headphones
  'photo-1456513080510-7bf3a84b82f8', // mixing console
  'photo-1452802447250-470a88ac82bc', // saxophone
  'photo-1419640303358-44f0d27f48e7', // band on stage
  'photo-1453738773917-9c3eff1db985', // singer live
  'photo-1525362081669-2b476bb628c3', // drum kit
  'photo-1487180144351-b8472da7d491', // headphones glow
  'photo-1496337589254-7e19d01cec44', // music studio
] as const;

/** Build a sized, cropped Unsplash URL for one of the music photo IDs. */
const url = (id: string, w: number, h: number) =>
  `https://images.unsplash.com/${id}?w=${w}&h=${h}&fit=crop&crop=entropy&q=80`;

/** Portrait posters (3:2 → 2:3) for the tilted onboarding collage. */
export const MUSIC_COLLAGE_POSTERS = MUSIC_PHOTO_IDS.map((id) => url(id, 300, 450));

/** Featured hero posters for the Welcome slides, keyed by slide intent. */
export const MUSIC_HERO = {
  new: url('photo-1459749411175-04bf5292ceea', 700, 1000), // new arrivals — stage lights
  library: url('photo-1454922915609-78549ad709bb', 700, 1000), // your library — vinyl stack
  playback: url('photo-1511671782779-c97d3d27a1d4', 700, 1000), // playback control — headphones
};

/** Profile-picker backdrop. */
export const MUSIC_PROFILE_HERO = url('photo-1493225457124-a3eb161ffa5f', 800, 1000);
