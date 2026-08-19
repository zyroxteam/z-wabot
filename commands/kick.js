const name = ['kick', 'remove', 'ban'];
async function run({ sock, from, reply, msg, isGroup, isAdminOf, participant }) {
  if (!isGroup) return reply('⚠ Group command.');
  if (!(await isAdminOf())) return reply('🚫 Admin chahiye.');
  const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
  if (!mentioned.length) return reply('👤 Kisko kick karna? @mention karo.');
  const me = sock.user.id.split(':')[0] + '@s.whatsapp.net';
  const targets = mentioned.filter(m => m !== me && m !== participant);
  if (!targets.length) return reply('⚠ Apne aap ya bot ko nahi kick kar sakte.');
  try {
    await sock.groupParticipantsUpdate(from, targets, 'remove');
    reply(`✅ Kicked: ${targets.map(t => '@' + t.split('@')[0]).join(', ')}`, { mentions: targets });
  } catch (e) { reply('⚠ Kick failed: ' + e.message); }
}
module.exports = { name, run };
