/**
 * Reads an MP3's playback duration (seconds) WITHOUT downloading the whole file
 * or loading a native player. The catalog manifest carries no durations, so we
 * derive them from the audio itself: range-fetch the file header, skip any ID3v2
 * tag, parse the first MPEG audio frame, and use the Xing/Info VBR header (or a
 * CBR estimate from the file size) to compute the length.
 *
 * Results are cached per URL (as in-flight promises) so a list of rows resolves
 * each track at most once.
 */

const cache = new Map<string, Promise<number>>();

/** Returns the track duration in seconds, or 0 if it can't be determined. */
export function getAudioDuration(url: string): Promise<number> {
  if (!url) return Promise.resolve(0);
  let pending = cache.get(url);
  if (!pending) {
    pending = resolveDuration(url).catch(() => 0);
    cache.set(url, pending);
  }
  return pending;
}

interface RangeResult {
  bytes: Uint8Array;
  totalSize: number;
}

/** Range GET via XHR (reliable arraybuffer support in React Native). */
function fetchRange(url: string, start: number, end: number): Promise<RangeResult> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', url);
    xhr.responseType = 'arraybuffer';
    xhr.setRequestHeader('Range', `bytes=${start}-${end}`);
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const contentRange = xhr.getResponseHeader('Content-Range') || '';
        const match = contentRange.match(/\/(\d+)\s*$/);
        const totalSize = match ? parseInt(match[1], 10) : 0;
        resolve({ bytes: new Uint8Array(xhr.response as ArrayBuffer), totalSize });
      } else {
        reject(new Error(`HTTP ${xhr.status}`));
      }
    };
    xhr.onerror = () => reject(new Error('network error'));
    xhr.send();
  });
}

// MPEG Layer III bitrate tables (kbps), indexed by the 4-bit bitrate index.
const BITRATES_V1_L3 = [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 0];
const BITRATES_V2_L3 = [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160, 0];
// Sample-rate tables keyed by the 2-bit MPEG version field.
const SAMPLE_RATES: Record<number, number[]> = {
  3: [44100, 48000, 32000], // MPEG 1
  2: [22050, 24000, 16000], // MPEG 2
  0: [11025, 12000, 8000], // MPEG 2.5
};

async function resolveDuration(url: string): Promise<number> {
  // Read the first 10 bytes to detect an ID3v2 tag and learn the total file size.
  const head = await fetchRange(url, 0, 9);
  const h = head.bytes;
  const totalSize = head.totalSize;

  let frameStart = 0;
  if (h.length >= 10 && h[0] === 0x49 && h[1] === 0x44 && h[2] === 0x33) {
    // 'ID3' — size is a 28-bit synchsafe integer in bytes 6..9.
    const tagSize = ((h[6] & 0x7f) << 21) | ((h[7] & 0x7f) << 14) | ((h[8] & 0x7f) << 7) | (h[9] & 0x7f);
    const hasFooter = (h[5] & 0x10) !== 0;
    frameStart = 10 + tagSize + (hasFooter ? 10 : 0);
  }

  // Read a window covering the first audio frame header + any Xing/Info header.
  const region = await fetchRange(url, frameStart, frameStart + 1023);
  const f = region.bytes;

  // Locate the frame sync (11 set bits): 0xFF followed by 0xEx.
  let i = 0;
  while (i < f.length - 4 && !(f[i] === 0xff && (f[i + 1] & 0xe0) === 0xe0)) i += 1;
  if (i >= f.length - 4) return 0;

  const h1 = f[i + 1];
  const h2 = f[i + 2];
  const h3 = f[i + 3];
  const versionBits = (h1 >> 3) & 0x03; // 3=MPEG1, 2=MPEG2, 0=MPEG2.5
  const bitrateIndex = (h2 >> 4) & 0x0f;
  const sampleRateIndex = (h2 >> 2) & 0x03;
  const channelMode = (h3 >> 6) & 0x03; // 3=mono

  const isV1 = versionBits === 3;
  const sampleTable = SAMPLE_RATES[versionBits];
  const sampleRate = sampleTable ? sampleTable[sampleRateIndex] : 0;
  if (!sampleRate) return 0;
  const bitrate = (isV1 ? BITRATES_V1_L3 : BITRATES_V2_L3)[bitrateIndex]; // kbps
  const samplesPerFrame = isV1 ? 1152 : 576;

  // Xing/Info VBR header sits after the frame header + side-info block.
  const sideInfo = isV1 ? (channelMode === 3 ? 17 : 32) : channelMode === 3 ? 9 : 17;
  const xing = i + 4 + sideInfo;
  if (xing + 12 <= f.length) {
    const tag = String.fromCharCode(f[xing], f[xing + 1], f[xing + 2], f[xing + 3]);
    if (tag === 'Xing' || tag === 'Info') {
      const flags = (f[xing + 4] << 24) | (f[xing + 5] << 16) | (f[xing + 6] << 8) | f[xing + 7];
      if (flags & 0x0001) {
        const frames = (f[xing + 8] << 24) | (f[xing + 9] << 16) | (f[xing + 10] << 8) | f[xing + 11];
        if (frames > 0) return (frames * samplesPerFrame) / sampleRate;
      }
    }
  }

  // No VBR header → assume CBR: duration = audioBytes * 8 / bitrate.
  if (bitrate > 0 && totalSize > frameStart) {
    return ((totalSize - frameStart) * 8) / (bitrate * 1000);
  }
  return 0;
}
