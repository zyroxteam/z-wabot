const name = ['poll', 'vote'];
async function run({ sock, from, reply, body, isGroup }) {
  if (!isGroup) return reply('⚠ Groups mein hi poll chalta hai.');
  const parts = body.split('|').map(s => s.trim()).filter(Boolean);
  if (parts.length < 3) return reply('📊 Usage: /poll Question|Option1|Option2|Option3');
  const q = parts[0];
  const opts = parts.slice(1).map(o => ({ optionName: o }));
  try {
    await sock.sendMessage(from, { poll: { name: q, values: opts, selectableCount: 1 } });
  } catch (e) { reply('⚠ Poll fail: ' + e.message); }
}
module.exports = { name, run };
