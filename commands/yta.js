// /yta — YouTube audio/mp3
const name = ['yta', 'ytmp3', 'song', 'audio', 'mp3'];
async function run({ reply, react, body, sendAudio, media }) {
  const url = body.trim();
  if (!url || !/^https?:\/\//.test(url)) return reply('🎵 Usage: /yta <youtube-url>\nExample: /yta https://youtu.be/xxxx');
  await react('⏳');
  try {
    const r = await media.downloadYt(url, { audioOnly: true });
    let buf = await media.bufferFromUrl(r.url, { timeout: 120_000 });
    // Convert to proper mp3
    try { buf = await media.toMp3(buf); } catch (_) {}
    await react('📤');
    await sendAudio(buf, false);
    react('✅');
  } catch (e) {
    react('❌');
    reply('⚠ Download failed: ' + (e.message || e));
  }
}
module.exports = { name, run };
