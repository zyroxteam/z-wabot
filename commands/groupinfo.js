const name = ['groupinfo', 'ginfo', 'infogroup'];
const fetch = require('node-fetch');
async function run({ sock, from, reply, isGroup, db, sendImage }) {
  if (!isGroup) return reply('⚠ Group command.');
  const meta = await sock.groupMetadata(from);
  const g = db.getGroup();
  const admins = meta.participants.filter(p => p.admin).length;
  const created = new Date(meta.creation * 1000).toLocaleDateString('en-IN');
  const txt = `
📊 *Group Info*
📝 Name: ${meta.subject}
👥 Members: ${meta.size}
👑 Admins: ${admins}
📅 Created: ${created}
🔒 Locked: ${meta.announce ? 'Yes' : 'No'}
🔗 Restrict: ${meta.restrict ? 'Yes' : 'No'}
📝 Desc: ${(meta.desc?.slice(0, 200) || 'none')}

🛡️ *ZYROX Protections*
🔗 AntiLink: ${g.antilink ? '🟢 ON' : '🔴 OFF'}
📢 AntiSpam: ${g.antispam ? '🟢 ON' : '🔴 OFF'}
🤬 BadWord: ${g.badword ? '🟢 ON' : '🔴 OFF'}
🔇 Mute: ${g.mute ? '🟢 ON' : '🔴 OFF'}
`.trim();
  try {
    const pp = await sock.profilePictureUrl(from, 'image');
    const buf = await (await fetch(pp)).buffer();
    await sendImage(buf, txt);
  } catch (_) {
    reply(txt);
  }
}
module.exports = { name, run };
