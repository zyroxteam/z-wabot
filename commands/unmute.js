const name = ['unmute'];
async function run({ reply, isGroup, isAdminOf, db, saveDB }) {
  if (!isGroup) return reply('⚠ Group command.');
  if (!(await isAdminOf())) return reply('🚫 Admin chahiye.');
  db.getGroup().mute = false;
  saveDB();
  reply('🔊 Group unmuted — sab commands chala sakte ho.');
}
module.exports = { name, run };
