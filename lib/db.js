// ZYROX-WA — Simple JSON DB (groups, users, AI history, scheduled msgs)
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'db.json');

const defaultDB = {
  groups: {}, // jid@.g.us -> { antilink, antispam, badword, welcome, mute, tags:[], notes:{} }
  users: {},  // jid@s.whatsapp.net -> { name, warns, totalMsgs, aiHist:[], block }
  scheduled: [], // { jid, text, time, createdBy }
  stats: { startedAt: null, totalMsgs: 0, totalStickers: 0, totalAI: 0 },
  ownerNumber: null
};

let db = null;

function load() {
  try {
    if (fs.existsSync(DB_PATH)) {
      const raw = fs.readFileSync(DB_PATH, 'utf8');
      db = { ...defaultDB, ...JSON.parse(raw) };
    } else {
      db = JSON.parse(JSON.stringify(defaultDB));
      save();
    }
  } catch (e) {
    console.error('[DB] load failed, using default:', e.message);
    db = JSON.parse(JSON.stringify(defaultDB));
  }
  return db;
}

function save() {
  try {
    if (!db) return;
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
  } catch (e) {
    console.error('[DB] save failed:', e.message);
  }
}

function getGroup(jid) {
  if (!db.groups[jid]) {
    db.groups[jid] = {
      antilink: false,
      antispam: false,
      badword: false,
      welcome: null,
      mute: false,
      warns: {},
      banned: [],
      notes: {}
    };
  }
  return db.groups[jid];
}

function getUser(jid) {
  if (!db.users[jid]) {
    db.users[jid] = { name: null, warns: 0, totalMsgs: 0, aiHist: [], blocked: false };
  }
  return db.users[jid];
}

function pushAIHistory(userJid, role, text) {
  const u = getUser(userJid);
  u.aiHist.push({ role, text: (text || '').slice(0, 400) });
  const max = 10;
  if (u.aiHist.length > max) u.aiHist = u.aiHist.slice(u.aiHist.length - max);
}

function clearAIHistory(userJid) {
  const u = getUser(userJid);
  u.aiHist = [];
}

module.exports = { load, save, getGroup, getUser, pushAIHistory, clearAIHistory, db: () => db };
