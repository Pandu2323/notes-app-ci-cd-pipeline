#!/usr/bin/env bash
# =============================================================================
#  deploy.sh — Deploy/redeploy the Notes App using Docker Compose
#  Called by Jenkinsfile or run manually: bash scripts/deploy.sh
# =============================================================================

set -euo pipefail

# ── Colors ────────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; NC='\033[0m'

log()     { echo -e "${BLUE}[$(date +%H:%M:%S)]${NC} $*"; }
success() { echo -e "${GREEN}✅ $*${NC}"; }
warn()    { echo -e "${YELLOW}⚠️  $*${NC}"; }
error()   { echo -e "${RED}❌ $*${NC}"; exit 1; }

# ── Config ────────────────────────────────────────────────────────────────────
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPOSE_FILE="$PROJECT_ROOT/docker-compose.yml"
APP_VERSION="${APP_VERSION:-$(date +%Y%m%d%H%M%S)}"
MAX_HEALTH_RETRIES="${MAX_HEALTH_RETRIES:-15}"
BACKEND_PORT="${BACKEND_PORT:-5000}"
FRONTEND_PORT="${FRONTEND_PORT:-3000}"

echo ""
echo "═══════════════════════════════════════════════"
echo "  🚀 Notes App Deployment"
echo "  Version : $APP_VERSION"
echo "  Time    : $(date)"
echo "═══════════════════════════════════════════════"
echo ""

cd "$PROJECT_ROOT"

# ── Pre-flight checks ─────────────────────────────────────────────────────────
log "Running pre-flight checks..."

command -v docker    &>/dev/null || error "docker not found. Install Docker first."
command -v docker    &>/dev/null && docker compose version &>/dev/null || error "docker compose not available"

docker info &>/dev/null || error "Docker daemon is not running. Start it with: sudo service docker start"

success "Pre-flight checks passed"

# ── Stop existing containers ──────────────────────────────────────────────────
log "Stopping existing containers..."
docker compose -f "$COMPOSE_FILE" down --remove-orphans 2>/dev/null || true
success "Old containers stopped"

# ── Build new images ──────────────────────────────────────────────────────────
log "Building Docker images (version: $APP_VERSION)..."
export APP_VERSION

docker build \
    --tag notes-backend:"$APP_VERSION" \
    --tag notes-backend:latest \
    --file "$PROJECT_ROOT/backend/Dockerfile" \
    "$PROJECT_ROOT/backend/" \
    || error "Backend Docker build failed"

docker build \
    --tag notes-frontend:"$APP_VERSION" \
    --tag notes-frontend:latest \
    --build-arg REACT_APP_VERSION="$APP_VERSION" \
    --file "$PROJECT_ROOT/frontend/Dockerfile" \
    "$PROJECT_ROOT/frontend/" \
    || error "Frontend Docker build failed"

success "Docker images built"

# ── Deploy with docker compose ─────────────────────────────────────────────────
log "Starting containers..."
docker compose -f "$COMPOSE_FILE" up -d

success "Containers started"
log "Waiting for services to initialize..."
sleep 12

# ── Health check — Backend ─────────────────────────────────────────────────────
log "Health checking backend (port $BACKEND_PORT)..."
RETRIES=0
until curl -sf "http://localhost:${BACKEND_PORT}/health" > /dev/null 2>&1; do
    RETRIES=$((RETRIES + 1))
    if [ "$RETRIES" -ge "$MAX_HEALTH_RETRIES" ]; then
        error "Backend health check failed after $MAX_HEALTH_RETRIES attempts!"
    fi
    log "  Attempt $RETRIES/$MAX_HEALTH_RETRIES — retrying in 5s..."
    sleep 5
done
success "Backend is healthy!"
curl -s "http://localhost:${BACKEND_PORT}/health" | python3 -m json.tool 2>/dev/null || true

# ── Health check — Frontend ────────────────────────────────────────────────────
log "Health checking frontend (port $FRONTEND_PORT)..."
sleep 5
HTTP_CODE=$(curl -so /dev/null -w "%{http_code}" "http://localhost:${FRONTEND_PORT}" 2>/dev/null || echo "000")
if [ "$HTTP_CODE" = "200" ]; then
    success "Frontend is healthy! (HTTP $HTTP_CODE)"
else
    warn "Frontend returned HTTP $HTTP_CODE — check logs: docker compose logs frontend"
fi

# ── Show running containers ────────────────────────────────────────────────────
log "Running containers:"
docker compose -f "$COMPOSE_FILE" ps

echo ""
echo "═══════════════════════════════════════════════"
echo "  ✅ Deployment Complete!"
echo "  Frontend : http://localhost:${FRONTEND_PORT}"
echo "  Backend  : http://localhost:${BACKEND_PORT}"
echo "  API      : http://localhost:${BACKEND_PORT}/api/notes"
echo "  Health   : http://localhost:${BACKEND_PORT}/health"
echo "═══════════════════════════════════════════════"
echo ""
