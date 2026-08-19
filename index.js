// ============================================================
//   ZYROX WHATSAPP BOT — v1.1 (fixed for Baileys 6.7.24)
//   Tested locally before push ✓
// ============================================================
const Baileys = require('@whiskeysockets/baileys');
const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  downloadMediaMessage,
  extractMessageContent,
  generateWAMessageFromContent,
  getContentType,
  isRealMessage,
  jidDecode,
  makeCacheableSignalKeyStore,
  proto,
} = Baileys;

// ---- Boom polyfill ----
let Boom;
try { Boom = require('@hapi/boom').Boom; } catch (_) {
  Boom = class Boom extends Error { constructor(e){super(e?.message||e);this.isBoom=true;this.output={statusCode:e?.output?.statusCode||0}}};
}

const P = require('pino');
const fs = require('fs');
const path = require('path');
const qrcode = require('qrcode-terminal');

// ---- Bootstrap ----
const CONFIG = JSON.parse(fs.readFileSync(path.join(__dirname, 'config.json'), 'utf8'));
const { load: loadDB, save: saveDB, getGroup, getUser, pushAIHistory, clearAIHistory, db } = require('./lib/db');
const gemini = require('./lib/gemini');
const media = require('./lib/media');
loadDB();
gemini.initKeys(CONFIG.gemini_keys || []);

const AUTH_DIR = path.resolve(__dirname, CONFIG.auth_dir || './auth');
const TEMP_DIR = path.resolve(__dirname, CONFIG.temp_dir || './temp');
[AUTH_DIR, TEMP_DIR].forEach(d => { if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true }); });

// ---- Logger (file only, so terminal is clean for our UI) ----
const logger = P({ level: 'error' }, P.destination('./bot.log'));

// ---- Command loader ----
const commands = new Map();
function loadCommands() {
  commands.clear();
  const cmdDir = path.join(__dirname, 'commands');
  for (const file of fs.readdirSync(cmdDir).filter(f => f.endsWith('.js'))) {
    delete require.cache[require.resolve(path.join(cmdDir, file))];
    const mod = require(path.join(cmdDir, file));
    const names = Array.isArray(mod.name) ? mod.name : [mod.name];
    for (const n of names) commands.set(String(n).toLowerCase(), mod);
    if (mod.aliases) for (const a of mod.aliases) commands.set(String(a).toLowerCase(), mod);
  }
  console.log(`[ZYROX] Loaded ${commands.size} commands`);
}
loadCommands();

// ---- Helpers ----
const cleanJid = (jid) => {
  if (!jid) return null;
  const [a, b] = jid.split('@');
  return a.split(':')[0] + '@' + (b || 's.whatsapp.net');
};
const isGroup = (jid) => !!jid && jid.endsWith('@g.us');
const ignoreJid = (jid) => !jid || jid === 'status@broadcast' || jid.includes('@newsletter') || jid.includes('@lid') || jid.includes('@broadcast');

const sendText = (jid, text, opts = {}) => sock.sendMessage(jid, { text: String(text).slice(0, 4000), ...opts });
const sendReact = (jid, key, emoji) => sock.sendMessage(jid, { react: { text: emoji, key } });
const sendImage = (jid, buf, caption = '', opts = {}) => sock.sendMessage(jid, { image: buf, caption, ...opts });
const sendVideo = (jid, buf, caption = '', opts = {}) => sock.sendMessage(jid, { video: buf, caption, ...opts });
const sendAudio = (jid, buf, ptt = false) => sock.sendMessage(jid, { audio: buf, mimetype: 'audio/mpeg', ptt });
const sendSticker = (jid, buf, opts = {}) => sock.sendMessage(jid, {
  sticker: buf, mimetype: 'image/webp',
  isAnimated: !!opts.isAnimated,
  stickerAuthor: opts.author || 'ZYROX',
  stickerName: opts.pack || 'ZYROX Stickers',
});

// Use the OFFICIAL downloadMediaMessage (replaces our manual downloadContentFromMessage logic)
async function downloadMedia(msg) {
  try {
    const buf = await downloadMediaMessage(
      msg,
      'buffer',
      {},
      { logger, reuploadRequest: sock.updateMediaMessage }
    );
    // Detect type from the message
    const content = extractMessageContent(msg.message);
    const mtype = content ? getContentType(content) : null;
    return { buffer: buf, type: mtype };
  } catch (e) {
    logger.error({ err: e }, 'downloadMedia fail');
    return null;
  }
}

function getMessageText(msg) {
  if (!msg || !msg.message) return '';
  const content = extractMessageContent(msg.message);
  if (!content) return '';
  return (
    content.conversation ||
    content.extendedTextMessage?.text ||
    content.imageMessage?.caption ||
    content.videoMessage?.caption ||
    content.documentMessage?.caption ||
    ''
  );
}

function getQuotedMessage(msg) {
  const content = extractMessageContent(msg.message);
  const et = content?.extendedTextMessage;
  if (!et?.contextInfo?.quotedMessage) return null;
  return {
    key: {
      remoteJid: msg.key.remoteJid,
      fromMe: false,
      id: et.contextInfo.stanzaId,
      participant: et.contextInfo.participant,
    },
    message: extractMessageContent(et.contextInfo.quotedMessage) || et.contextInfo.quotedMessage,
  };
}

function isAdmin(participants, jid) {
  const c = cleanJid(jid);
  const p = participants?.find(x => cleanJid(x.id) === c);
  return !!(p && (p.admin === 'admin' || p.admin === 'superadmin'));
}

// ============================================================
//   Connection
// ============================================================
let sock = null;

async function connect() {
  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
  let version;
  try { ({ version } = await fetchLatestBaileysVersion()); }
  catch (_) { version = [2, 3000, 1019430256]; }

  sock = makeWASocket({
    version,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore ? makeCacheableSignalKeyStore(state.keys, logger) : state.keys,
    },
    logger,
    printQRInTerminal: false, // deprecated — we print QR ourselves
    browser: ['ZYROX-BOT', 'Chrome', '1.0'],
    syncFullHistory: false,
    markOnlineOnConnect: true,
    generateHighQualityLinkPreview: false,
    // Returning `{ conversation: '' }` here is a known Baileys footgun — it makes
    // decryption/normalization of real incoming messages silently fail, so the bot
    // connects but never responds. Returning undefined is the correct behavior
    // when we don't have the message cached.
    getMessage: async (key) => undefined,
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;
    if (qr) {
      console.log('\n\x1b[36m╔══════════════════════════════════════════╗');
      console.log('║  📱  SCAN QR IN WHATSAPP                 ║');
      console.log('║  WhatsApp → Linked Devices → Link        ║');
      console.log('╚══════════════════════════════════════════╝\x1b[0m\n');
      qrcode.generate(qr, { small: true });
    }
    if (connection === 'open') {
      db().stats.startedAt = Date.now();
      saveDB();
      const name = sock.user?.name || sock.user?.id?.split(':')[0] || 'ZYROX-BOT';
      const id = sock.user?.id || '';
      console.log('\n\x1b[32m╔══════════════════════════════════════════╗');
      console.log('║  ✅  ZYROX BOT CONNECTED!                ║');
      console.log('║  Name: ' + String(name).padEnd(35).slice(0,35) + ' ║');
      console.log('║  ID  : ' + String(id).padEnd(35).slice(0,35) + ' ║');
      console.log('╠══════════════════════════════════════════╣');
      console.log('║  🧪  Test:  WhatsApp pe /ping bhejo       ║');
      console.log('╚══════════════════════════════════════════╝\x1b[0m\n');
    }
    if (connection === 'close') {
      const code = new Boom(lastDisconnect?.error).output?.statusCode;
      const loggedOut = code === DisconnectReason.loggedOut;
      if (loggedOut) {
        console.log('\x1b[31m❌ Logged out — auth folder reset. Restart to scan QR again.\x1b[0m');
        try { fs.rmSync(AUTH_DIR, { recursive: true, force: true }); fs.mkdirSync(AUTH_DIR); } catch(_){}
        process.exit(0);
      }
      console.log(`[conn] closed (code=${code}), reconnecting in 3s...`);
      setTimeout(connect, 3000);
    }
  });

  sock.ev.on('messages.upsert', async (m) => {
    for (const msg of m.messages || []) {
      try {
        if (!msg?.key) continue;
        if (ignoreJid(msg.key.remoteJid)) continue;
        // Messages without a decrypted `message` are stub/ciphertext/resend markers — skip.
        // (Previously these still hit isRealMessage which returned false, but in some
        // Baileys builds stubType = 0 so they'd fall through to our handler with no text.)
        if (!msg.message || msg.messageStubType) continue;
        if (msg.key.fromMe) continue;
        if (!isRealMessage(msg, msg.key.remoteJid)) continue;

        const from = cleanJid(msg.key.remoteJid);
        const participant = cleanJid(msg.key.participant || msg.key.remoteJid);
        const text = getMessageText(msg).trim();
        const isGrp = isGroup(from);

        // Terminal echo so user can SEE messages arriving
        const preview = (text || `[${getContentType(extractMessageContent(msg.message))||'media'}]`).slice(0, 70);
        console.log(`\x1b[36m[📩]\x1b[0m ${participant.split('@')[0]}${isGrp?' (group)':''}: ${preview}`);

        const user = getUser(participant);
        if (!user.name && msg.pushName) user.name = msg.pushName;
        user.totalMsgs++;
        db().stats.totalMsgs++;

        await handleMessage(msg, from, participant, text, isGrp, user);
        saveDB();
      } catch (e) {
        console.error('[msg error]', e);
        logger.error({ err: e }, 'messages.upsert');
      }
    }
  });

  sock.ev.on('group-participants.update', async (up) => {
    try {
      const g = getGroup(up.id);
      const meta = await sock.groupMetadata(up.id).catch(() => null);
      for (const jid of up.participants) {
        const tag = '@' + jid.split('@')[0];
        let text = null;
        if (up.action === 'add') text = g.welcome
          ? g.welcome.replace(/@user/g, tag)
          : `👋 Welcome ${tag} to *${meta?.subject || 'group'}*!\nType /menu to see ZYROX commands. 🤖`;
        if (up.action === 'remove') text = `👋 *${tag}* left/removed. Alvida! 💔`;
        if (text) sendText(up.id, text, { mentions: [jid] }).catch(()=>{});
      }
    } catch (e) { logger.error({ err: e }, 'group-participants'); }
  });

  setInterval(tickScheduled, 30_000);
}

// ============================================================
//   Message handling
// ============================================================
const spamMap = new Map();
const LINK_RE = /(https?:\/\/|www\.)[^\s]+|chat\.whatsapp\.com\//gi;
const BAD_WORDS = ['madarchod','bhenchod','mc','bc','chutiya','chutiye','lund','lauda','randi','gandu','gaand','bhosdika','bsdk','fuddu','harami','behen ke lode','maa ki chut'];

function isSpamming(jid) {
  const now = Date.now();
  const arr = (spamMap.get(jid) || []).filter(t => now - t < 5000);
  arr.push(now); spamMap.set(jid, arr);
  return arr.length > 6;
}

async function tickScheduled() {
  const now = Date.now();
  const due = db().scheduled.filter(s => s.time <= now);
  for (const s of due) {
    try { await sendText(s.jid, `⏰ *Reminder for @${s.createdBy.split('@')[0]}*\n\n${s.text}`, { mentions: [s.createdBy] }); }
    catch (e) { logger.error({ err: e }, 'sched'); }
  }
  if (due.length) { db().scheduled = db().scheduled.filter(s => s.time > now); saveDB(); }
}

async function handleMessage(msg, from, participant, text, isGrp, user) {
  const prefix = CONFIG.prefix || '/';
  const isCmd = text.startsWith(prefix);
  const parts = isCmd ? text.slice(prefix.length).split(/\s+/) : [];
  const cmd = (parts[0] || '').toLowerCase();
  const args = parts.slice(1);
  const body = args.join(' ');

  // ── Group filters ──────────────────────────────────────
  if (isGrp) {
    const g = getGroup(from);
    let violation = null;
    const metaP = sock.groupMetadata(from).catch(() => null);
    // anti-link
    if (g.antilink && LINK_RE.test(text)) {
      const meta = await metaP;
      if (!meta || !isAdmin(meta.participants, participant)) {
        violation = 'link';
        try { await sock.sendMessage(from, { delete: msg.key }); } catch(_){}
      }
    }
    // bad word
    if (!violation && g.badword) {
      const low = text.toLowerCase();
      if (BAD_WORDS.some(w => low.includes(w))) {
        const meta = await metaP;
        if (!meta || !isAdmin(meta.participants, participant)) {
          violation = 'badword';
          try { await sock.sendMessage(from, { delete: msg.key }); } catch(_){}
        }
      }
    }
    // anti-spam
    if (!violation && g.antispam && isSpamming(participant)) {
      violation = 'spam';
      try { await sock.sendMessage(from, { delete: msg.key }); } catch(_){}
    }
    // mute
    if (!violation && g.mute && isCmd) {
      const meta = await metaP;
      if (!meta || !isAdmin(meta.participants, participant)) return;
    }
    if (violation) {
      user.warns = (user.warns || 0) + 1;
      if (user.warns >= 3) {
        try {
          await sock.groupParticipantsUpdate(from, [participant], 'remove');
          await sendText(from, `🚨 @${participant.split('@')[0]} removed (${violation} x${user.warns})`, { mentions: [participant] });
          user.warns = 0;
        } catch (_) {
          await sendText(from, `⚠ @${participant.split('@')[0]} stop ${violation}! (warn ${user.warns}/3 — no kick perms)`, { mentions: [participant] });
        }
      } else {
        await sendText(from, `⚠ @${participant.split('@')[0]} ${violation} dekh ke bhai! Warn ${user.warns}/3`, { mentions: [participant] });
      }
      return;
    }
  }

  // ── Command routing ────────────────────────────────────
  if (isCmd && commands.has(cmd)) {
    try {
      db().stats.commands = (db().stats.commands || 0) + 1;
      await commands.get(cmd).run({
        sock, msg, from, participant, body, args,
        isGroup: isGrp, prefix, command: cmd, rawText: text,
        sendText: (t, o) => sendText(from, t, o),
        reply: (t) => sendText(from, t, { quoted: msg }),
        sendImage: (b, c, o) => sendImage(from, b, c, { quoted: msg, ...o }),
        sendVideo: (b, c, o) => sendVideo(from, b, c, { quoted: msg, ...o }),
        sendAudio: (b, p) => sendAudio(from, b, p),
        sendSticker: (b, o) => sendSticker(from, b, o),
        react: (e) => sendReact(from, msg.key, e),
        quoted: getQuotedMessage(msg),
        downloadMessage: downloadMedia,
        isAdminOf: async (gid = from, who = participant) => {
          const meta = await sock.groupMetadata(gid).catch(()=>null);
          return meta ? isAdmin(meta.participants, who) : false;
        },
        isOwner: () => {
          const me = sock.user.id.split(':')[0];
          return participant === (CONFIG.owner_number + '@s.whatsapp.net') || participant.split('@')[0] === me;
        },
        db: { getGroup: () => getGroup(from), getUser: () => getUser(participant) },
        CONFIG, media, gemini,
        pushAIHistory: (r, t) => pushAIHistory(participant, r, t),
        clearAIHistory: () => clearAIHistory(participant),
        saveDB,
      });
    } catch (e) {
      logger.error({ err: e, cmd }, 'command error');
      sendText(from, `⚠ Command error: ${e.message || e}`).catch(()=>{});
    }
    return;
  }

  // ── Auto-AI ────────────────────────────────────────────
  const content = extractMessageContent(msg.message);
  const mentioned = content?.extendedTextMessage?.contextInfo?.mentionedJid || [];
  const botMentioned = mentioned.some(m => m.split(':')[0] === sock.user.id.split(':')[0] + '@s.whatsapp.net' || m.split('@')[0] === sock.user.id.split(':')[0]);

  const shouldAI =
    (isGrp && botMentioned && CONFIG.auto_ai_groups !== false) ||
    (!isGrp && CONFIG.auto_ai_pm && text && !isCmd);

  if (shouldAI && text.length > 1) {
    const prompt = botMentioned ? text.replace(/@\d+/g, '').trim() : text;
    if (!prompt) return;
    sendReact(from, msg.key, '🤖').catch(()=>{});
    try {
      const aiReply = await gemini.ask(prompt, { system: CONFIG.ai_prompt, history: getUser(participant).aiHist });
      pushAIHistory(participant, 'user', prompt);
      pushAIHistory(participant, 'model', aiReply);
      await sendText(from, aiReply, { quoted: msg });
      db().stats.totalAI++;
    } catch (e) {
      logger.error({ err: e }, 'ai');
      const fb = await gemini.askFallback(prompt);
      await sendText(from, fb, { quoted: msg });
    }
  }
}

// ---- Start ----
connect().catch(e => { console.error('FATAL:', e); process.exit(1); });
process.on('uncaughtException', (e) => { console.error('[uncaught]', e); logger.error({ err: e }, 'uncaught'); });
process.on('unhandledRejection', (e) => { console.error('[unhandled]', e); logger.error({ err: e }, 'unhandled'); });
