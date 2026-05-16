#!/bin/bash
set -e

# ZICTIA Customer Portal Service Manager
# Usage: ./manage.sh [dev|start|stop|build|test|migrate|seed|logs|status]

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR/backend"
FRONTEND_DIR="$SCRIPT_DIR/frontend"
PID_DIR="$SCRIPT_DIR/.pids"

mkdir -p "$PID_DIR"

backend_pid_file="$PID_DIR/backend.pid"
frontend_pid_file="$PID_DIR/frontend.pid"

help() {
  cat <<EOF
ZICTIA Portal Manager

Usage:
  ./manage.sh dev       Start backend + frontend in development mode
  ./manage.sh start     Start production build (requires npm run build first)
  ./manage.sh stop      Stop all running services
  ./manage.sh build     Build frontend and backend for production
  ./manage.sh test      Run backend tests
  ./manage.sh migrate   Run database migrations
  ./manage.sh seed      Seed database with sample data
  ./manage.sh logs      Tail backend logs
  ./manage.sh status    Check service status
  ./manage.sh install   Install dependencies
  ./manage.sh help      Show this help
EOF
}

check_env() {
  if [ ! -f "$BACKEND_DIR/.env" ]; then
    echo "Error: backend/.env not found. Copy .env.example and configure."
    exit 1
  fi
}

cmd_dev() {
  check_env
  echo "Starting development servers..."

  # Start backend
  cd "$BACKEND_DIR"
  if [ -f "$backend_pid_file" ] && kill -0 "$(cat "$backend_pid_file")" 2>/dev/null; then
    echo "Backend already running (PID $(cat "$backend_pid_file"))"
  else
    npm run dev >> "$SCRIPT_DIR/logs/backend.log" 2>&1 &
    echo $! > "$backend_pid_file"
    echo "Backend started on http://localhost:4000 (PID $(cat "$backend_pid_file"))"
  fi

  # Start frontend
  cd "$FRONTEND_DIR"
  if [ -f "$frontend_pid_file" ] && kill -0 "$(cat "$frontend_pid_file")" 2>/dev/null; then
    echo "Frontend already running (PID $(cat "$frontend_pid_file"))"
  else
    npm run dev >> "$SCRIPT_DIR/logs/frontend.log" 2>&1 &
    echo $! > "$frontend_pid_file"
    echo "Frontend started on http://localhost:3000 (PID $(cat "$frontend_pid_file"))"
  fi

  echo ""
  echo "Services running. Press Ctrl+C to stop or run ./manage.sh stop"
}

cmd_start() {
  check_env
  echo "Starting production services..."

  if [ ! -d "$FRONTEND_DIR/dist" ]; then
    echo "Error: Frontend build not found. Run ./manage.sh build first."
    exit 1
  fi

  if [ ! -d "$BACKEND_DIR/dist" ]; then
    echo "Error: Backend build not found. Run ./manage.sh build first."
    exit 1
  fi

  cd "$BACKEND_DIR"
  if [ -f "$backend_pid_file" ] && kill -0 "$(cat "$backend_pid_file")" 2>/dev/null; then
    echo "Backend already running"
  else
    NODE_ENV=production node dist/server.js >> "$SCRIPT_DIR/logs/backend.log" 2>&1 &
    echo $! > "$backend_pid_file"
    echo "Backend started (PID $(cat "$backend_pid_file"))"
  fi

  echo ""
  echo "Production API: http://localhost:4000"
  echo "Configure nginx to serve frontend/dist and proxy /api to :4000"
}

cmd_stop() {
  echo "Stopping services..."
  for pid_file in "$backend_pid_file" "$frontend_pid_file"; do
    if [ -f "$pid_file" ]; then
      pid=$(cat "$pid_file")
      if kill -0 "$pid" 2>/dev/null; then
        kill "$pid" 2>/dev/null && echo "Stopped process $pid" || true
        sleep 1
        kill -9 "$pid" 2>/dev/null || true
      fi
      rm -f "$pid_file"
    fi
  done
  echo "All services stopped."
}

cmd_build() {
  echo "Building backend..."
  cd "$BACKEND_DIR"
  npm run build

  echo "Building frontend..."
  cd "$FRONTEND_DIR"
  npm run build

  echo ""
  echo "Build complete."
  echo "Frontend: $FRONTEND_DIR/dist"
  echo "Backend:  $BACKEND_DIR/dist"
}

cmd_test() {
  echo "Running tests..."
  cd "$BACKEND_DIR"
  npm test
}

cmd_migrate() {
  check_env
  echo "Running database migrations..."
  cd "$BACKEND_DIR"
  npx prisma migrate deploy
}

cmd_seed() {
  check_env
  echo "Seeding database..."
  cd "$BACKEND_DIR"
  npx tsx src/scripts/seed.ts
}

cmd_logs() {
  if [ -f "$SCRIPT_DIR/logs/backend.log" ]; then
    tail -n 100 -f "$SCRIPT_DIR/logs/backend.log"
  else
    echo "No logs found."
  fi
}

cmd_status() {
  for service in backend frontend; do
    pid_file="$PID_DIR/$service.pid"
    if [ -f "$pid_file" ] && kill -0 "$(cat "$pid_file")" 2>/dev/null; then
      echo "$service: running (PID $(cat "$pid_file"))"
    else
      echo "$service: stopped"
    fi
  done
}

cmd_install() {
  echo "Installing backend dependencies..."
  cd "$BACKEND_DIR"
  npm install

  echo "Installing frontend dependencies..."
  cd "$FRONTEND_DIR"
  npm install

  echo "Dependencies installed."
}

mkdir -p "$SCRIPT_DIR/logs"

case "${1:-help}" in
  dev)      cmd_dev ;;
  start)    cmd_start ;;
  stop)     cmd_stop ;;
  build)    cmd_build ;;
  test)     cmd_test ;;
  migrate)  cmd_migrate ;;
  seed)     cmd_seed ;;
  logs)     cmd_logs ;;
  status)   cmd_status ;;
  install)  cmd_install ;;
  help|*)   help ;;
esac
