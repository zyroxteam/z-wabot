const name = ['welcome', 'setwelcome'];
async function run({ reply, isGroup, isAdminOf, db, body, saveDB }) {
  if (!isGroup) return reply('⚠ Group command.');
  if (!(await isAdminOf())) return reply('🚫 Admin chahiye.');
  const g = db.getGroup();
  if (!body.trim()) {
    g.welcome = null;
    saveDB();
    return reply('✅ Welcome message reset to default.');
  }
  g.welcome = body.trim();
  saveDB();
  reply('✅ Welcome set! Use @user as placeholder for new member tag.');
}
module.exports = { name, run };
