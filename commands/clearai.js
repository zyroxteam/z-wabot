const name = ['clearai', 'clearhistory', 'newchat'];
async function run({ reply, clearAIHistory }) {
  clearAIHistory();
  reply('🧠 AI chat history clear! Nayi shuruat. ✨');
}
module.exports = { name, run };
