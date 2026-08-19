const name = ['tr', 'translate', 'lang'];
const fetch = require('node-fetch');
async function run({ reply, body, quoted, msg }) {
  const lang = (body.trim().split(/\s+/)[0] || 'en').toLowerCase();
  let text = body.trim().split(/\s+/).slice(1).join(' ');
  if (!text && quoted) {
    const qm = quoted.message;
    text = qm?.conversation || qm?.extendedTextMessage?.text || qm?.imageMessage?.caption || qm?.videoMessage?.caption || '';
  }
  if (!text) return reply('🌐 Usage:\n/tr hi How are you?\n/tr en (reply to a message)');
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${lang}&dt=t&q=${encodeURIComponent(text)}`;
    const r = await fetch(url);
    const j = await r.json();
    const out = (j[0] || []).map(x => x[0]).join('');
    const src = j[2] || '?';
    reply(`🌐 *${src} → ${lang}*\n\n${out}`);
  } catch (e) { reply('⚠ Translate fail: ' + e.message); }
}
module.exports = { name, run };
