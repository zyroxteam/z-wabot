// /menu, /help, /commands
const name = ['menu', 'help', 'commands', 'h'];
async function run({ reply, CONFIG }) {
  const p = CONFIG.prefix;
  const txt = `
╔══════════════════════════════╗
║   🤖 *ZYROX WHATSAPP BOT*    ║
╚══════════════════════════════╝

💬 *AI & Chat*
${p}ai <text>       Talk to AI (Gemini, Hinglish)
${p}tts <text>      Text-to-speech (hindi)
${p}tts-en <text>   English TTS
${p}gpt <text>      (same as /ai)

🎨 *Stickers & Media*
${p}sticker / ${p}s  Make sticker (reply to img/video)
${p}qc <text>       Fake quote sticker
${p}attp <text>     Text sticker (animated)
${p}yt <url>        YouTube download (video)
${p}yta <url>       YouTube audio (mp3)
${p}ig <url>        Instagram reel/post
${p}tt <url>        TikTok video
${p}fb <url>        Facebook video
${p}tw <url>        Twitter/X video

👥 *Group Tools (Admin)*
${p}tagall          Mention everyone
${p}kick @user      Kick member
${p}add <number>    Add member
${p}promote / demote Admin rank
${p}antilink on/off
${p}antispam on/off
${p}badword on/off
${p}welcome <msg>   Welcome msg (@user = placeholder)
${p}mute / unmute
${p}groupinfo
${p}link            Group invite link

🛠️ *Utility*
${p}ping            Bot latency
${p}owner           Bot owner info
${p}alive           Health check
${p}tr <lang>       Translate replied msg
${p}poll q|a|b|c    Poll
${p}schedule HH:MM <text>   Schedule reminder
${p}calc <expr>     Calculator
${p}weather <city>
${p}shorten <url>
${p}qr <text>       Generate QR code
${p}delete / ${p}d  Delete bot msg (reply to it)
${p}stats           Bot stats
${p}clearai         Clear your AI chat history

💡 *Tip*: In groups just @mention the bot to talk to AI!
`.trim();
  return reply(txt);
}
module.exports = { name, run };
