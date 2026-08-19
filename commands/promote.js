const name = ['promote', 'admin'];
async function run({ sock, from, reply, msg, isGroup, isAdminOf }) {
  if (!isGroup) return reply('⚠ Group command.');
  if (!(await isAdminOf())) return reply('🚫 Admin chahiye.');
  const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
  if (!mentioned.length) return reply('👤 @mention karo promote ke liye.');
  try {
    await sock.groupParticipantsUpdate(from, mentioned, 'promote');
    reply(`✅ Promoted: ${mentioned.map(m => '@' + m.split('@')[0]).join(', ')}`, { mentions: mentioned });
  } catch (e) { reply('⚠ Failed: ' + e.message); }
}
module.exports = { name, run };
