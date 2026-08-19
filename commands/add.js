const name = ['add'];
async function run({ sock, from, reply, body, isGroup, isAdminOf }) {
  if (!isGroup) return reply('⚠ Group command.');
  if (!(await isAdminOf())) return reply('🚫 Admin chahiye.');
  let num = body.replace(/[^0-9]/g, '');
  if (!num) return reply('📱 Usage: /add 919876543210');
  if (!num.endsWith('@s.whatsapp.net')) num = num + '@s.whatsapp.net';
  try {
    const res = await sock.groupParticipantsUpdate(from, [num], 'add');
    reply(`✅ Add request sent to @${num.split('@')[0]}`, { mentions: [num] });
  } catch (e) {
    // Fallback: invite link
    try {
      const code = await sock.groupInviteCode(from);
      reply(`⚠ Direct add failed — link bhej do: https://chat.whatsapp.com/${code}`);
    } catch (_) {
      reply('⚠ Add failed: ' + e.message);
    }
  }
}
module.exports = { name, run };
