const name = ['delete', 'd', 'del'];
async function run({ sock, from, reply, msg, participant }) {
  const et = msg.message?.extendedTextMessage;
  const quotedId = et?.contextInfo?.stanzaId;
  const quotedParticipant = et?.contextInfo?.participant;
  if (!quotedId) return reply('♻ Bot ke kisi message pe reply karke /d likho.');
  const isMine = quotedParticipant && quotedParticipant.split(':')[0] === sock.user.id.split(':')[0];
  if (!isMine) return reply('⚠ Sirf bot ke message hi delete kar sakte.');
  try {
    await sock.sendMessage(from, {
      delete: { remoteJid: from, fromMe: true, id: quotedId, participant: quotedParticipant }
    });
  } catch (e) { reply('⚠ Delete fail: ' + e.message); }
}
module.exports = { name, run };
