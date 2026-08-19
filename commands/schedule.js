const name = ['schedule', 'remind', 'reminder'];
async function run({ reply, body, from, participant, db, saveDB }) {
  // Format: HH:MM <text>  or  5m <text> (minutes later)
  const m = body.trim().match(/^(\d{1,2}):(\d{2})\s+(.+)$/);
  const rel = body.trim().match(/^(\d+)(m|h|s)\s+(.+)$/);
  let when;
  let msg;
  if (m) {
    const hh = parseInt(m[1]);
    const mm = parseInt(m[2]);
    msg = m[3];
    if (hh > 23 || mm > 59) return reply('⚠ Time invalid (0-23 : 0-59)');
    const d = new Date();
    d.setHours(hh, mm, 0, 0);
    if (d.getTime() < Date.now()) d.setDate(d.getDate() + 1);
    when = d.getTime();
  } else if (rel) {
    const n = parseInt(rel[1]);
    const unit = rel[2];
    msg = rel[3];
    const mul = unit === 'h' ? 3600_000 : unit === 'm' ? 60_000 : 1000;
    when = Date.now() + n * mul;
  } else {
    return reply('⏰ Usage:\n/schedule 22:30 Pani pi lo\n/schedule 10m Check phone\n/schedule 1h Neend se uth');
  }
  db().scheduled.push({ jid: from, text: msg, time: when, createdBy: participant });
  saveDB();
  reply(`⏰ Reminder set for *${new Date(when).toLocaleString('en-IN')}* — will tag you. ✅`);
}
module.exports = { name, run };
