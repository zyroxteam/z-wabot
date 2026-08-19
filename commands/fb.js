async function run({ reply, react, body, sendVideo, media }) {
  const url = body.trim();
  if (!url || !/^https?:\/\//.test(url)) return reply('📘 Usage: /fb <facebook-url>');
  await react('⏳');
  try {
    const r = await media.downloadFb(url);
    const buf = await media.bufferFromUrl(r.url, { timeout: 120_000 });
    await react('📤');
    await sendVideo(buf, '🤖 ZYROX • Facebook');
    react('✅');
  } catch (e) { react('❌'); reply('⚠ Fail: ' + e.message); }
}
module.exports = { name: ['fb', 'facebook'], run };
