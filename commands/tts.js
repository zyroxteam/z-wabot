const name = ['tts', 'speak', 'bol'];
async function run({ reply, body, sendAudio, media, args }) {
  let lang = 'hi';
  let text = body.trim();
  if (args[0] && /^[a-z]{2}(-[A-Z]{2})?$/.test(args[0]) && args.length > 1) {
    lang = args[0]; text = args.slice(1).join(' ');
  }
  if (!text) return reply('🔊 Usage: /tts Namaste doston');
  try {
    // split long text
    const chunks = text.match(/.{1,170}(?:\s|$)/g) || [text];
    for (const c of chunks.slice(0, 3)) {
      const buf = await media.tts(c.trim(), lang);
      await sendAudio(buf, true);
    }
  } catch (e) { reply('⚠ TTS fail: ' + e.message); }
}
module.exports = { name, run };
