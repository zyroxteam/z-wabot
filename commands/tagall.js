// /tagall — mention everyone in group (admin)
const name = ['tagall', 'everyone', 'hidetag'];
async function run({ sock, from, reply, body, isGroup, isAdminOf, react }) {
  if (!isGroup) return reply('⚠ Group command hi hai bhai.');
  if (!(await isAdminOf())) return reply('🚫 Admin hi tagall chala sakte.');
  await react('📢');
  const meta = await sock.groupMetadata(from);
  const parts = meta.participants.map(p => p.id);
  const msg = body.trim() || '📢 Sabko tag kiya hai!';
  // Hidden tag (no @name visible, but everyone notified)
  await sock.sendMessage(from, { text: msg, mentions: parts });
}
module.exports = { name, run };
