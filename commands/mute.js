const name = ['mute', 'silent'];
async function run({ reply, isGroup, isAdminOf, db, saveDB }) {
  if (!isGroup) return reply('⚠ Group command.');
  if (!(await isAdminOf())) return reply('🚫 Admin chahiye.');
  db.getGroup().mute = true;
  saveDB();
  reply('🔇 Group muted — sirf admin commands ka reply ayega. /unmute to undo.');
}
module.exports = { name, run };
