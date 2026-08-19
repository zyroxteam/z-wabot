// ZYROX-WA — Media downloaders (YT/IG/TT/FB/Twitter + Sticker)
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const ffmpegPath = (() => {
  // Use system ffmpeg (installed via pkg install ffmpeg in Termux)
  return 'ffmpeg';
})();
const crypto = require('crypto');
const FormData = require('form-data');

const TEMP = path.join(__dirname, '..', 'temp');
if (!fs.existsSync(TEMP)) fs.mkdirSync(TEMP, { recursive: true });

function rand(prefix = '') {
  return prefix + crypto.randomBytes(8).toString('hex');
}

async function bufferFromUrl(url, opts = {}) {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Linux; Android 12; Pixel 6) AppleWebKit/537.36 Chrome/124 Mobile',
      ...(opts.headers || {})
    },
    timeout: opts.timeout || 60000
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.buffer();
}

// ─── Cobalt-based universal downloader (handles YT, TT, IG, FB, Twitter, etc.) ───
async function cobalt(url, opts = {}) {
  const instances = [
    'https://api.cobalt.tools',
    'https://co.wuk.sh',
    'https://cobalt-api.dreamhouserealty.xyz'
  ];
  for (const api of instances) {
    try {
      const res = await fetch(api + (api.includes('dreamhouserealty') ? '/api/json' : ''), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'User-Agent': 'Mozilla/5.0'
        },
        body: JSON.stringify({
          url,
          vQuality: opts.audioOnly ? '0' : '720',
          isAudioOnly: !!opts.audioOnly,
          filenamePattern: 'basic',
          disableMetadata: true,
          tiktokH265: false
        }),
        timeout: 25000
      });
      const j = await res.json().catch(() => ({}));
      if (res.ok && j.status === 'stream' && j.url) {
        return { url: j.url, type: opts.audioOnly ? 'audio' : 'video', filename: j.filename || null };
      }
      if (res.ok && j.status === 'redirect' && j.url) {
        return { url: j.url, type: opts.audioOnly ? 'audio' : 'video', filename: j.filename || null };
      }
      if (res.ok && j.status === 'picker' && Array.isArray(j.picker) && j.picker.length) {
        // Pick first media item
        const pick = j.picker[0];
        return {
          url: pick.url,
          type: pick.type === 'photo' ? 'image' : 'video',
          filename: null
        };
      }
    } catch (_) {
      // Try next instance
    }
  }
  throw new Error('Download failed (all APIs down or invalid URL)');
}

async function downloadYt(url, { audioOnly = false } = {}) {
  return cobalt(url, { audioOnly });
}
async function downloadIg(url) {
  // Cobalt supports IG reels/posts
  return cobalt(url);
}
async function downloadTiktok(url) {
  return cobalt(url);
}
async function downloadFb(url) {
  return cobalt(url);
}
async function downloadTwitter(url) {
  return cobalt(url);
}

// ─── Sticker maker (image/video -> WhatsApp webp, 512x512) ───
function makeSticker(inputBuffer, { type = 'image', author = 'ZYROX', pack = 'ZYROX Stickers' } = {}) {
  return new Promise(async (resolve, reject) => {
    const id = rand('stk_');
    const inPath = path.join(TEMP, id + (type === 'video' ? '.mp4' : '.jpg'));
    const outPath = path.join(TEMP, id + '.webp');
    fs.writeFileSync(inPath, inputBuffer);

    const args = [
      '-y', '-i', inPath,
      '-vf',
      type === 'video'
        ? "scale=512:512:force_original_aspect_ratio=decrease,fps=15,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=0x00000000,format=rgba,split[v0][v1];[v0]palettegen=reserve_transparent=on[p];[v1][p]paletteuse"
        : "scale=512:512:force_original_aspect_ratio=decrease,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=0x00000000,format=rgba",
      '-fs', '1M',
      '-loop', '0'
    ];
    if (type === 'video') {
      args.push('-t', '6'); // Cap at 6s
    }
    args.push('-compression_level', '6', '-q:v', '60', outPath);

    execFile(ffmpegPath, args, { timeout: 25000 }, (err) => {
      try { fs.unlinkSync(inPath); } catch (_) {}
      if (err) return reject(err);
      if (!fs.existsSync(outPath)) return reject(new Error('sticker output missing'));
      const buf = fs.readFileSync(outPath);
      try { fs.unlinkSync(outPath); } catch (_) {}
      resolve({ buffer: buf, isAnimated: type === 'video', pack, author });
    });
  });
}

// ─── MP3 extract for YT audio ───
function toMp3(inputBuffer) {
  return new Promise(async (resolve, reject) => {
    const id = rand('mp3_');
    const inPath = path.join(TEMP, id + '.tmp');
    const outPath = path.join(TEMP, id + '.mp3');
    fs.writeFileSync(inPath, inputBuffer);
    execFile(
      ffmpegPath,
      ['-y', '-i', inPath, '-vn', '-b:a', '128k', outPath],
      { timeout: 40000 },
      (err) => {
        try { fs.unlinkSync(inPath); } catch (_) {}
        if (err) return reject(err);
        if (!fs.existsSync(outPath)) return reject(new Error('mp3 output missing'));
        const buf = fs.readFileSync(outPath);
        try { fs.unlinkSync(outPath); } catch (_) {}
        resolve(buf);
      }
    );
  });
}

// ─── TTS via Google Translate (free) ───
async function tts(text, lang = 'hi') {
  const url =
    'https://translate.google.com/translate_tts?ie=UTF-8&q=' +
    encodeURIComponent(text.slice(0, 180)) +
    '&tl=' + lang + '&client=tw-ob';
  return bufferFromUrl(url);
}

module.exports = {
  downloadYt, downloadIg, downloadTiktok, downloadFb, downloadTwitter,
  makeSticker, toMp3, tts, bufferFromUrl, cobalt, TEMP, rand
};
