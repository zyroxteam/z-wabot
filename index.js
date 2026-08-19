// ============================================================
//   ZYROX WHATSAPP BOT — v1.0
//   Main entry: Baileys connection, message routing, commands
// ============================================================
process.env.NO_COLOR = '0';
const Baileys = require('@whiskeysockets/baileys');
const {
  default: makeWASocket,
  useMultiFileAuthState,
  Browsers,
  DisconnectReason,
  fetchLatestBaileysVersion,
  downloadContentFromMessage,
  generateWAMessageFromContent,
  proto
} = Baileys;
const makeCacheableSignalKeyStore = Baileys.makeCacheableSignalKeyStore || null;
const jidDecode = Baileys.jidDecode || (() => null);

// Fallback in-memory store (new Baileys removed it; provide stub)
let makeInMemoryStore = Baileys.makeInMemoryStore;
if (!makeInMemoryStore) {
  try { makeInMemoryStore = require('baileys-store')?.makeInMemoryStore; } catch (_) {}
}
if (!makeInMemoryStore) {
  makeInMemoryStore = function () { return { bind: () => {}, loadMessages: () => ({}), fetchGroupMetadata: () => null }; };
}
const { Boom } = (() => {
  try { return require('@hapi/boom'); } catch (_) { return { Boom: class Boom extends Error { constructor(e){super(e);this.output={statusCode:e?.output?.statusCode||0}}; isBoom=true } }; }
})();
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

// ---- Ensure dirs ----
const AUTH_DIR = path.resolve(__dirname, CONFIG.auth_dir || './auth');
const TEMP_DIR = path.resolve(__dirname, CONFIG.temp_dir || './temp');
[AUTH_DIR, TEMP_DIR].forEach(d => { if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true }); });

// ---- Logger ----
const logger = P({ level: process.argv.includes('--dev') ? 'debug' : 'warn' }, P.destination('./bot.log'));

// ---- In-memory store (optional — new Baileys removed it, so stub on failure) ----
let store = null;
try {
  const baileys = require('@whiskeysockets/baileys');
  if (baileys.makeInMemoryStore) {
    store = baileys.makeInMemoryStore({ logger: logger.child({ store: true }) });
  }
} catch (_) {
  store = { bind: () => {} };
}
if (!store) store = { bind: () => {} };

// ---- Load commands dynamically ----
const commands = new Map();
function loadCommands() {
  commands.clear();
  const cmdDir = path.join(__dirname, 'commands');
  for (const file of fs.readdirSync(cmdDir).filter(f => f.endsWith('.js'))) {
    const name = path.basename(file, '.js');
    // Clear require cache so reload works
    delete require.cache[require.resolve(path.join(cmdDir, file))];
    const mod = require(path.join(cmdDir, file));
    const names = Array.isArray(mod.name) ? mod.name : [mod.name];
    for (const n of names) commands.set(n.toLowerCase(), mod);
    if (mod.aliases) {
      for (const a of mod.aliases) commands.set(a.toLowerCase(), mod);
    }
  }
  console.log(`[ZYROX] Loaded ${commands.size} command handlers`);
}
loadCommands();

// ---- Helpers ----
function cleanJid(jid) {
  if (!jid) return null;
  return jid.split('@')[0] + '@' + (jid.includes('@g.us') ? 'g.us' : 's.whatsapp.net');
}
function isGroup(jid) { return jid && jid.endsWith('@g.us'); }
function isMe(sock, jid) { return jid && jid.startsWith(sock.user.id.split(':')[0] + '@'); }

function sendText(jid, text, opts = {}) {
  return sock.sendMessage(jid, { text: String(text).slice(0, 4000), ...opts });
}
function sendReact(jid, key, emoji) {
  return sock.sendMessage(jid, { react: { text: emoji, key } });
}
async function sendImage(jid, buf, caption = '', opts = {}) {
  return sock.sendMessage(jid, { image: buf, caption, ...opts });
}
async function sendVideo(jid, buf, caption = '', opts = {}) {
  return sock.sendMessage(jid, { video: buf, caption, ...opts });
}
async function sendAudio(jid, buf, ptt = false) {
  return sock.sendMessage(jid, { audio: buf, mimetype: 'audio/mpeg', ptt });
}
async function sendSticker(jid, buf, opts = {}) {
  return sock.sendMessage(jid, {
    sticker: buf,
    mimetype: 'image/webp',
    isAnimated: opts.isAnimated || false,
    stickerAuthor: opts.author || 'ZYROX',
    stickerName: opts.pack || 'ZYROX Stickers'
  });
}

async function downloadMessage(msg, type = null) {
  // msg is the proto message (with message.imageMessage etc.)
  let mtype = type || Object.keys(msg.message || {}).find(k => k.endsWith('Message'));
  if (!mtype) return null;
  const content = msg.message[mtype];
  if (!content) return null;
  const stream = await downloadContentFromMessage(content, mtype.replace('Message', ''));
  let buf = Buffer.alloc(0);
  for await (const chunk of stream) buf = Buffer.concat([buf, chunk]);
  return { buffer: buf, type: mtype };
}

function extractText(msg) {
  if (!msg?.message) return '';
  return (
    msg.message.conversation ||
    msg.message.extendedTextMessage?.text ||
    msg.message.imageMessage?.caption ||
    msg.message.videoMessage?.caption ||
    msg.message.documentMessage?.caption ||
    ''
  );
}

function quotedMessage(msg) {
  const et = msg.message?.extendedTextMessage;
  if (!et?.contextInfo?.quotedMessage) return null;
  return {
    key: {
      remoteJid: msg.key.remoteJid,
      fromMe: false,
      id: et.contextInfo.stanzaId,
      participant: et.contextInfo.participant
    },
    message: et.contextInfo.quotedMessage
  };
}

function isAdmin(participants, jid) {
  const p = participants?.find(x => cleanJid(x.id) === cleanJid(jid));
  return p && (p.admin === 'admin' || p.admin === 'superadmin');
}

// ---- Auto-delete timeout util ----
function replyAndDelete(jid, text, delayMs = 6000) {
  sendText(jid, text).then(sent => {
    setTimeout(() => {
      try { sock.sendMessage(jid, { delete: sent.key }); } catch (_) {}
    }, delayMs).unref();
  });
}

// ============================================================
//   Connection start
// ============================================================
let sock = null;
let qrShown = false;

async function connect() {
  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
  let version;
  try {
    ({ version } = await fetchLatestBaileysVersion());
  } catch (e) {
    // Fallback version if fetch fails (no network / version mismatch)
    logger.warn({ err: e.message }, 'version fetch failed — using fallback');
    version = [2, 3000, 1017551350];
  }

sock = makeWASocket({
  version,
  auth: {
    creds: state.state.creds,
    keys: makeCacheableSignalKeyStore
      ? makeCacheableSignalKeyStore(state.state.keys, logger)
      : state.state.keys,
  },
  logger,
  printQRInTerminal: true,
  // Browser identity — plain array works in all Baileys versions
  browser: Browsers && typeof Browsers.app === 'function' ? Browsers.app('ZYROX-BOT', 'desktop') : ['ZYROX-BOT', 'Desktop', '1.0'],
  syncFullHistory: false,
  markOnlineOnConnect: true,
  generateHighQualityLinkPreview: false
});

if (store && typeof store.bind === 'function') store.bind(sock.ev);

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;
    if (qr) {
      qrShown = true;
      console.log('\n╔══════════════════════════════════════════╗');
      console.log('║   📱 SCAN THIS QR IN WHATSAPP            ║');
      console.log('║   WhatsApp → Linked Devices → Link       ║');
      console.log('╚══════════════════════════════════════════╝\n');
      qrcode.generate(qr, { small: true });
    }
    if (connection === 'open') {
      qrShown = false;
      db().stats.startedAt = Date.now();
      saveDB();
      console.log('\n╔══════════════════════════════════════════╗');
      console.log('║  ✅ ZYROX WA BOT CONNECTED!              ║');
      console.log('║  Bot: ' + sock.user.name || sock.user.id.split(':')[0] + ' @ ' + sock.user.id);
      console.log('╚══════════════════════════════════════════╝\n');
    }
    if (connection === 'close') {
      const reason = new Boom(lastDisconnect?.error)?.output?.statusCode;
      const loggedOut = reason === DisconnectReason.loggedOut;
      if (loggedOut) {
        console.log('❌ Logged out — delete auth folder and restart to re-pair.');
        try { fs.rmSync(AUTH_DIR, { recursive: true, force: true }); fs.mkdirSync(AUTH_DIR); } catch (_) {}
        process.exit(0);
      }
      const restartReasons = [
        DisconnectReason.restartRequired,
        DisconnectReason.connectionReplaced,
        DisconnectReason.timedOut,
        DisconnectReason.connectionClosed,
        DisconnectReason.connectionLost
      ];
      const shouldReconnect = !lastDisconnect?.error?.isBoom || restartReasons.includes(reason);
      console.log(`[conn] closed (reason=${reason}), reconnecting=${shouldReconnect}`);
      if (shouldReconnect) {
        setTimeout(connect, 3000);
      } else {
        process.exit(1);
      }
    }
  });

  sock.ev.on('messages.upsert', async (m) => {
    for (const msg of m.messages || []) {
      if (!msg.key || msg.key.fromMe) continue;
      if (msg.status === 'PENDING') continue;
      try {
        await handleMessage(msg);
      } catch (e) {
        logger.error({ err: e }, 'handleMessage error');
      }
    }
  });

  // Group participants update (welcome/kick)
  sock.ev.on('group-participants.update', async (up) => {
    try {
      const g = getGroup(up.id);
      const meta = await sock.groupMetadata(up.id).catch(() => null);
      for (const jid of up.participants) {
        const tag = '@' + jid.split('@')[0];
        let text = null;
        if (up.action === 'add' && g.welcome) {
          text = g.welcome.replace(/@user/g, tag);
        } else if (up.action === 'add') {
          text = `👋 Welcome ${tag} to *${meta?.subject || 'group'}*!\nType /menu to see what ZYROX can do. 🤖`;
        }
        if (up.action === 'remove') {
          text = `👋 *${tag}* left/removed. Alvida! 💔`;
        }
        if (text) {
          sendText(up.id, text, { mentions: [jid] }).catch(() => {});
        }
      }
    } catch (e) {
      logger.error({ err: e }, 'group-participants error');
    }
  });

  // Scheduled messages tick
  setInterval(tickScheduled, 30_000);
}

// ============================================================
//   Message handler
// ============================================================
const spamMap = new Map(); // jid -> [timestamps]
const LINK_RE = /(https?:\/\/|www\.)[^\s]+|chat\.whatsapp\.com\//gi;
const BAD_WORDS = [
  'madarchod','bhenchod','bc','mc','chod','chutiya','chutiye','lund','lauda','randi',
  'gandu','gaand','bhosdika','bsdk','fuddu','harami','teri maa','behen ke lode'
];

function isSpamming(jid) {
  const now = Date.now();
  const arr = spamMap.get(jid) || [];
  const fresh = arr.filter(t => now - t < 5000); // 5 sec window
  fresh.push(now);
  spamMap.set(jid, fresh);
  return fresh.length > 6; // >6 msgs in 5s = spam
}

async function tickScheduled() {
  const now = Date.now();
  const due = db().scheduled.filter(s => s.time <= now);
  for (const s of due) {
    try { await sendText(s.jid, `⏰ *Reminder for @${s.createdBy.split('@')[0]}*\n\n${s.text}`, { mentions: [s.createdBy] }); }
    catch (e) { logger.error({ err: e }, 'sched fail'); }
  }
  if (due.length) {
    db().scheduled = db().scheduled.filter(s => s.time > now);
    saveDB();
  }
}

async function handleMessage(msg) {
  const from = cleanJid(msg.key.remoteJid);
  if (!from) return;
  const participant = cleanJid(msg.key.participant || msg.key.remoteJid);
  const text = extractText(msg).trim();
  const isGrp = isGroup(from);
  const user = getUser(participant);
  if (user.name === null && msg.pushName) {
    user.name = msg.pushName;
  }
  user.totalMsgs++;
  db().stats.totalMsgs++;

  const prefix = CONFIG.prefix || '/';
  const isCmd = text.startsWith(prefix);
  const [cmdRaw, ...argsArr] = text.slice(prefix.length).split(/\s+/);
  const cmd = cmdRaw?.toLowerCase();
  const body = isCmd ? argsArr.join(' ') : text;

  // ── Group security filters ──────────────────────────────
  if (isGrp) {
    const g = getGroup(from);
    let violation = null;
    // Anti-link
    if (g.antilink && LINK_RE.test(text) && !msg.key.fromMe) {
      try {
        const meta = await sock.groupMetadata(from);
        if (!isAdmin(meta.participants, participant)) {
          violation = 'link';
          try { await sock.sendMessage(from, { delete: msg.key }); } catch (_) {}
        }
      } catch (_) {}
    }
    // Bad word
    if (!violation && g.badword) {
      const low = text.toLowerCase();
      if (BAD_WORDS.some(w => low.includes(w))) {
        const meta = await sock.groupMetadata(from).catch(() => null);
        if (!meta || !isAdmin(meta.participants, participant)) {
          violation = 'badword';
          try { await sock.sendMessage(from, { delete: msg.key }); } catch (_) {}
        }
      }
    }
    // Anti-spam
    if (!violation && g.antispam && isSpamming(participant)) {
      violation = 'spam';
      try { await sock.sendMessage(from, { delete: msg.key }); } catch (_) {}
    }
    // Mute (only bot replies to admins)
    if (!violation && g.mute && isCmd) {
      const meta = await sock.groupMetadata(from).catch(() => null);
      if (!meta || !isAdmin(meta.participants, participant)) return;
    }
    if (violation) {
      user.warns = (user.warns || 0) + 1;
      const warnCount = user.warns;
      if (warnCount >= 3) {
        try {
          await sock.groupParticipantsUpdate(from, [participant], 'remove');
          sendText(from, `🚨 @${participant.split('@')[0]} removed (${violation} x${warnCount})`, { mentions: [participant] });
          user.warns = 0;
        } catch (_) {
          sendText(from, `⚠ @${participant.split('@')[0]} stop ${violation}! (warn ${warnCount}/3 — no kick perms)`, { mentions: [participant] });
        }
      } else {
        sendText(from, `⚠ @${participant.split('@')[0]} ${violation} dekh ke bhai! Warn ${warnCount}/3`, { mentions: [participant] });
      }
      saveDB();
      return;
    }
  }

  // ── Command routing ─────────────────────────────────────
  if (isCmd && commands.has(cmd)) {
    const handler = commands.get(cmd);
    try {
      db().stats.commands = (db().stats.commands || 0) + 1;
      await handler.run({
        sock, msg, from, participant, body, args: argsArr,
        isGroup: isGrp, prefix, command: cmd, rawText: text,
        sendText: (t, o) => sendText(from, t, o),
        reply: (t) => sendText(from, t, { quoted: msg }),
        sendImage: (b, c, o) => sendImage(from, b, c, { quoted: msg, ...o }),
        sendVideo: (b, c, o) => sendVideo(from, b, c, { quoted: msg, ...o }),
        sendAudio: (b, p) => sendAudio(from, b, p),
        sendSticker: (b, o) => sendSticker(from, b, o),
        react: (e) => sendReact(from, msg.key, e),
        quoted: quotedMessage(msg),
        downloadMessage,
        isAdminOf: async (gid = from, who = participant) => {
          const meta = await sock.groupMetadata(gid).catch(() => null);
          return meta ? isAdmin(meta.participants, who) : false;
        },
        isOwner: () => {
          const me = sock.user.id.split(':')[0];
          return participant === (CONFIG.owner_number + '@s.whatsapp.net') ||
                 participant.split('@')[0] === me;
        },
        db: { getGroup: () => getGroup(from), getUser: () => getUser(participant) },
        CONFIG, media, gemini, pushAIHistory: (r, t) => pushAIHistory(participant, r, t),
        clearAIHistory: () => clearAIHistory(participant),
        saveDB
      });
      saveDB();
    } catch (e) {
      logger.error({ err: e, cmd }, 'command error');
      sendText(from, `⚠ Command error: ${e.message || e}`).catch(() => {});
    }
    return;
  }

  // ── Auto-AI: @mention bot in group or PM auto-reply ────
  const botMentioned =
    (msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [])
      .some(m => m.split(':')[0] === sock.user.id.split(':')[0]);

  const shouldAI =
    (isGrp && botMentioned && CONFIG.auto_ai_groups !== false) ||
    (!isGrp && CONFIG.auto_ai_pm && text && !text.startsWith(prefix));

  if (shouldAI && text.length > 1 && !isCmd) {
    const prompt = botMentioned ? text.replace(/@\d+/g, '').trim() : text;
    if (!prompt) return;
    sendReact(from, msg.key, '🤖');
    try {
      const aiReply = await gemini.ask(prompt, {
        system: CONFIG.ai_prompt,
        history: getUser(participant).aiHist
      });
      pushAIHistory(participant, 'user', prompt);
      pushAIHistory(participant, 'model', aiReply);
      await sendText(from, aiReply, { quoted: msg });
      db().stats.totalAI++;
      saveDB();
    } catch (e) {
      logger.error({ err: e }, 'ai error');
      const fb = await gemini.askFallback(prompt);
      await sendText(from, fb, { quoted: msg });
    }
  }
}

// ── Start ──
connect().catch(e => {
  console.error('FATAL:', e);
  process.exit(1);
});

// Keep alive
process.on('uncaughtException', (e) => logger.error({ err: e }, 'uncaught'));
process.on('unhandledRejection', (e) => logger.error({ err: e }, 'unhandled'));
