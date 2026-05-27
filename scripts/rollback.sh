#!/usr/bin/env bash
# =============================================================================
#  rollback.sh — Roll back to a previous Docker image version
#  Usage: bash scripts/rollback.sh [version-tag]
#  Example: bash scripts/rollback.sh 42-abc1234
# =============================================================================

set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; NC='\033[0m'

log()     { echo -e "${BLUE}[ROLLBACK]${NC} $*"; }
success() { echo -e "${GREEN}✅ $*${NC}"; }
error()   { echo -e "${RED}❌ $*${NC}"; exit 1; }

ROLLBACK_TO="${1:-}"

echo ""
echo "═══════════════════════════════════════════════"
echo "  🔄 Notes App Rollback"
echo "═══════════════════════════════════════════════"
echo ""

# List available image versions
log "Available image versions:"
echo ""
echo "  Backend images:"
docker images notes-backend --format "    {{.Tag}}\t{{.CreatedSince}}\t{{.Size}}" | head -10
echo ""
echo "  Frontend images:"
docker images notes-frontend --format "    {{.Tag}}\t{{.CreatedSince}}\t{{.Size}}" | head -10
echo ""

if [ -z "$ROLLBACK_TO" ]; then
    read -rp "Enter version tag to rollback to (or 'latest'): " ROLLBACK_TO
fi

# Validate image exists
if ! docker image inspect "notes-backend:${ROLLBACK_TO}" &>/dev/null; then
    error "Image notes-backend:${ROLLBACK_TO} not found!"
fi

log "Rolling back to version: $ROLLBACK_TO"

# Tag rollback versions as latest
docker tag "notes-backend:${ROLLBACK_TO}"  notes-backend:latest
docker tag "notes-frontend:${ROLLBACK_TO}" notes-frontend:latest 2>/dev/null || true

# Redeploy with rolled-back images
log "Redeploying..."
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
export APP_VERSION="$ROLLBACK_TO"
docker compose -f "$PROJECT_ROOT/docker-compose.yml" down --remove-orphans
docker compose -f "$PROJECT_ROOT/docker-compose.yml" up -d

sleep 10

# Quick health check
if curl -sf http://localhost:5000/health > /dev/null 2>&1; then
    success "Rollback to $ROLLBACK_TO completed successfully!"
    echo "  → http://localhost:3000"
else
    error "Health check failed after rollback. Check: docker compose logs"
fi
