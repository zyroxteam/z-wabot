const fetch = require('node-fetch');
const name = ['shorten', 'short', 'tinyurl'];
async function run({ reply, body }) {
  const url = body.trim();
  if (!/^https?:\/\//.test(url)) return reply('🔗 Usage: /shorten https://example.com/long-url');
  try {
    const r = await fetch('https://tinyurl.com/api-create.php?url=' + encodeURIComponent(url));
    const txt = await r.text();
    reply(`🔗 Short URL:\n${txt}`);
  } catch (e) { reply('⚠ Shorten fail: ' + e.message); }
}
module.exports = { name, run };
