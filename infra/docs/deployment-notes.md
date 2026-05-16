# ZICTIA Portal Deployment Notes

## Prerequisites

- Ubuntu 22.04 LTS
- Node.js 20 LTS (via NodeSource or nvm)
- PostgreSQL 15+
- Redis 7+
- nginx
- MinIO (optional, for file storage)

## Installation Steps

### 1. System Packages
```bash
sudo apt update
sudo apt install -y postgresql-15 redis-server nginx build-essential
```

### 2. Database Setup
```bash
sudo -u postgres psql -c "CREATE USER zictia WITH PASSWORD 'secure_password';"
sudo -u postgres psql -c "CREATE DATABASE zictia_portal OWNER zictia;"
```

### 3. Application Deployment
```bash
sudo mkdir -p /opt/zictia-portal
sudo chown $USER:$USER /opt/zictia-portal
cd /opt/zictia-portal
git clone <repo> .
```

### 4. Backend Setup
```bash
cd /opt/zictia-portal/backend
cp .env.example .env
# Edit .env with production values
npm install
npx prisma migrate deploy
npx prisma generate
npm run build
npm run db:seed
```

### 5. Frontend Build
```bash
cd /opt/zictia-portal/frontend
npm install
npm run build
sudo mkdir -p /var/www/zictia-portal
sudo cp -r dist/* /var/www/zictia-portal/
```

### 6. Systemd Services
```bash
sudo cp infra/systemd/zictia-api.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable zictia-api
sudo systemctl start zictia-api
```

### 7. nginx
```bash
sudo cp infra/nginx/zictia-portal.conf /etc/nginx/sites-available/zictia-portal
sudo ln -s /etc/nginx/sites-available/zictia-portal /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 8. SSL Certificates
Obtain certificates from a trusted CA or Zanzibar government PKI and place them at:
- `/etc/ssl/certs/zictia-portal.crt`
- `/etc/ssl/private/zictia-portal.key`

## Backup Strategy

- PostgreSQL: `pg_dump` every 6 hours
- Redis: AOF persistence enabled
- Files: MinIO bucket replication or rsync to Pemba DR

## Monitoring

- nginx access/error logs → `/var/log/nginx/`
- Application logs → `journalctl -u zictia-api`
- Prometheus + Grafana for metrics (Phase 3)
