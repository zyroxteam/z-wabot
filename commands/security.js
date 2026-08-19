// /antilink, /antispam, /badword — on/off toggles
const name = ['antilink', 'antispam', 'badword'];
async function run({ reply, isGroup, isAdminOf, db, body, command, saveDB }) {
  if (!isGroup) return reply('⚠ Group command.');
  if (!(await isAdminOf())) return reply('🚫 Admin chahiye.');
  const g = db.getGroup();
  const val = body.trim().toLowerCase();
  if (val === 'on' || val === 'true' || val === '1') g[command] = true;
  else if (val === 'off' || val === 'false' || val === '0') g[command] = false;
  else return reply(`ℹ ${command} is currently *${g[command] ? 'ON 🟢' : 'OFF 🔴'}*\nUse: /${command} on|off`);
  saveDB();
  reply(`✅ ${command} = *${g[command] ? 'ON 🟢' : 'OFF 🔴'}*`);
}
module.exports = { name, run };
