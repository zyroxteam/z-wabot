const name = ['qc', 'quote', 'quotemaker'];
const fetch = require('node-fetch');
async function run({ reply, sendSticker, body, msg, media }) {
  let text = body.trim();
  const author = msg.pushName || 'ZYROX';
  if (!text) return reply('💬 Usage: /qc <quote text>');
  try {
    const seed = (msg.key.participant || '').split('@')[0] || 'zyrox';
    const url = 'https://qc.btz.lol/generate?text=' + encodeURIComponent(text.slice(0, 250)) +
                '&name=' + encodeURIComponent(author) +
                '&avatar=https://i.pravatar.cc/150?u=' + encodeURIComponent(seed);
    const r = await fetch(url, { timeout: 15000 });
    if (!r.ok) throw new Error('qc api ' + r.status);
    const buf = await r.buffer();
    const stk = await media.makeSticker(buf, { type: 'image', author: 'ZYROX Quotes', pack: 'ZYROX' });
    await sendSticker(stk.buffer, { isAnimated: false });
  } catch (e) {
    reply('⚠ QC sticker bana nahi paya: ' + e.message);
  }
}
module.exports = { name, run };
