// /owner, /info, /about
const name = ['owner', 'info', 'about', 'botinfo'];
async function run({ reply, CONFIG }) {
  reply(`
🤖 *ZYROX WHATSAPP BOT* v1.0
🔐 Powered by @whiskeysockets/baileys
🧠 AI: Google Gemini 2.0 (Hinglish)
🎨 Sticker engine: ffmpeg
📺 Media: Cobalt (YT/IG/TT/FB/TW)
💻 Built for Termux (Android)

🛡️ ZYROX ECOSYSTEM:
• ZYROX Antivirus (zav)
• ZYROX Uptime Monitor
• ZYROX Bolo Bhai (AI chat)
• ZYROX WA Bot (yeh!)

🌟 GitHub: github.com/zyroxteam
🌐 Web: zyrox-antivirus.vercel.app
`.trim());
}
module.exports = { name, run };
