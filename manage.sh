#!/bin/bash

# =============================================================================
# ZICTIA Customer Portal — Unified Service Manager
# =============================================================================
# Manages: PostgreSQL, Redis, MinIO, API (Express), Frontend (Vite/React)
# Modes:   dev | prod
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR/backend"
FRONTEND_DIR="$SCRIPT_DIR/frontend"
LOG_DIR="$SCRIPT_DIR/logs"
PID_DIR="$SCRIPT_DIR/.pids"

mkdir -p "$LOG_DIR" "$PID_DIR"

# ── NVM Setup ────────────────────────────────────────────────────────────────
export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# ── Mode ─────────────────────────────────────────────────────────────────────
MODE="${ZICTIA_MODE:-dev}"

# ── Service Ports ────────────────────────────────────────────────────────────
POSTGRES_PORT="${POSTGRES_PORT:-5432}"
REDIS_PORT="${REDIS_PORT:-6379}"
MINIO_PORT="${MINIO_PORT:-9000}"
MINIO_CONSOLE_PORT="${MINIO_CONSOLE_PORT:-9001}"
API_PORT="${API_PORT:-4000}"
WEB_PORT="${WEB_PORT:-3000}"

# ── Log Files ────────────────────────────────────────────────────────────────
API_LOG="$LOG_DIR/backend.log"
WEB_LOG="$LOG_DIR/frontend.log"

# ── Database Config ──────────────────────────────────────────────────────────
DB_NAME="${DB_NAME:-zictia_portal}"
DB_USER="${DB_USER:-zictia}"
DB_PASS="${DB_PASS:-zictia_dev_pass}"

# ── MinIO Config ─────────────────────────────────────────────────────────────
MINIO_ACCESS_KEY="${MINIO_ACCESS_KEY:-zictia}"
MINIO_SECRET_KEY="${MINIO_SECRET_KEY:-zictia_minio_pass}"
MINIO_BUCKET="${MINIO_BUCKET:-zictia-portal}"
MINIO_DATA_DIR="${MINIO_DATA_DIR:-$HOME/.minio/data}"

# ── PID files ────────────────────────────────────────────────────────────────
BACKEND_PID="$PID_DIR/backend.pid"
FRONTEND_PID="$PID_DIR/frontend.pid"

# =============================================================================
# COLORS
# =============================================================================
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
BOLD='\033[1m'
NC='\033[0m'

# =============================================================================
# LOGGING
# =============================================================================
log_info()    { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[OK]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error()   { echo -e "${RED}[FAIL]${NC} $1"; }

log_header() {
    echo ""
    echo -e "${CYAN}═══════════════════════════════════════════════════════${NC}"
    echo -e "${CYAN}  $1${NC}"
    echo -e "${CYAN}═══════════════════════════════════════════════════════${NC}"
    echo ""
}

mode_label() { echo "$MODE"; }

is_dev()  { [ "$MODE" = "dev" ]; }
is_prod() { [ "$MODE" = "prod" ]; }

# =============================================================================
# PORT & PROCESS MANAGEMENT
# =============================================================================
port_is_open() {
    local port=$1
    lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1 && return 0
    ss -tlnp 2>/dev/null | grep -qE ":${port}[[:space:]]" && return 0
    return 1
}

http_responds() {
    local port=$1
    local path="${2:-/}"
    local code
    code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 3 --connect-timeout 2 "http://localhost:$port$path" 2>/dev/null)
    [ "$code" != "000" ] && [ -n "$code" ]
}

port_pid() {
    local pid
    pid=$(lsof -ti:$1 2>/dev/null | head -1)
    if [ -z "$pid" ]; then
        pid=$(ss -tlnp 2>/dev/null | grep ":${1} " | grep -oP 'pid=\K[0-9]+' | head -1)
    fi
    echo "$pid"
}

kill_port() {
    local port=$1
    local label="${2:-port $port}"

    if ! port_is_open "$port"; then
        return 0
    fi

    log_warning "$label: port $port is in use, freeing it..."

    local pid
    pid=$(port_pid "$port")
    if [ -n "$pid" ]; then
        kill -9 "$pid" 2>/dev/null || sudo kill -9 "$pid" 2>/dev/null || true
        sleep 1
    fi

    if port_is_open "$port"; then
        fuser -k "$port/tcp" 2>/dev/null || sudo fuser -k "$port/tcp" 2>/dev/null || true
        sleep 1
    fi

    if port_is_open "$port"; then
        pid=$(port_pid "$port")
        if [ -n "$pid" ]; then
            sudo kill -9 "$pid" 2>/dev/null || true
            sleep 1
        fi
    fi

    if port_is_open "$port"; then
        log_error "$label: could not free port $port"
        return 1
    fi

    log_success "$label: port $port freed"
    return 0
}

ensure_port_free() {
    local port=$1
    local label="${2:-service}"
    if port_is_open "$port"; then
        log_warning "$label is already running on port $port"
        kill_port "$port" "$label"
        if [ $? -ne 0 ]; then
            log_error "Cannot start $label — port $port is occupied"
            return 1
        fi
    fi
    return 0
}

wait_for_port() {
    local port=$1
    local label="${2:-service}"
    local timeout=${3:-30}
    local elapsed=0

    log_info "Waiting for $label on port $port..."

    while [ $elapsed -lt $timeout ]; do
        if port_is_open "$port"; then
            local pid=$(port_pid "$port")
            if [ -n "$pid" ]; then
                log_success "$label is ready on port $port (PID: $pid)"
            else
                log_success "$label is ready on port $port"
            fi
            return 0
        fi
        sleep 2
        elapsed=$((elapsed + 2))
    done

    log_error "$label failed to start within ${timeout}s"
    return 1
}

# =============================================================================
# ENV CHECK
# =============================================================================
check_env() {
    if [ ! -f "$BACKEND_DIR/.env" ]; then
        log_error "backend/.env not found. Copy .env.example and configure."
        log_info "  cp backend/.env.example backend/.env"
        exit 1
    fi
}

# =============================================================================
# POSTGRESQL
# =============================================================================
start_postgres() {
    if is_postgres_running; then
        log_success "PostgreSQL: already running"
        return 0
    fi
    if command -v systemctl &>/dev/null; then
        sudo systemctl start postgresql 2>/dev/null || true
    fi
    if ! is_postgres_running && command -v pg_ctlcluster &>/dev/null; then
        sudo pg_ctlcluster 16 main start 2>/dev/null || \
        sudo pg_ctlcluster 15 main start 2>/dev/null || \
        sudo pg_ctlcluster 14 main start 2>/dev/null || true
    fi
    if ! is_postgres_running && command -v service &>/dev/null; then
        sudo service postgresql start 2>/dev/null || true
    fi
    for i in $(seq 1 10); do
        if is_postgres_running; then
            log_success "PostgreSQL: started"
            return 0
        fi
        sleep 1
    done
    log_error "PostgreSQL: failed to start"
    return 1
}

stop_postgres() {
    if ! is_postgres_running; then
        log_info "PostgreSQL: not running"
        return 0
    fi
    if command -v systemctl &>/dev/null; then
        sudo systemctl stop postgresql 2>/dev/null || true
    fi
    if is_postgres_running && command -v pg_ctlcluster &>/dev/null; then
        sudo pg_ctlcluster 16 main stop -m fast 2>/dev/null || \
        sudo pg_ctlcluster 15 main stop -m fast 2>/dev/null || true
    fi
    if is_postgres_running && command -v service &>/dev/null; then
        sudo service postgresql stop 2>/dev/null || true
    fi
    for i in $(seq 1 5); do
        if ! is_postgres_running; then
            log_success "PostgreSQL: stopped"
            return 0
        fi
        sleep 1
    done
    local pid=$(port_pid "$POSTGRES_PORT")
    if [ -n "$pid" ]; then
        sudo kill "$pid" 2>/dev/null || true
    fi
    log_success "PostgreSQL: stopped"
}

is_postgres_running() {
    PGPASSWORD="$DB_PASS" psql -U "$DB_USER" -h localhost -p "$POSTGRES_PORT" -d "$DB_NAME" -c "SELECT 1" >/dev/null 2>&1 || \
    PGPASSWORD="postgres" psql -U postgres -h localhost -p "$POSTGRES_PORT" -d "$DB_NAME" -c "SELECT 1" >/dev/null 2>&1
}

# =============================================================================
# REDIS
# =============================================================================
start_redis() {
    if is_redis_running; then
        log_success "Redis: already running"
        return 0
    fi
    if command -v systemctl &>/dev/null && sudo systemctl start redis-server 2>/dev/null; then
        sleep 1
        if is_redis_running; then
            log_success "Redis: started via systemd"
            return 0
        fi
    fi
    redis-server --daemonize yes 2>/dev/null || true
    for i in $(seq 1 5); do
        if is_redis_running; then
            log_success "Redis: started"
            return 0
        fi
        sleep 1
    done
    log_error "Redis: failed to start"
    return 1
}

stop_redis() {
    if command -v redis-cli &>/dev/null; then
        redis-cli shutdown 2>/dev/null || true
        log_success "Redis: stopped"
    else
        local pid=$(port_pid "$REDIS_PORT")
        if [ -n "$pid" ]; then
            kill "$pid" 2>/dev/null || true
            log_success "Redis: stopped"
        else
            log_info "Redis: not running"
        fi
    fi
}

is_redis_running() {
    port_is_open "$REDIS_PORT"
}

# =============================================================================
# MINIO (Object Storage)
# =============================================================================
start_minio() {
    if is_minio_running; then
        log_success "MinIO: already running (API: $MINIO_PORT, Console: $MINIO_CONSOLE_PORT)"
        return 0
    fi

    if ! command -v minio &>/dev/null; then
        log_warning "MinIO is not installed. File uploads will not work. Install: https://min.io/docs/minio/linux/index.html"
        return 1
    fi

    mkdir -p "$MINIO_DATA_DIR" "$LOG_DIR"
    MINIO_ROOT_USER="$MINIO_ACCESS_KEY" \
    MINIO_ROOT_PASSWORD="$MINIO_SECRET_KEY" \
    nohup minio server "$MINIO_DATA_DIR" \
        --address ":$MINIO_PORT" \
        --console-address ":$MINIO_CONSOLE_PORT" \
        > "$LOG_DIR/minio.log" 2>&1 < /dev/null &
    disown

    wait_for_port "$MINIO_PORT" "MinIO" 15
    log_info "MinIO Console: http://localhost:$MINIO_CONSOLE_PORT"
}

stop_minio() {
    if ! is_minio_running; then
        log_info "MinIO: not running"
        return 0
    fi
    kill_port "$MINIO_PORT" "MinIO"
    kill_port "$MINIO_CONSOLE_PORT" "MinIO Console"
    log_success "MinIO: stopped"
}

is_minio_running() {
    port_is_open "$MINIO_PORT"
}

# =============================================================================
# INFRASTRUCTURE (all background services)
# =============================================================================
start_infra() {
    log_info "Starting infrastructure..."
    local failures=0
    start_postgres || failures=$((failures + 1))
    start_redis || failures=$((failures + 1))
    start_minio || log_warning "MinIO is optional — file uploads will not work"
    return $failures
}

stop_infra() {
    log_info "Stopping infrastructure..."
    stop_minio
    stop_redis
    stop_postgres
}

restart_infra() {
    stop_infra
    sleep 1
    start_infra
}

# =============================================================================
# BACKEND (Express.js API)
# =============================================================================
start_backend() {
    check_env
    log_info "Starting Backend on port $API_PORT [$(mode_label)]..."

    if [ -f "$BACKEND_PID" ] && kill -0 "$(cat "$BACKEND_PID")" 2>/dev/null; then
        log_success "Backend: already running (PID $(cat "$BACKEND_PID"))"
        return 0
    fi

    if ! is_postgres_running; then
        log_error "PostgreSQL is not running. Start it: $0 start postgres"
        return 1
    fi
    if ! is_redis_running; then
        log_error "Redis is not running. Start it: $0 start redis"
        return 1
    fi

    ensure_port_free "$API_PORT" "Backend" || return 1

    cd "$BACKEND_DIR"

    if is_dev; then
        (
            set -a
            [ -f "$BACKEND_DIR/.env" ] && . "$BACKEND_DIR/.env"
            npm run dev >> "$API_LOG" 2>&1 < /dev/null
        ) &
        echo $! > "$BACKEND_PID"
    else
        if [ ! -d "$BACKEND_DIR/dist" ]; then
            log_warning "Backend build not found. Building..."
            build_backend
        fi
        (
            set -a
            [ -f "$BACKEND_DIR/.env" ] && . "$BACKEND_DIR/.env"
            NODE_ENV=production exec node dist/server.js >> "$API_LOG" 2>&1 < /dev/null
        ) &
        echo $! > "$BACKEND_PID"
    fi
    disown

    wait_for_port "$API_PORT" "Backend" 20
}

stop_backend() {
    log_info "Stopping Backend..."
    if [ -f "$BACKEND_PID" ] && kill -0 "$(cat "$BACKEND_PID")" 2>/dev/null; then
        local pid=$(cat "$BACKEND_PID")
        kill "$pid" 2>/dev/null || true
        sleep 1
        kill -9 "$pid" 2>/dev/null || true
        rm -f "$BACKEND_PID"
    fi
    pkill -f "tsx watch src/server" 2>/dev/null || true
    pkill -f "node.*dist/server" 2>/dev/null || true
    kill_port "$API_PORT" "Backend"
    log_success "Backend stopped"
}

restart_backend() {
    stop_backend
    sleep 1
    start_backend
}

is_backend_running() {
    port_is_open "$API_PORT"
}

# =============================================================================
# FRONTEND (Vite + React)
# =============================================================================
start_frontend() {
    log_info "Starting Frontend on port $WEB_PORT [$(mode_label)]..."

    if [ -f "$FRONTEND_PID" ] && kill -0 "$(cat "$FRONTEND_PID")" 2>/dev/null; then
        log_success "Frontend: already running (PID $(cat "$FRONTEND_PID"))"
        return 0
    fi

    ensure_port_free "$WEB_PORT" "Frontend" || return 1

    cd "$FRONTEND_DIR"

    if is_dev; then
        npm run dev >> "$WEB_LOG" 2>&1 < /dev/null &
        echo $! > "$FRONTEND_PID"
    else
        if [ ! -d "$FRONTEND_DIR/dist" ]; then
            log_warning "Frontend build not found. Building..."
            build_frontend
        fi
        log_info "Production frontend should be served via nginx (see infra/nginx.conf)"
        log_info "For quick preview: cd frontend && npx vite preview --port $WEB_PORT"
        log_info "Starting preview server..."
        npx vite preview --port "$WEB_PORT" >> "$WEB_LOG" 2>&1 < /dev/null &
        echo $! > "$FRONTEND_PID"
    fi
    disown

    wait_for_port "$WEB_PORT" "Frontend" 20
}

stop_frontend() {
    log_info "Stopping Frontend..."
    if [ -f "$FRONTEND_PID" ] && kill -0 "$(cat "$FRONTEND_PID")" 2>/dev/null; then
        local pid=$(cat "$FRONTEND_PID")
        kill "$pid" 2>/dev/null || true
        sleep 1
        kill -9 "$pid" 2>/dev/null || true
        rm -f "$FRONTEND_PID"
    fi
    pkill -f "vite" 2>/dev/null || true
    kill_port "$WEB_PORT" "Frontend"
    log_success "Frontend stopped"
}

restart_frontend() {
    stop_frontend
    sleep 1
    start_frontend
}

is_frontend_running() {
    port_is_open "$WEB_PORT"
}

# =============================================================================
# START / STOP / RESTART ALL
# =============================================================================
start_all() {
    log_header "Starting all services [$(mode_label)]"

    start_infra
    local infra_fail=$?
    if [ $infra_fail -gt 0 ]; then
        log_warning "Some infrastructure services failed to start"
    fi

    start_backend
    local backend_result=$?

    start_frontend
    local frontend_result=$?

    _print_summary "$backend_result" "$frontend_result"
}

stop_all() {
    log_header "Stopping all services"
    stop_frontend
    stop_backend
    stop_infra
    log_success "All services stopped"
}

restart_all() {
    stop_all
    sleep 2
    start_all
}

_print_summary() {
    local backend_result=$1 frontend_result=$2
    local result=0

    echo ""
    echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BOLD}  Start Summary [$(mode_label)]${NC}"
    echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

    if is_postgres_running; then
        local pg_pid=$(port_pid "$POSTGRES_PORT")
        echo -e "  ${GREEN}● PostgreSQL${NC}   port $POSTGRES_PORT  db: $DB_NAME${pg_pid:+ (PID: $pg_pid)}"
    else
        echo -e "  ${RED}● PostgreSQL${NC}   port $POSTGRES_PORT  ${RED}NOT RUNNING${NC}"
        result=1
    fi

    if is_redis_running; then
        local rd_pid=$(port_pid "$REDIS_PORT")
        echo -e "  ${GREEN}● Redis${NC}        port $REDIS_PORT${rd_pid:+ (PID: $rd_pid)}"
    else
        echo -e "  ${RED}● Redis${NC}        port $REDIS_PORT  ${RED}NOT RUNNING${NC}"
        result=1
    fi

    if is_minio_running; then
        local mn_pid=$(port_pid "$MINIO_PORT")
        echo -e "  ${GREEN}● MinIO${NC}        port $MINIO_PORT${mn_pid:+ (PID: $mn_pid)}  console: $MINIO_CONSOLE_PORT"
    else
        echo -e "  ${YELLOW}● MinIO${NC}        port $MINIO_PORT  ${YELLOW}Stopped (optional)${NC}"
    fi

    if [ $backend_result -eq 0 ] && is_backend_running; then
        local api_pid=$(port_pid "$API_PORT")
        echo -e "  ${GREEN}● Backend${NC}      port $API_PORT  http://localhost:$API_PORT${api_pid:+ (PID: $api_pid)}"
    else
        echo -e "  ${RED}● Backend${NC}      port $API_PORT  ${RED}FAILED TO START${NC}"
        result=1
    fi

    if [ $frontend_result -eq 0 ] && is_frontend_running; then
        local web_pid=$(port_pid "$WEB_PORT")
        echo -e "  ${GREEN}● Frontend${NC}     port $WEB_PORT  http://localhost:$WEB_PORT${web_pid:+ (PID: $web_pid)}"
    else
        echo -e "  ${RED}● Frontend${NC}     port $WEB_PORT  ${RED}FAILED TO START${NC}"
        result=1
    fi

    echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""

    if [ $result -eq 0 ]; then
        log_success "All core services started. API: http://localhost:$API_PORT  Frontend: http://localhost:$WEB_PORT"
    else
        log_error "Some services failed to start"
    fi

    return $result
}

# =============================================================================
# MODE SWITCHING
# =============================================================================
switch_to_dev() {
    log_header "Switching to DEV mode"
    stop_all 2>/dev/null || true
    MODE="dev"
    ZICTIA_MODE="dev"
    log_success "Switched to DEV mode (tsx watch + vite dev)"
    log_info "Start services with: $0 start"
}

switch_to_prod() {
    log_header "Switching to PRODUCTION mode"
    stop_all 2>/dev/null || true
    build_all
    MODE="prod"
    ZICTIA_MODE="prod"
    log_success "Switched to PRODUCTION mode"
    log_info "Start services with: $0 start"
}

# =============================================================================
# STATUS & HEALTH
# =============================================================================
_service_status_line() {
    local label=$1 port=$2 extra="${3:-}"

    if port_is_open "$port"; then
        local pid=$(port_pid "$port")
        local pid_info=""
        [ -n "$pid" ] && pid_info=" (PID: $pid)"
        echo -e "  ${GREEN}● ${label}${NC}  port ${port}${pid_info}  ${extra}"
    else
        echo -e "  ${RED}● ${label}${NC}  port ${port}  ${RED}Stopped${NC}"
    fi
}

check_status() {
    log_header "ZICTIA Service Status [$(mode_label)]"

    echo -e "  ${BOLD}Infrastructure${NC}"
    echo -e "  ${CYAN}──────────────────────────────────────────────${NC}"
    if is_postgres_running; then
        local pg_pid=$(port_pid "$POSTGRES_PORT")
        echo -e "  ${GREEN}● PostgreSQL${NC}   port $POSTGRES_PORT  db: $DB_NAME${pg_pid:+ (PID: $pg_pid)}"
    else
        echo -e "  ${RED}● PostgreSQL${NC}   port $POSTGRES_PORT  ${RED}Stopped${NC}"
    fi
    if is_redis_running; then
        local rd_pid=$(port_pid "$REDIS_PORT")
        echo -e "  ${GREEN}● Redis${NC}        port $REDIS_PORT${rd_pid:+ (PID: $rd_pid)}"
    else
        echo -e "  ${RED}● Redis${NC}        port $REDIS_PORT  ${RED}Stopped${NC}"
    fi
    if is_minio_running; then
        local mn_pid=$(port_pid "$MINIO_PORT")
        echo -e "  ${GREEN}● MinIO${NC}        port $MINIO_PORT${mn_pid:+ (PID: $mn_pid)}  console: $MINIO_CONSOLE_PORT"
    else
        echo -e "  ${YELLOW}● MinIO${NC}        port $MINIO_PORT  ${YELLOW}Stopped (optional)${NC}"
    fi

    echo ""
    echo -e "  ${BOLD}Application${NC}"
    echo -e "  ${CYAN}──────────────────────────────────────────────${NC}"
    _service_status_line "Backend " "$API_PORT" "http://localhost:$API_PORT"
    _service_status_line "Frontend" "$WEB_PORT" "http://localhost:$WEB_PORT"

    echo ""
}

health_check() {
    log_info "Running health checks..."
    echo ""
    for svc in "PostgreSQL:$POSTGRES_PORT" "Redis:$REDIS_PORT" "MinIO:$MINIO_PORT" "Backend:$API_PORT" "Frontend:$WEB_PORT"; do
        local name="${svc%%:*}"
        local port="${svc##*:}"
        if port_is_open "$port"; then
            echo -e "  ${GREEN}● $name${NC} port $port — listening"
        else
            echo -e "  ${RED}● $name${NC} port $port — not listening"
        fi
    done
    echo ""
    if http_responds "$API_PORT" "/api"; then
        echo -e "  ${GREEN}● API health${NC} — responding"
    else
        echo -e "  ${RED}● API health${NC} — not responding"
    fi
    if http_responds "$WEB_PORT"; then
        echo -e "  ${GREEN}● Frontend${NC}   — responding"
    else
        echo -e "  ${RED}● Frontend${NC}   — not responding"
    fi
    echo ""
}

# =============================================================================
# LOGS
# =============================================================================
show_logs() {
    local service="${1:-all}"
    local lines="${2:-50}"

    case "$service" in
        api|backend)
            log_info "Backend logs (last $lines lines):"
            tail -n "$lines" "$API_LOG" 2>/dev/null || log_error "No backend log at $API_LOG"
            ;;
        web|frontend)
            log_info "Frontend logs (last $lines lines):"
            tail -n "$lines" "$WEB_LOG" 2>/dev/null || log_error "No frontend log at $WEB_LOG"
            ;;
        minio)
            log_info "MinIO logs (last $lines lines):"
            tail -n "$lines" "$LOG_DIR/minio.log" 2>/dev/null || log_error "No MinIO log"
            ;;
        postgres|postgresql)
            log_info "PostgreSQL logs (last $lines lines):"
            if [ -f /var/log/postgresql/postgresql-16-main.log ]; then
                sudo tail -n "$lines" /var/log/postgresql/postgresql-16-main.log 2>/dev/null || true
            elif [ -f /var/log/postgresql/postgresql-15-main.log ]; then
                sudo tail -n "$lines" /var/log/postgresql/postgresql-15-main.log 2>/dev/null || true
            else
                journalctl -u postgresql -n "$lines" --no-pager 2>/dev/null || true
            fi
            ;;
        redis)
            log_info "Redis logs (last $lines lines):"
            if [ -f /var/log/redis/redis-server.log ]; then
                tail -n "$lines" /var/log/redis/redis-server.log 2>/dev/null || true
            else
                log_info "Redis running in daemon mode (use redis-cli INFO)"
            fi
            ;;
        all|"")
            for entry in "Backend:$API_LOG" "Frontend:$WEB_LOG" "MinIO:$LOG_DIR/minio.log"; do
                local name="${entry%%:*}"
                local file="${entry##*:}"
                echo ""
                log_info "=== $name (last 30 lines) ==="
                tail -n 30 "$file" 2>/dev/null || log_info "  (no log at $file)"
            done
            ;;
        *)
            log_error "Unknown service: $service"
            log_info "Valid: api, web, minio, postgres, redis, all"
            ;;
    esac
}

tail_logs() {
    local service="${1:-all}"

    case "$service" in
        api|backend)
            log_info "Tailing Backend logs (Ctrl+C to stop)..."
            tail -f "$API_LOG" 2>/dev/null || log_error "No backend log found"
            ;;
        web|frontend)
            log_info "Tailing Frontend logs (Ctrl+C to stop)..."
            tail -f "$WEB_LOG" 2>/dev/null || log_error "No frontend log found"
            ;;
        minio)
            log_info "Tailing MinIO logs (Ctrl+C to stop)..."
            tail -f "$LOG_DIR/minio.log" 2>/dev/null || log_error "No MinIO log found"
            ;;
        all|"")
            log_info "Tailing all logs (Ctrl+C to stop)..."
            tail -f "$API_LOG" "$WEB_LOG" "$LOG_DIR/minio.log" 2>/dev/null
            ;;
        *)
            log_error "Unknown service: $service"
            log_info "Valid: api, web, minio, all"
            ;;
    esac
}

# =============================================================================
# DATABASE COMMANDS (Prisma)
# =============================================================================
db_migrate() {
    check_env
    log_info "Running Prisma migrations (dev)..."
    cd "$BACKEND_DIR"
    npx prisma migrate dev
    log_success "Migrations complete"
}

db_migrate_prod() {
    check_env
    log_info "Running Prisma migrations (production deploy)..."
    cd "$BACKEND_DIR"
    npx prisma migrate deploy
    log_success "Production migrations complete"
}

db_generate() {
    log_info "Generating Prisma client..."
    cd "$BACKEND_DIR"
    npx prisma generate
    log_success "Prisma client generated"
}

db_seed() {
    check_env
    log_info "Seeding database..."
    cd "$BACKEND_DIR"
    npx tsx src/scripts/seed.ts
    log_success "Database seeded"
}

db_reset() {
    log_warning "This will DROP and recreate the database!"
    read -p "Are you sure? (y/N): " confirm
    if [[ $confirm != [yY] && $confirm != [yY][eE][sS] ]]; then
        log_info "Cancelled"
        return 0
    fi
    check_env
    log_info "Resetting database..."
    cd "$BACKEND_DIR"
    npx prisma migrate reset --force
    log_success "Database reset complete"
}

db_studio() {
    check_env
    log_info "Starting Prisma Studio..."
    cd "$BACKEND_DIR"
    npx prisma studio
}

db_status() {
    log_info "Prisma migration status:"
    cd "$BACKEND_DIR"
    npx prisma migrate status
}

db_backup() {
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_dir="$SCRIPT_DIR/db/backups"
    local backup_file="$backup_dir/zictia_${timestamp}.dump"
    mkdir -p "$backup_dir"
    log_info "Backing up database '$DB_NAME'..."
    PGPASSWORD="$DB_PASS" pg_dump -U "$DB_USER" -h localhost -p "$POSTGRES_PORT" -d "$DB_NAME" -Fc > "$backup_file" 2>/dev/null || \
    PGPASSWORD="postgres" pg_dump -U postgres -h localhost -p "$POSTGRES_PORT" -d "$DB_NAME" -Fc > "$backup_file"
    if [ $? -eq 0 ]; then
        log_success "Database backed up to $backup_file"
    else
        log_error "Database backup failed"
        return 1
    fi
}

db_restore() {
    local backup_file="${1:-}"
    if [ -z "$backup_file" ]; then
        backup_file=$(ls -t "$SCRIPT_DIR"/db/backups/zictia_*.dump 2>/dev/null | head -1)
        if [ -z "$backup_file" ]; then
            log_error "No backup files found in $SCRIPT_DIR/db/backups/"
            return 1
        fi
        log_info "Using most recent backup: $backup_file"
    fi
    if [ ! -f "$backup_file" ]; then
        log_error "Backup file not found: $backup_file"
        return 1
    fi
    log_warning "This will REPLACE the current database '$DB_NAME' with the backup!"
    read -p "Are you sure? (y/N): " confirm
    if [[ $confirm != [yY] && $confirm != [yY][eE][sS] ]]; then
        log_info "Cancelled"
        return 0
    fi
    log_info "Restoring database from $backup_file..."
    PGPASSWORD="$DB_PASS" pg_restore -U "$DB_USER" -h localhost -p "$POSTGRES_PORT" -d "$DB_NAME" -c "$backup_file" 2>&1 || \
    PGPASSWORD="postgres" pg_restore -U postgres -h localhost -p "$POSTGRES_PORT" -d "$DB_NAME" -c "$backup_file" 2>&1 || true
    log_success "Database restored from $backup_file"
}

# =============================================================================
# BUILD & UTILITIES
# =============================================================================
build_backend() {
    log_info "Building backend..."
    cd "$BACKEND_DIR"
    npm run build
    log_success "Backend build complete"
}

build_frontend() {
    log_info "Building frontend..."
    cd "$FRONTEND_DIR"
    npm run build
    log_success "Frontend build complete"
}

build_all() {
    log_info "Building all [$(mode_label)]..."
    build_backend
    build_frontend
    log_success "Build complete"
    echo ""
    echo -e "  Frontend: ${FRONTEND_DIR}/dist"
    echo -e "  Backend:  ${BACKEND_DIR}/dist"
}

install_deps() {
    log_info "Installing backend dependencies..."
    cd "$BACKEND_DIR"
    npm install
    log_info "Installing frontend dependencies..."
    cd "$FRONTEND_DIR"
    npm install
    log_success "Dependencies installed"
}

clean_build() {
    log_info "Cleaning build artifacts..."
    rm -rf "$BACKEND_DIR/dist"
    rm -rf "$FRONTEND_DIR/dist"
    rm -rf "$LOG_DIR"
    rm -f "$BACKEND_PID" "$FRONTEND_PID"
    log_success "Cleaned"
}

# =============================================================================
# INTERACTIVE MENU
# =============================================================================
show_menu() {
    local m="$(mode_label)"
    local m_color
    case "$m" in
        dev)  m_color="${GREEN}" ;;
        prod) m_color="${MAGENTA}" ;;
        *)    m_color="${NC}" ;;
    esac

    echo ""
    echo -e "${CYAN}═══════════════════════════════════════════════════════${NC}"
    echo -e "${CYAN}  ZICTIA Portal Service Manager  [${BOLD}${m_color}${m}${NC}${CYAN}]${NC}"
    echo -e "${CYAN}═══════════════════════════════════════════════════════${NC}"
    echo ""
    echo -e "  ${BOLD}Infrastructure${NC}"
    echo "    1)  Start infrastructure (PostgreSQL + Redis + MinIO)"
    echo "    2)  Stop infrastructure"
    echo "    3)  Restart infrastructure"
    echo "    4)  Start PostgreSQL only"
    echo "    5)  Start Redis only"
    echo "    6)  Start MinIO only"
    echo ""
    echo -e "  ${BOLD}Application${NC}"
    echo "    7)  Start all [$(mode_label)]"
    echo "    8)  Stop all"
    echo "    9)  Restart all"
    echo "   10)  Start backend"
    echo "   11)  Stop backend"
    echo "   12)  Start frontend"
    echo "   13)  Stop frontend"
    echo ""
    echo -e "  ${BOLD}Mode Switching${NC}"
    echo "   14)  Switch to DEV mode (tsx watch + vite)"
    echo "   15)  Switch to PROD mode (built artifacts)"
    echo ""
    echo -e "  ${BOLD}Database${NC}"
    echo "   16)  Run migrations (dev)"
    echo "   17)  Run migrations (prod deploy)"
    echo "   18)  Generate Prisma client"
    echo "   19)  Seed database"
    echo "   20)  Reset database (drop + recreate)"
    echo "   21)  Prisma Studio"
    echo "   22)  Migration status"
    echo "   23)  Backup database"
    echo "   24)  Restore database"
    echo ""
    echo -e "  ${BOLD}Monitoring${NC}"
    echo "   25)  Check status"
    echo "   26)  Health check"
    echo "   27)  View backend logs"
    echo "   28)  View frontend logs"
    echo "   29)  View all logs"
    echo "   30)  Tail backend logs"
    echo "   31)  Tail frontend logs"
    echo "   32)  Tail all logs"
    echo ""
    echo -e "  ${BOLD}Utilities${NC}"
    echo "   33)  Install dependencies"
    echo "   34)  Build all"
    echo "   35)  Build backend only"
    echo "   36)  Build frontend only"
    echo "   37)  Clean build artifacts"
    echo ""
    echo "    0)  Exit"
    echo -e "${CYAN}═══════════════════════════════════════════════════════${NC}"
}

run_interactive() {
    while true; do
        show_menu
        echo -n "  Enter choice [0-37]: "
        read -r choice

        case $choice in
            # Infrastructure
            1)  start_infra ;;
            2)  stop_infra ;;
            3)  restart_infra ;;
            4)  start_postgres ;;
            5)  start_redis ;;
            6)  start_minio ;;
            # Application
            7)  start_all ;;
            8)  stop_all ;;
            9)  restart_all ;;
            10) start_backend ;;
            11) stop_backend ;;
            12) start_frontend ;;
            13) stop_frontend ;;
            # Mode Switching
            14) switch_to_dev ;;
            15) switch_to_prod ;;
            # Database
            16) db_migrate ;;
            17) db_migrate_prod ;;
            18) db_generate ;;
            19) db_seed ;;
            20) db_reset ;;
            21) db_studio ;;
            22) db_status ;;
            23) db_backup ;;
            24) db_restore ;;
            # Monitoring
            25) check_status ;;
            26) health_check ;;
            27) show_logs api ;;
            28) show_logs web ;;
            29) show_logs all ;;
            30) tail_logs api ;;
            31) tail_logs web ;;
            32) tail_logs all ;;
            # Utilities
            33) install_deps ;;
            34) build_all ;;
            35) build_backend ;;
            36) build_frontend ;;
            37) clean_build ;;
            # Exit
            0)  log_info "Bye"; exit 0 ;;
            *)  log_error "Invalid option" ;;
        esac

        case $choice in
            30|31|32) ;;  # don't pause for tail commands
            *)  echo ""; echo -n "  Press Enter to continue..."; read -r ;;
        esac
    done
}

# =============================================================================
# SERVICE NAME RESOLVER
# =============================================================================
resolve_service() {
    local action=$1
    local service="${2:-all}"

    case "$service" in
        all|"")                   ${action}_all ;;
        infra)                    ${action}_infra ;;
        postgres|postgresql)      ${action}_postgres ;;
        redis)                    ${action}_redis ;;
        minio)                    ${action}_minio ;;
        api|backend)              ${action}_backend ;;
        web|frontend)             ${action}_frontend ;;
        *)
            log_error "Unknown service: $service"
            log_info "Valid: all, infra, postgres, redis, minio, api, web"
            exit 1
            ;;
    esac
}

# =============================================================================
# HELP
# =============================================================================
show_help() {
    echo ""
    echo -e "${CYAN}╔═══════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║   ZICTIA Customer Portal — Service Manager            ║${NC}"
    echo -e "${CYAN}╚═══════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "  Mode: ${BOLD}dev${NC} (default) | ${BOLD}prod${NC}"
    echo -e "  Set via: ZICTIA_MODE=<mode>"
    echo ""
    echo -e "  ${BOLD}Service Control:${NC}"
    echo "    start [service]         Start service or all"
    echo "    stop [service]          Stop service or all"
    echo "    restart [service]       Restart service or all"
    echo "    status                  Show status of all services"
    echo "    health                  HTTP health checks"
    echo ""
    echo -e "  ${BOLD}Services:${NC}"
    echo "    all                All services (default)"
    echo "    infra              Infrastructure (postgres + redis + minio)"
    echo "    postgres           PostgreSQL database"
    echo "    redis              Redis server"
    echo "    minio              MinIO object storage"
    echo "    api|backend        Express.js API backend"
    echo "    web|frontend       Vite/React frontend"
    echo ""
    echo -e "  ${BOLD}Mode Switching:${NC}"
    echo "    use-dev                 Switch to DEV mode (tsx watch + vite dev)"
    echo "    use-prod                Switch to PROD mode (built artifacts)"
    echo ""
    echo -e "  ${BOLD}Database (Prisma):${NC}"
    echo "    db-migrate              Run prisma migrate dev"
    echo "    db-migrate-prod         Run prisma migrate deploy (production)"
    echo "    db-generate             Regenerate Prisma client"
    echo "    db-seed                 Seed the database"
    echo "    db-reset                Reset database (drop + recreate + seed)"
    echo "    db-studio               Launch Prisma Studio GUI"
    echo "    db-status               Show migration status"
    echo "    db-backup               Backup database to db/backups/"
    echo "    db-restore [file]       Restore database from backup"
    echo ""
    echo -e "  ${BOLD}Logs:${NC}"
    echo "    logs [service] [n]      View last n lines (api, web, minio, postgres, redis, all)"
    echo "    tail [service]          Tail logs in real-time"
    echo ""
    echo -e "  ${BOLD}Build & Utilities:${NC}"
    echo "    install                 Install all dependencies"
    echo "    build                   Build backend + frontend"
    echo "    build-api               Build backend only"
    echo "    build-web               Build frontend only"
    echo "    clean                   Clean all build artifacts"
    echo ""
    echo -e "  ${BOLD}Examples:${NC}"
    echo "    $0 start                      # Start everything in dev mode"
    echo "    $0 start infra                # Start infrastructure only"
    echo "    $0 use-prod                   # Switch to production mode"
    echo "    ZICTIA_MODE=prod $0 start    # Start in prod mode via env var"
    echo "    $0 logs api                   # View backend logs"
    echo "    $0 tail                       # Tail all logs"
    echo "    $0 status                     # Check all services"
    echo "    $0 db-studio                  # Open Prisma Studio"
    echo ""
}

# =============================================================================
# COMMAND ROUTER
# =============================================================================
case "${1:-}" in
    # Service Control
    start)        resolve_service start "${2:-all}" ;;
    stop)         resolve_service stop "${2:-all}" ;;
    restart)      resolve_service restart "${2:-all}" ;;
    status)       check_status ;;
    health)       health_check ;;

    # Mode Switching
    use-dev)      switch_to_dev ;;
    use-prod)     switch_to_prod ;;

    # Database
    db-migrate|migrate)  db_migrate ;;
    db-migrate-prod)     db_migrate_prod ;;
    db-generate)         db_generate ;;
    db-seed)             db_seed ;;
    db-reset)            db_reset ;;
    db-studio)           db_studio ;;
    db-status)           db_status ;;
    db-backup)           db_backup ;;
    db-restore)          db_restore "${2:-}" ;;

    # Logs
    logs)         show_logs "${2:-all}" "${3:-50}" ;;
    tail)         tail_logs "${2:-all}" ;;

    # Build & Utilities
    install)      install_deps ;;
    build)        build_all ;;
    build-api)    build_backend ;;
    build-web)    build_frontend ;;
    clean)        clean_build ;;

    # Help / Interactive
    help|--help|-h) show_help ;;
    "")           run_interactive ;;
    *)            log_error "Unknown command: $1"; show_help; exit 1 ;;
esac