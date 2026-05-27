#!/usr/bin/env bash
# =============================================================================
#  health-check.sh — Check the health of all Notes App services
#  Usage: bash scripts/health-check.sh
# =============================================================================

set -euo pipefail

GREEN='\033[0;32m'; RED='\033[0;31m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; NC='\033[0m'

BACKEND_PORT="${BACKEND_PORT:-5000}"
FRONTEND_PORT="${FRONTEND_PORT:-3000}"
PASS=0; FAIL=0

check() {
    local name="$1" url="$2" expected="${3:-200}"
    local code
    code=$(curl -so /dev/null -w "%{http_code}" --max-time 5 "$url" 2>/dev/null || echo "000")
    if [ "$code" = "$expected" ] || [[ "$code" =~ ^2 ]]; then
        echo -e "  ${GREEN}✅ PASS${NC}  $name → HTTP $code"
        PASS=$((PASS + 1))
    else
        echo -e "  ${RED}❌ FAIL${NC}  $name → HTTP $code (expected $expected)"
        FAIL=$((FAIL + 1))
    fi
}

echo ""
echo -e "${BLUE}═══════════════════════════════════════════${NC}"
echo -e "${BLUE}  Notes App Health Check — $(date +%H:%M:%S)${NC}"
echo -e "${BLUE}═══════════════════════════════════════════${NC}"
echo ""

echo "Docker containers:"
docker compose ps 2>/dev/null || echo "  (docker compose not available)"
echo ""

echo "Service checks:"
check "Backend Health"     "http://localhost:${BACKEND_PORT}/health"
check "Backend API"        "http://localhost:${BACKEND_PORT}/api/notes"
check "Frontend HTML"      "http://localhost:${FRONTEND_PORT}"

echo ""
echo "Backend details:"
curl -s "http://localhost:${BACKEND_PORT}/health" 2>/dev/null | \
    python3 -m json.tool 2>/dev/null || echo "  (backend not reachable)"

echo ""
echo -e "${BLUE}═══════════════════════════════════════════${NC}"
echo -e "  Results: ${GREEN}${PASS} passed${NC}  ${RED}${FAIL} failed${NC}"
echo -e "${BLUE}═══════════════════════════════════════════${NC}"
echo ""

[ "$FAIL" -eq 0 ] && exit 0 || exit 1
