# 🤖 ZYROX WHATSAPP BOT v1.0

> **Termux ke liye full-power WhatsApp bot** — Gemini AI, stickers, group security, media downloader — sab kuch.

![ZYROX](https://img.shields.io/badge/ZYROX-WA_BOT-ff00ff?style=for-the-badge) ![Termux](https://img.shields.io/badge/Platform-Termux-green?style=for-the-badge) ![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)

## 🌐 Website
👉 **https://z-wabot.vercel.app**

## 🚀 One-Command Install (Termux)
```bash
bash <(curl -sL https://z-wabot.vercel.app/install.sh)
```

## 📦 Manual Install
```bash
pkg update && pkg upgrade -y
pkg install nodejs git ffmpeg python -y
git clone https://github.com/zyroxteam/z-wabot
cd z-wabot
npm install
chmod +x zwa.sh
bash zwa.sh
```

## 🎯 Features

### 💬 AI Chat
- **Gemini AI** (Google) se baat karo — Hinglish mein
- Group mein @mention karo to AI auto-reply
- `/ai <sawal>` command
- Chat history memory
- Free fallback API agar Gemini down ho

### 🎨 Sticker Studio
- Image → Sticker (`/s`)
- Video → Animated sticker
- Text quote sticker (`/qc`)
- 512x512 auto-resize, transparency

### 📺 Media Downloader
- YouTube video (`/yt <url>`)
- YouTube to MP3 (`/yta <url>`)
- Instagram reels/posts (`/ig <url>`)
- TikTok videos (`/tt <url>`)
- Facebook videos (`/fb <url>`)
- Twitter/X videos (`/tw <url>`)
- Sab Cobalt API se — fast + HD

### 👥 Group Management
- `/tagall` — everyone mention
- `/kick @user`, `/add`, `/promote`, `/demote`
- `/antilink on/off` — automatic link delete + warn
- `/antispam on/off` — spam detector
- `/badword on/off` — gaali filter
- `/welcome <msg>` — custom welcome
- `/mute` / `/unmute`
- `/poll Question|A|B|C` — create polls
- `/groupinfo` — group stats
- Warn system: 3 warns = kick

### 🛠️ Utility
- `/tts <text>` — Hindi/English text-to-speech
- `/tr <lang>` — translate
- `/qr <text>` — QR generate
- `/weather <city>` — mausam
- `/calc <expr>` — calculator
- `/schedule HH:MM <msg>` — reminders
- `/shorten <url>` — tinyurl
- `/stats` — bot statistics
- `/clearai` — new AI chat
- `/delete` — delete bot message (reply to it)
- `/ping` — latency

## 🕹️ Commands
Bot chala ke `/menu` type karo — poora list dikh jayega.

## ⚙️ Configuration
`config.json` edit karke:
- `prefix` — command prefix (default `/`)
- `owner_number` — apna number daalo (91xxxxxxxxx)
- `gemini_keys` — apni Gemini API keys daalo (optional — built-in se chalta hai)
- `ai_prompt` — AI ka personality badlo
- `auto_ai_pm` — private messages mein auto-reply chahiye to true karo

## 🔒 Privacy
- Sab data phone pe hi rehta hai (`auth/` folder mein login)
- Koi cloud server nahi — apna phone hi apna server
- Uninstall karna ho to `rm -rf ~/z-wabot` bas

## 📝 Note
- Yeh bot sirf educational aur personal use ke liye hai.
- WhatsApp ke terms of use follow karo. Spam mat karna.
- Baar-baar login/logout na karo, warna WhatsApp temporarily ban kar sakta hai.

## 🛡️ ZYROX Ecosystem
- **ZYROX Antivirus** — https://zyrox-antivirus.vercel.app
- **ZYROX Uptime** — https://zyrox-uptime.vercel.app
- **ZYROX Bolo Bhai** — https://zyrox-bolo.vercel.app

---
Made with 💜 by **ZYROX TEAM**
