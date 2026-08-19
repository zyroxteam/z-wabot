const name = ['stats', 'stat', 'status'];
async function run({ reply }) {
  const db = require('../lib/db').db();
  const groups = Object.keys(db.groups).length;
  const users = Object.keys(db.users).length;
  const s = db.stats;
  const uptime = Math.floor((Date.now() - (s.startedAt || Date.now())) / 1000);
  const h = Math.floor(uptime / 3600);
  const m = Math.floor((uptime % 3600) / 60);
  const sec = uptime % 60;
  const mem = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1);
  reply(`
📊 *ZYROX Bot Stats*
⏱ Uptime: ${h}h ${m}m ${sec}s
👥 Groups: ${groups}
👤 Users seen: ${users}
💬 Total messages: ${s.totalMsgs}
🤖 AI replies: ${s.totalAI || 0}
🎨 Stickers: ${s.totalStickers || 0}
⚙ Commands run: ${s.commands || 0}
💾 RAM: ${mem} MB
`.trim());
}
module.exports = { name, run };
