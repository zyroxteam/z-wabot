async function run({ reply, react, body, sendVideo, sendImage, media }) {
  const url = body.trim();
  if (!url || !/^https?:\/\//.test(url)) return reply('🐦 Usage: /tw <twitter-url>');
  await react('⏳');
  try {
    const r = await media.downloadTwitter(url);
    const buf = await media.bufferFromUrl(r.url, { timeout: 120_000 });
    await react('📤');
    if (r.type === 'image') await sendImage(buf, '🤖 ZYROX • X/Twitter');
    else await sendVideo(buf, '🤖 ZYROX • X/Twitter');
    react('✅');
  } catch (e) { react('❌'); reply('⚠ Fail: ' + e.message); }
}
module.exports = { name: ['tw', 'twitter', 'x'], run };
