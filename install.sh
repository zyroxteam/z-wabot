#!/data/data/com.termux/files/usr/bin/bash
# ============================================================
#   ZYROX WHATSAPP BOT — Installer for Termux
#   Usage: bash <(curl -sL https://z-wabot.vercel.app/install.sh)
# ============================================================
set -e

# ---- Safe defaults (before set -u, just in case) ----
: "${PREFIX:=/data/data/com.termux/files/usr}"
: "${USER:=$(whoami)}"
: "${HOME:=$(cd ~ && pwd)}"
export LC_ALL=C.UTF-8 LANG=C.UTF-8

# ---- Colors ----
R='\033[1;31m'
G='\033[1;32m'
Y='\033[1;33m'
C='\033[1;36m'
M='\033[1;35m'
W='\033[1;37m'
D='\033[2;37m'
N='\033[0m'

banner() {
  clear
  echo -e "$M"
  echo "   ███████╗██╗   ██╗██╗    ██╗ █████╗     ██╗    ██╗ █████╗"
  echo "   ╚══███╔╝╚██╗ ██╔╝██║    ██║██╔══██╗    ██║    ██║██╔══██╗"
  echo "     ███╔╝  ╚████╔╝ ██║ █╗ ██║███████║    ██║ █╗ ██║███████║"
  echo "    ███╔╝    ╚██╔╝  ██║███╗██║██╔══██║    ██║███╗██║██╔══██║"
  echo "   ███████╗   ██║   ╚███╔███╔╝██║  ██║    ╚███╔███╔╝██║  ██║"
  echo "   ╚══════╝   ╚═╝    ╚══╝╚══╝ ╚═╝  ╚═╝     ╚══╝╚══╝ ╚═╝  ╚═╝"
  echo -e "$N"
  echo -e "$C  🤖 WhatsApp Bot — AI, Stickers, Groups, Media$N"
  echo -e "$D  Installer for Termux (Android)$N"
  echo ""
}

sp() { echo -e "$G  ✔$N $1"; }
info() { echo -e "$C  ➜$N $1"; }
warn() { echo -e "$Y  ⚠$N $1"; }
err() { echo -e "$R  ✖$N $1"; }

banner

# Check Termux
if [ ! -d "$PREFIX" ] || ! command -v pkg >/dev/null 2>&1; then
  err "Yeh script sirf Termux pe chalta hai (Android)."
  exit 1
fi

# Storage check
if ! df -h "$HOME" | awk 'NR==2 {exit !($4+0 < 1)}'; then
  :
fi

INSTALL_DIR="$HOME/z-wabot"
info "Install dir: $W$INSTALL_DIR$N"

# Step 1: Update and install system deps
info "Updating Termux packages..."
pkg update -y -qq >/dev/null 2>&1 || true
pkg upgrade -y -qq >/dev/null 2>&1 || true

info "Installing Node.js, git, ffmpeg, python..."
for pkg in nodejs git ffmpeg python openssl; do
  if ! command -v $pkg >/dev/null 2>&1; then
    echo -e "$D      installing $pkg...$N"
    pkg install -y $pkg >/dev/null 2>&1 || true
  fi
done
# Verify
for c in node git ffmpeg npm; do
  if ! command -v $c >/dev/null 2>&1; then
    err "$c install nahi hua. Manual karo: pkg install $c"
    exit 1
  fi
done
sp "System packages ready"
echo ""
node -v
npm -v
ffmpeg -version 2>/dev/null | head -1
echo ""

# Step 2: Clone or update repo
if [ -d "$INSTALL_DIR/.git" ]; then
  info "Existing installation found — pulling latest..."
  cd "$INSTALL_DIR"
  git pull --ff-only || warn "Git pull failed, continuing with existing files."
else
  info "Cloning ZYROX-WA BOT from GitHub..."
  cd "$HOME"
  git clone https://github.com/zyroxteam/z-wabot.git z-wabot
  cd "$INSTALL_DIR"
fi
sp "Source ready"

# Step 3: Install npm deps
info "Installing Node modules (2-5 min lagenge, please wait)..."
npm install --no-audit --no-fund --loglevel=error
sp "NPM modules installed"

# Step 4: Link zwa command
info "Setting up 'zwa' command..."
BIN_DIR="$PREFIX/bin"
mkdir -p "$BIN_DIR"
cat > "$BIN_DIR/zwa" <<EOF
#!/data/data/com.termux/files/usr/bin/bash
exec bash "$INSTALL_DIR/zwa.sh" "\$@"
EOF
chmod +x "$BIN_DIR/zwa"
chmod +x "$INSTALL_DIR/zwa.sh"
sp "'zwa' command available globally"

# Step 5: Storage permission (optional, for sending files)
info "Requesting Termux storage access (if needed)..."
termux-setup-storage >/dev/null 2>&1 || true

# Done!
echo ""
echo -e "$M╔══════════════════════════════════════════════╗$N"
echo -e "$M║  ${W}✅ ZYROX WA BOT INSTALLED SUCCESSFULLY!$M         ║$N"
echo -e "$M╚══════════════════════════════════════════════╝$N"
echo ""
echo -e "$C  ▶ Start karo:$N  ${G}zwa$N"
echo -e "$D      (1 dabana Start Bot ke liye, QR scan karna WhatsApp se)$N"
echo ""
echo -e "$C  ▶ Direct start (no menu):$N  ${G}zwa start$N"
echo -e "$C  ▶ Background run:$N  ${G}zwa bg$N"
echo -e "$C  ▶ Stop:$N  ${G}zwa stop$N"
echo -e "$C  ▶ Logs:$N  ${G}zwa logs$N"
echo ""
echo -e "$Y  ⚠ First time QR dikhega — WhatsApp -> Linked Devices -> Link$N"
echo -e "$D  Bot ka data auth/ folder mein save hoga; baar-baar QR nahi scan karna padta.$N"
echo ""
echo -e "$M  🛡 ZYROX TEAM • github.com/zyroxteam$N"
echo ""
read -rp "  Abhi start karu? (Y/n) " ans
if [[ -z "$ans" || "$ans" =~ ^[Yy] ]]; then
  exec zwa start
fi
