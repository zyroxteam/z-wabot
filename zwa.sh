#!/usr/bin/env bash
# ============================================================
#   ZYROX WHATSAPP BOT (zwa) — v1.0  🤖💬
#   Termux CLI launcher with neon dashboard
#   @author  ZYROX TEAM
#   @repo    https://github.com/zyroxteam/z-wabot
# ============================================================

# ---- Safe defaults (Termux compatibility) ----
: "${PREFIX:=/data/data/com.termux/files/usr}"
: "${USER:=$(whoami)}"
: "${HOME:=$(cd ~ && pwd)}"
: "${TERMUX_VERSION:=0.134}"
: "${TMPDIR:=/data/data/com.termux/files/usr/tmp}"
export LC_ALL=C.UTF-8
export LANG=C.UTF-8

set -euo pipefail

# ---- Config ----
ZWA_DIR="$HOME/z-wabot"
ZWA_AUTH="$ZWA_DIR/auth"
ZWA_LOG="$ZWA_DIR/bot.log"
ZWA_PID_FILE="$ZWA_DIR/bot.pid"
ZWA_NODE="$PREFIX/bin/node"
VERSION="1.0.0"

# ---- Colors (neon) ----
if [ -t 1 ] && command -v tput >/dev/null 2>&1 && [ "$(tput colors 2>/dev/null || echo 0)" -ge 8 ]; then
  RST='\033[0m'; BLD='\033[1m'; DIM='\033[2m'
  RED='\033[38;5;196m'; GRN='\033[38;5;46m'; YLW='\033[38;5;226m'
  CYN='\033[38;5;51m'; MAG='\033[38;5;201m'; BLU='\033[38;5;45m'
  WHT='\033[38;5;231m'
  B_RED='\033[48;5;88m'; B_GRN='\033[48;5;22m'; B_BLU='\033[48;5;17m'; B_MAG='\033[48;5;53m'
else
  RST=''; BLD=''; DIM=''; RED=''; GRN=''; YLW=''; CYN=''; MAG=''; BLU=''; WHT=''
  B_RED=''; B_GRN=''; B_BLU=''; B_MAG=''
fi

# ---- Helpers ----
banner() {
  clear
  echo -e "${CYN}${BLD}"
  echo "   ███████╗██╗   ██╗██╗    ██╗ █████╗     ██████╗  ██████╗ ████████╗"
  echo "   ╚══███╔╝╚██╗ ██╔╝██║    ██║██╔══██╗    ██╔══██╗██╔═══██╗╚══██╔══╝"
  echo "     ███╔╝  ╚████╔╝ ██║ █╗ ██║███████║    ██████╔╝██║   ██║   ██║   "
  echo "    ███╔╝    ╚██╔╝  ██║███╗██║██╔══██║    ██╔══██╗██║   ██║   ██║   "
  echo "   ███████╗   ██║   ╚███╔███╔╝██║  ██║    ██████╔╝╚██████╔╝   ██║   "
  echo "   ╚══════╝   ╚═╝    ╚══╝╚══╝ ╚═╝  ╚═╝    ╚═════╝  ╚═════╝    ╚═╝   "
  echo -e "${RST}"
  echo -e "${MAG}${BLD}   ⚡ ZYROX WHATSAPP BOT v${VERSION} — AI + Stickers + Groups + Media${RST}"
  echo -e "${DIM}   Powered by @whiskeysockets/baileys • Gemini AI  •  User: ${USER}${RST}"
  echo ""
}

neon_box() {
  local title="$1"; local color="$2"; shift 2
  local width=58
  echo -e "${color}${BLD}╔══════════════════════════════════════════════════════════╗${RST}"
  printf "${color}${BLD}║ ${BLD}%-56s ║\n${RST}" "$title"
  echo -e "${color}${BLD}╠══════════════════════════════════════════════════════════╣${RST}"
  for line in "$@"; do
    printf "${color}${BLD}║ ${RST}%-56s ${color}${BLD}║\n${RST}" "$line"
  done
  echo -e "${color}${BLD}╚══════════════════════════════════════════════════════════╝${RST}"
}

spinner() {
  local pid="$1"; local msg="$2"
  local spin='⣾⣽⣻⢿⡿⣟⣯⣷'
  local i=0
  while kill -0 "$pid" 2>/dev/null; do
    printf "\r${CYN} ${spin:i++%${#spin}:1} ${RST} %s" "$msg"
    sleep 0.08
  done
  printf "\r${GRN} ✔${RST} %s — done\n" "$msg"
}

is_running() {
  [ -f "$ZWA_PID_FILE" ] && kill -0 "$(cat "$ZWA_PID_FILE")" 2>/dev/null
}

stop_bot() {
  if is_running; then
    local pid
    pid=$(cat "$ZWA_PID_FILE")
    kill "$pid" 2>/dev/null
    sleep 1
    kill -9 "$pid" 2>/dev/null || true
    rm -f "$ZWA_PID_FILE"
    echo -e "${GRN} ✔ Bot stopped${RST}"
  else
    echo -e "${YLW} ⚠ Bot not running${RST}"
  fi
}

check_deps() {
  local missing=()
  command -v node >/dev/null 2>&1 || missing+=("nodejs")
  command -v npm >/dev/null 2>&1 || missing+=("npm")
  command -v ffmpeg >/dev/null 2>&1 || missing+=("ffmpeg")
  if [ ${#missing[@]} -gt 0 ]; then
    neon_box "⚠ DEPENDENCIES MISSING" "$YLW" \
      "Install: ${missing[*]}" \
      "Run: bash install.sh  (from repo folder)"
    return 1
  fi
  if [ ! -d "$ZWA_DIR/node_modules" ]; then
    neon_box "⚠ NODE MODULES MISSING" "$YLW" \
      "Run: cd $ZWA_DIR && npm install" \
      "Or:  bash install.sh"
    return 1
  fi
  return 0
}

show_logs() {
  if [ -f "$ZWA_LOG" ]; then
    tail -n "${1:-50}" "$ZWA_LOG"
  else
    echo "No log file yet — start bot first."
  fi
}

status_bot() {
  banner
  if is_running; then
    local pid mem cpu started
    pid=$(cat "$ZWA_PID_FILE")
    mem=$(ps -o rss= -p "$pid" 2>/dev/null | awk '{printf "%.1f MB", $1/1024}' || echo "?")
    started=$(ps -o lstart= -p "$pid" 2>/dev/null || echo "?")
    neon_box "🟢 BOT STATUS: RUNNING" "$GRN" \
      "PID      : $pid" \
      "Memory   : $mem" \
      "Started  : $started" \
      "Log      : $ZWA_LOG" \
      "Auth     : $ZWA_AUTH"
  else
    neon_box "⚫ BOT STATUS: STOPPED" "$RED" \
      "Bot is not running." \
      "Press [1] in menu to start."
  fi
  if [ -f "$ZWA_AUTH/creds.json" ] 2>/dev/null; then
    local name
    name=$(grep -o '"pushName":"[^"]*"' "$ZWA_AUTH/creds.json" 2>/dev/null | head -1 | cut -d'"' -f4 || echo "(see bot log)")
    echo -e "${GRN} 🔐 Logged in as: ${WHT}${BLD}${name}${RST}"
  else
    echo -e "${YLW} 🔓 Not logged in — QR code will appear on first start${RST}"
  fi
  echo ""
}

start_bot_fg() {
  cd "$ZWA_DIR"
  echo -e "${CYN}${BLD} ▶ Starting ZYROX WA Bot (foreground)...${RST}"
  echo -e "${DIM}   Press Ctrl+C to stop${RST}"
  echo ""
  exec node index.js
}

start_bot_bg() {
  if is_running; then
    echo -e "${YLW} ⚠ Bot already running (PID $(cat "$ZWA_PID_FILE"))${RST}"
    return
  fi
  cd "$ZWA_DIR"
  nohup node index.js > "$ZWA_LOG" 2>&1 &
  echo $! > "$ZWA_PID_FILE"
  sleep 2
  if is_running; then
    echo -e "${GRN} ✔ Bot started in background (PID $(cat "$ZWA_PID_FILE"))${RST}"
    echo -e "${DIM}   Logs: zwa logs   |   Stop: zwa stop${RST}"
  else
    echo -e "${RED} ✘ Failed to start — check $ZWA_LOG${RST}"
    tail -20 "$ZWA_LOG" 2>/dev/null
  fi
}

show_qr_hint() {
  neon_box "📱 HOW TO LOGIN" "$CYN" \
    "1. Open WhatsApp on your phone" \
    "2. Tap ⋮ (top right) → Linked Devices" \
    "3. Tap 'Link a device'" \
    "4. Scan the QR that appears in terminal" \
    "5. Wait 10 seconds — bot is yours!" \
    "" \
    "Tip: Run 'zwa start' to see QR in foreground."
}

show_menu() {
  echo -e "${BLD}${WHT}  ╔════════════════════════════════╗${RST}"
  echo -e "${BLD}${WHT}  ║   ${CYN}⚡ ZYROX WA BOT MENU${RST}${BLD}      ║${RST}"
  echo -e "${BLD}${WHT}  ╠════════════════════════════════╣${RST}"
  echo -e "${BLD}${WHT}  ║  ${GRN}[1]${RST}${WHT} Start bot (foreground)  ║${RST}"
  echo -e "${BLD}${WHT}  ║  ${GRN}[2]${RST}${WHT} Start bot (background)  ║${RST}"
  echo -e "${BLD}${WHT}  ║  ${RED}[3]${RST}${WHT} Stop bot                ║${RST}"
  echo -e "${BLD}${WHT}  ║  ${YLW}[4]${RST}${WHT} Status                  ║${RST}"
  echo -e "${BLD}${WHT}  ║  ${BLU}[5]${RST}${WHT} View live logs          ║${RST}"
  echo -e "${BLD}${WHT}  ║  ${MAG}[6]${RST}${WHT} How to login (QR)       ║${RST}"
  echo -e "${BLD}${WHT}  ║  ${CYN}[7]${RST}${WHT} Commands list           ║${RST}"
  echo -e "${BLD}${WHT}  ║  ${RED}[8]${RST}${WHT} Logout (unlink)         ║${RST}"
  echo -e "${BLD}${WHT}  ║  ${DIM}[0]${RST}${WHT} Exit                    ║${RST}"
  echo -e "${BLD}${WHT}  ╚════════════════════════════════╝${RST}"
  echo ""
}

show_commands() {
  neon_box "🤖 BOT COMMANDS (use in any chat)" "$MAG" \
    "/ai <text>     Ask AI (Gemini) — Hinglish support" \
    "/s  /sticker   Make sticker from image/video" \
    "/yt <url>      YouTube download (mp4/mp3)" \
    "/ig <url>      Instagram post/reel download" \
    "/tt <url>      TikTok download" \
    "/fb <url>      Facebook video download" \
    "/tr <lang>     Translate replyed message" \
    "/poll q|a|b    Create a poll" \
    "/tagall        Mention everyone (admin)" \
    "/kick @user    Kick user (admin)" \
    "/add <num>     Add member (admin)" \
    "/promote /demote   Admin controls" \
    "/antilink on   Group anti-link (admin)" \
    "/antispam on   Anti-spam protection (admin)" \
    "/badword on    Bad-word filter (admin)" \
    "/welcome <msg> Set welcome message (admin)" \
    "/mute /unmute  Group mute (admin)" \
    "/ping          Check bot is alive" \
    "/owner         Bot info / owner" \
    "/menu          This list" \
    "/save <name>   Save contact" \
    "/schedule HH:MM <msg>  Schedule message" \
    "/d  /delete    Delete bot message (reply)" \
    "/status        Recent status list" \
    "/qc <text>     Fake quote sticker" \
    "" \
    "💡 Tip: Just @mention the bot in a group & it replies via AI!"
}

do_logout() {
  if is_running; then
    echo -e "${RED} ⚠ Stop bot first (option 3)${RST}"
    return
  fi
  if [ -d "$ZWA_AUTH" ]; then
    echo -ne "${YLW} 🔓 Are you sure you want to logout? [y/N] ${RST}"
    read -r ans
    if [[ "$ans" =~ ^[Yy]$ ]]; then
      rm -rf "$ZWA_AUTH"
      mkdir -p "$ZWA_AUTH"
      echo -e "${GRN} ✔ Logged out. Start bot again to get new QR.${RST}"
    fi
  else
    echo -e "${YLW} ⚠ Not logged in${RST}"
  fi
}

# ---- Subcommands (for `zwa start` / `zwa stop` etc from shell) ----
if [ $# -gt 0 ]; then
  case "$1" in
    start|run|s)  start_bot_fg ;;
    bg|daemon)    start_bot_bg ;;
    stop|k)       stop_bot ;;
    restart)      stop_bot; sleep 1; start_bot_bg ;;
    status|st)    status_bot ;;
    logs|log|l)   show_logs "${2:-50}" ;;
    logs-follow|lf)
      if [ -f "$ZWA_LOG" ]; then tail -f "$ZWA_LOG"; else echo "No log"; fi ;;
    menu|m)
      banner; status_bot; show_menu ;;
    help|h|--help|-h)
      banner
      echo "Usage: zwa [command]"
      echo ""
      echo "  (no args)    Interactive neon menu"
      echo "  start/run    Start bot in foreground (shows QR)"
      echo "  bg           Start bot in background"
      echo "  stop         Stop the bot"
      echo "  restart      Restart background bot"
      echo "  status       Show running status"
      echo "  logs [N]     Show last N lines of log"
      echo "  logs-follow  Tail -f the log"
      echo "  menu         Show menu"
      echo "  help         Show this help"
      echo ""
      exit 0 ;;
    *)
      echo -e "${RED}Unknown command: $1${RST} — try 'zwa help'"
      exit 1 ;;
  esac
  exit 0
fi

# ---- Interactive menu loop ----
if ! check_deps; then
  echo -e "${YLW} ⚠ Dependencies missing — menu may not work fully${RST}"
  echo ""
fi

while true; do
  banner
  status_bot
  show_menu
  echo -ne "${CYN}${BLD} zwa » ${RST}"
  read -r choice
  case "$choice" in
    1) start_bot_fg ;;
    2) start_bot_bg; echo ""; read -rp "Press enter..." ;;
    3) stop_bot; echo ""; read -rp "Press enter..." ;;
    4) : ;;
    5)
      echo -e "${BLU} ── Live logs (last 40 lines) — Ctrl+C to return ──${RST}"
      show_logs 40
      echo ""; read -rp "Press enter..." ;;
    6) show_qr_hint; echo ""; read -rp "Press enter..." ;;
    7) show_commands; echo ""; read -rp "Press enter..." ;;
    8) do_logout; echo ""; read -rp "Press enter..." ;;
    0|q|quit|exit)
      echo -e "${MAG} 👋 Bye! ZYROX bot ready for next time.${RST}"
      exit 0 ;;
    *) echo -e "${RED}  Bad option${RST}"; sleep 1 ;;
  esac
done
