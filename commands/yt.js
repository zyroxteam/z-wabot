// /yt — YouTube video download
const name = ['yt', 'youtube', 'ytv', 'video'];
async function run({ reply, react, body, sendVideo, media }) {
  const url = body.trim();
  if (!url || !/^https?:\/\//.test(url)) return reply('📺 Usage: /yt <youtube-url>\nExample: /yt https://youtu.be/xxxx');
  await react('⏳');
  try {
    const r = await media.downloadYt(url, { audioOnly: false });
    const buf = await media.bufferFromUrl(r.url, { timeout: 120_000 });
    await react('📤');
    await sendVideo(buf, '🤖 ZYROX • YouTube video', { gifPlayback: false });
    react('✅');
  } catch (e) {
    react('❌');
    reply('⚠ Download failed: ' + (e.message || e) + '\n💡 Try shorter video (<3min) or check URL.');
  }
}
module.exports = { name, run };
