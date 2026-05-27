#!/usr/bin/env bash
# =============================================================================
#  setup-wsl.sh — One-time setup for Notes App CI/CD on WSL (Ubuntu)
#  Run this ONCE inside WSL terminal: bash scripts/setup-wsl.sh
# =============================================================================

set -euo pipefail

# ── Colors ────────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; CYAN='\033[0;36m'; NC='\033[0m'

log_info()    { echo -e "${BLUE}[INFO]${NC}  $*"; }
log_success() { echo -e "${GREEN}[OK]${NC}    $*"; }
log_warn()    { echo -e "${YELLOW}[WARN]${NC}  $*"; }
log_error()   { echo -e "${RED}[ERROR]${NC} $*"; }
log_step()    { echo -e "\n${CYAN}══ $* ══${NC}"; }

# ── Check running in WSL ──────────────────────────────────────────────────────
if ! grep -qi microsoft /proc/version 2>/dev/null; then
    log_warn "This script is designed for WSL. Continuing anyway..."
fi

echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║   Notes App CI/CD — WSL Setup Script                    ║"
echo "║   This sets up your complete DevOps environment         ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""

# ── Step 1: Update system ──────────────────────────────────────────────────────
log_step "Step 1: Updating system packages"
sudo apt-get update -qq
sudo apt-get upgrade -y -qq
log_success "System updated"

# ── Step 2: Install essential tools ───────────────────────────────────────────
log_step "Step 2: Installing essential tools"
sudo apt-get install -y -qq \
    curl wget git build-essential ca-certificates \
    gnupg lsb-release software-properties-common \
    python3 python3-pip jq unzip net-tools
log_success "Essential tools installed"

# ── Step 3: Install Node.js (LTS via nvm) ─────────────────────────────────────
log_step "Step 3: Installing Node.js 20 LTS"
if command -v node &>/dev/null; then
    log_info "Node.js already installed: $(node --version)"
else
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - -qq
    sudo apt-get install -y -qq nodejs
    log_success "Node.js installed: $(node --version)"
fi
log_info "npm version: $(npm --version)"

# ── Step 4: Install Docker ─────────────────────────────────────────────────────
log_step "Step 4: Setting up Docker"
if command -v docker &>/dev/null; then
    log_info "Docker already installed: $(docker --version)"
else
    log_info "Installing Docker..."
    # Remove old versions
    sudo apt-get remove -y docker docker-engine docker.io containerd runc 2>/dev/null || true

    # Install Docker Engine
    sudo install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | \
        sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    sudo chmod a+r /etc/apt/keyrings/docker.gpg

    echo \
        "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
        https://download.docker.com/linux/ubuntu \
        $(lsb_release -cs) stable" | \
        sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

    sudo apt-get update -qq
    sudo apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

    log_success "Docker installed: $(docker --version)"
fi

# Add current user to docker group (no sudo needed)
if ! groups | grep -q docker; then
    sudo usermod -aG docker "$USER"
    log_warn "Added $USER to docker group. You may need to log out and back in."
fi

# Start Docker daemon (for WSL)
if ! docker info &>/dev/null; then
    log_info "Starting Docker daemon..."
    sudo service docker start || sudo dockerd &
    sleep 5
fi

log_success "Docker is running: $(docker info --format '{{.ServerVersion}}' 2>/dev/null)"

# ── Step 5: Install Docker Compose ────────────────────────────────────────────
log_step "Step 5: Verifying Docker Compose"
if docker compose version &>/dev/null; then
    log_success "Docker Compose: $(docker compose version --short)"
else
    log_info "Installing Docker Compose plugin..."
    sudo apt-get install -y -qq docker-compose-plugin
fi

# ── Step 6: Configure Git ─────────────────────────────────────────────────────
log_step "Step 6: Configuring Git"
if [ -z "$(git config --global user.name 2>/dev/null)" ]; then
    read -rp "  Enter your Git username: " git_username
    git config --global user.name "$git_username"
fi
if [ -z "$(git config --global user.email 2>/dev/null)" ]; then
    read -rp "  Enter your Git email: " git_email
    git config --global user.email "$git_email"
fi
git config --global init.defaultBranch main
git config --global core.autocrlf input
log_success "Git configured: $(git config --global user.name) <$(git config --global user.email)>"

# ── Step 7: Setup project ──────────────────────────────────────────────────────
log_step "Step 7: Setting up project dependencies"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_ROOT"
log_info "Project root: $PROJECT_ROOT"

# Backend deps
log_info "Installing backend dependencies..."
cd backend && npm install && cd ..
log_success "Backend deps installed"

# Frontend deps
log_info "Installing frontend dependencies..."
cd frontend && npm install && cd ..
log_success "Frontend deps installed"

# Create .env files
if [ ! -f backend/.env ]; then
    cp backend/.env.example backend/.env
    log_success "Created backend/.env from template"
fi

# ── Step 8: Run tests ──────────────────────────────────────────────────────────
log_step "Step 8: Running initial tests"
cd backend
log_info "Running backend tests..."
npm test -- --forceExit 2>&1 | tail -20
log_success "Backend tests passed"
cd ..

# ── Step 9: First Docker build ─────────────────────────────────────────────────
log_step "Step 9: Building Docker images for the first time"
docker compose build --no-cache 2>&1 | tail -30
log_success "Docker images built successfully"

# ── Step 10: Start the app ────────────────────────────────────────────────────
log_step "Step 10: Starting the application"
docker compose up -d
sleep 15

# Health check
MAX_RETRIES=10
RETRY=0
log_info "Waiting for backend to be ready..."
until curl -sf http://localhost:5000/health > /dev/null 2>&1; do
    RETRY=$((RETRY + 1))
    [ "$RETRY" -ge "$MAX_RETRIES" ] && { log_error "Backend did not start!"; docker compose logs; exit 1; }
    sleep 3
done

echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║  ✅ SETUP COMPLETE!                                      ║"
echo "║                                                          ║"
echo "║  Notes App is running:                                   ║"
echo "║  → Frontend : http://localhost:3000                      ║"
echo "║  → Backend  : http://localhost:5000                      ║"
echo "║  → API Docs : http://localhost:5000/health               ║"
echo "║                                                          ║"
echo "║  Next steps:                                             ║"
echo "║  1. Open http://localhost:3000 in your browser           ║"
echo "║  2. Follow README.md to set up Jenkins                   ║"
echo "║  3. Configure GitHub webhook                             ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""
