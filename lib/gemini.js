// ZYROX-WA — Gemini AI module (multi-key rotation)
const fetch = require('node-fetch');

const API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';
// Fallback model if first one has issues
const API_FALLBACK = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

let currentKeyIdx = 0;

// Real rotating keys (will be populated from config + built-in)
let KEYS = [];

function initKeys(extraKeys = []) {
  KEYS = [...new Set([...(extraKeys || []), ...builtInKeys()].filter(Boolean))];
  if (!KEYS.length) {
    // Last-resort dummy so it doesn't crash (will fail gracefully in ask())
    KEYS = ['DUMMY_KEY_NO_KEYS_CONFIGURED'];
  }
}

function builtInKeys() {
  // Community free-tier fallback keys (replace with user's for production)
  return [
    // Attempt with placeholder; ask() will handle 400 gracefully
  ];
}

async function ask(prompt, opts = {}) {
  if (!KEYS.length) initKeys();
  const history = opts.history || [];
  const system = opts.system || 'You are ZYROX, a friendly Hinglish AI bot for WhatsApp.';
  let lastErr = null;
  const models = [API_BASE, API_FALLBACK];

  for (let model of models) {
    for (let attempt = 0; attempt < KEYS.length; attempt++) {
      const key = KEYS[currentKeyIdx % KEYS.length];
      currentKeyIdx++;
      try {
        const contents = [
          ...history.map(h => ({
            role: h.role === 'user' ? 'user' : 'model',
            parts: [{ text: h.text }]
          })),
          { role: 'user', parts: [{ text: prompt }] }
        ];
        const body = {
          contents,
          systemInstruction: { parts: [{ text: system }] },
          generationConfig: {
            temperature: 0.85,
            maxOutputTokens: 600,
            topP: 0.95
          }
        };
        const url = `${model}?key=${encodeURIComponent(key)}`;
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          timeout: 25000
        });
        const json = await res.json();
        if (!res.ok || json.error) {
          const msg = (json.error && json.error.message) || res.statusText;
          if (res.status === 429 || res.status === 403) {
            lastErr = new Error(`key ratelimit: ${msg}`);
            continue; // try next key
          }
          lastErr = new Error(`gemini ${res.status}: ${msg}`);
          continue;
        }
        const text =
          json?.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('').trim() || '';
        if (!text) throw new Error('empty response');
        return text;
      } catch (e) {
        lastErr = e;
        // Network / key error -> try next key
        continue;
      }
    }
  }
  throw lastErr || new Error('All Gemini keys/models failed');
}

// Simple "free AI" fallback if Gemini fails — uses a public text-generation API
async function askFallback(prompt) {
  try {
    const res = await fetch('https://text.pollinations.ai/' + encodeURIComponent(prompt), {
      timeout: 20000
    });
    if (res.ok) {
      const txt = await res.text();
      return txt.trim().slice(0, 800);
    }
  } catch (_) {}
  return '⚠ AI abhi thoda busy hai bhai, thodi der baad try kar! 💫';
}

module.exports = { ask, askFallback, initKeys };
