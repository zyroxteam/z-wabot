// /ai, /gpt — talk to Gemini
const name = ['ai', 'gpt', 'zyrox', 'bot'];
async function run({ reply, body, react, participant, gemini, CONFIG, pushAIHistory, quoted, msg, downloadMessage }) {
  let prompt = body.trim();
  // If no text but replying to an image/text, use that
  if (!prompt && quoted) {
    const qm = quoted.message;
    if (qm?.conversation) prompt = qm.conversation;
    else if (qm?.extendedTextMessage?.text) prompt = qm.extendedTextMessage.text;
    else if (qm?.imageMessage?.caption) prompt = qm.imageMessage.caption;
    if (!prompt) prompt = 'Describe this image in Hinglish short.';
  }
  if (!prompt) return reply('📝 Usage: /ai <your question>\nExample: /ai time kya hua hai mumbai mein?');
  await react('🤖');
  try {
    const history = (require('../lib/db').db().users[participant]?.aiHist) || [];
    const ans = await gemini.ask(prompt, { system: CONFIG.ai_prompt, history });
    pushAIHistory('user', prompt);
    pushAIHistory('model', ans);
    return reply(ans);
  } catch (e) {
    const fb = await gemini.askFallback(prompt);
    return reply(fb);
  }
}
module.exports = { name, run };
