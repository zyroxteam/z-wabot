const name = ['link', 'grouplink', 'invite'];
async function run({ sock, from, reply, isGroup, isAdminOf }) {
  if (!isGroup) return reply('⚠ Group command.');
  if (!(await isAdminOf())) return reply('🚫 Admin chahiye.');
  try {
    const code = await sock.groupInviteCode(from);
    reply(`🔗 Group link:\nhttps://chat.whatsapp.com/${code}`);
  } catch (e) { reply('⚠ Link nikal nahi paya: ' + e.message); }
}
module.exports = { name, run };
