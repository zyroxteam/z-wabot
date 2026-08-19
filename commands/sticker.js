// /sticker /s /stiker — image/video -> sticker
const name = ['sticker', 's', 'stiker', 'stic'];
const aliases = [];

async function run({ msg, reply, react, downloadMessage, sendSticker, media, participant }) {
  const m = msg.message;
  let targetMsg = msg;
  // If quoted, use quoted media
  const et = m?.extendedTextMessage;
  if (et?.contextInfo?.quotedMessage) {
    targetMsg = { key: msg.key, message: et.contextInfo.quotedMessage };
  }
  const types = ['imageMessage', 'videoMessage'];
  const kind = types.find(t => targetMsg.message[t]);
  if (!kind) return reply('📸 Send /s with an image/video *or reply to one*.');
  await react('✨');
  try {
    const dl = await downloadMessage(targetMsg);
    if (!dl) return reply('⚠ Could not download media.');
    const isVid = kind === 'videoMessage';
    const stk = await media.makeSticker(dl.buffer, {
      type: isVid ? 'video' : 'image',
      author: 'ZYROX',
      pack: 'ZYROX Stickers'
    });
    const db = require('../lib/db');
    db.db().stats.totalStickers++;
    db.save();
    await sendSticker(stk.buffer, { isAnimated: stk.isAnimated, author: stk.author, pack: stk.pack });
    react('✅');
  } catch (e) {
    react('❌');
    reply('⚠ Sticker banane mein error: ' + (e.message || e));
  }
}
module.exports = { name, aliases, run };
