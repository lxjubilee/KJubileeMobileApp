// Local persona portraits keyed by Artist.id (manifest slug). Only the Jubilee
// Inspire family has hand-made portraits; every other artist falls back to the
// CDN cover. React Native require() needs string literals, so this map is
// explicit rather than generated. Root-level assets/ is bundled (see BrandLogo).
const PERSONA_IMAGES: Record<string, number> = {
  'amir-inspire': require('../../assets/Jubilee-Persona/Jubilee-Amir.png'),
  'caleb-inspire': require('../../assets/Jubilee-Persona/Jubilee-Caleb.png'),
  'eliana-inspire': require('../../assets/Jubilee-Persona/Jubilee-Eliana.png'),
  'elias-inspire': require('../../assets/Jubilee-Persona/Jubilee-Elias.png'),
  'imani-inspire': require('../../assets/Jubilee-Persona/Jubilee-Imani.png'),
  'jubilee-inspire': require('../../assets/Jubilee-Persona/Jubilee-Inspire.png'),
  'melody-inspire': require('../../assets/Jubilee-Persona/Jubilee-Melody.png'),
  'nova-inspire': require('../../assets/Jubilee-Persona/Jubilee-Nova.png'),
  'santiago-inspire': require('../../assets/Jubilee-Persona/Jubilee-Santiago.png'),
  'tahoma-inspire': require('../../assets/Jubilee-Persona/Jubilee-Tahoma.png'),
  'zariah-inspire': require('../../assets/Jubilee-Persona/Jubilee-Zariah.png'),
  'zev-inspire': require('../../assets/Jubilee-Persona/Jubilee-Zev.png'),
};

/** Local persona portrait for an artist id, or undefined to fall back to CDN. */
export function personaImage(artistId?: string | null): number | undefined {
  return artistId ? PERSONA_IMAGES[artistId] : undefined;
}
