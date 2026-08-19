async function run({ reply, react, body, sendVideo, media }) {
  const url = body.trim();
  if (!url || !/^https?:\/\//.test(url)) return reply('🎵 Usage: /tt <tiktok-url>');
  await react('⏳');
  try {
    const r = await media.downloadTiktok(url);
    const buf = await media.bufferFromUrl(r.url, { timeout: 120_000 });
    await react('📤');
    await sendVideo(buf, '🤖 ZYROX • TikTok');
    react('✅');
  } catch (e) { react('❌'); reply('⚠ Fail: ' + e.message); }
}
module.exports = { name: ['tt', 'tiktok', 'tik'], run };
