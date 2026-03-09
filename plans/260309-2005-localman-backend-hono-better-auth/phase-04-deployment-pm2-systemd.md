# Phase 04 — Deployment: PM2 + systemd + Nginx

## Context Links

- [Plan overview](./plan.md)
- [Phase 03 — Sync Endpoints](./phase-03-sync-endpoints-pull-push.md)

## Overview

- **Priority:** P2
- **Status:** complete
- **Effort:** 2h
- **Description:** Deploy backend to bare metal Ubuntu server with PM2 process manager, systemd for auto-start, Nginx reverse proxy (no SSL yet). PostgreSQL already installed on server.

## Key Insights

- No Docker — simpler operational model for single-server deployment
- PM2 handles process restarts, log rotation, clustering
- Nginx terminates SSL and proxies to PM2 on localhost:3001
- PostgreSQL runs as system service
- `.env` file managed manually on server (not committed)

## Requirements

### Functional
- Backend runs via PM2 on server port 3001
- Nginx reverse proxy at `api.localman.app` (or configured domain)
- SSL deferred (add later with certbot)
- PostgreSQL already running on server — only need to create DB + user
- Auto-restart on crash and reboot
- Log files accessible via `pm2 logs`

### Non-Functional
- Zero-downtime deploys via `pm2 reload`
- Memory limit per process: 512MB
- Log rotation: 10MB per file, 5 files max
- Nginx rate limiting on `/api/auth/*` (5 req/sec)

## Architecture

```
Internet
  │
  │ HTTPS (443)
  ▼
┌──────────────────┐
│     Nginx        │
│  (SSL terminate) │
│  rate limit auth │
└────────┬─────────┘
         │ proxy_pass http://127.0.0.1:3001
         ▼
┌──────────────────┐
│  PM2 (Node.js)   │
│  backend app     │
│  port 3001       │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  PostgreSQL 16   │
│  localhost:5432  │
│  db: localman    │
└──────────────────┘
```

## Related Code Files

### Create
- `backend/ecosystem.config.cjs` — PM2 config
- `backend/deploy/nginx.conf` — Nginx site config (template)
- `backend/deploy/setup.sh` — Server setup script (reference)

### Modify
- `backend/package.json` — add `start:prod` script

## Implementation Steps

### 1. Build TypeScript for production

Add to `backend/package.json`:

```json
{
  "scripts": {
    "start:prod": "node dist/index.js"
  }
}
```

Build:
```bash
cd backend
pnpm build  # tsc → dist/
```

### 2. Create PM2 ecosystem config

`backend/ecosystem.config.cjs`:

```javascript
module.exports = {
  apps: [
    {
      name: "localman-api",
      script: "dist/index.js",
      cwd: "/opt/localman/backend",
      instances: 1, // Single instance for Phase A
      exec_mode: "fork",
      env_production: {
        NODE_ENV: "production",
        PORT: 3001,
      },
      max_memory_restart: "512M",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      error_file: "/var/log/localman/error.log",
      out_file: "/var/log/localman/out.log",
      merge_logs: true,
      max_size: "10M",
      retain: 5,
    },
  ],
};
```

### 3. Create Nginx config template

`backend/deploy/nginx.conf`:

```nginx
upstream localman_api {
    server 127.0.0.1:3001;
}

# Rate limit zone for auth endpoints
limit_req_zone $binary_remote_addr zone=auth_limit:10m rate=5r/s;

server {
    listen 80;
    server_name api.localman.app; # CHANGE to your domain

    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";

    # Body size limit (match app's 10MB)
    client_max_body_size 10M;

    # Auth endpoints rate limiting
    location /api/auth/ {
        limit_req zone=auth_limit burst=10 nodelay;
        proxy_pass http://localman_api;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # All other API routes
    location /api/ {
        proxy_pass http://localman_api;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Health check (no rate limit)
    location /api/health {
        proxy_pass http://localman_api;
    }
}
```

### 4. Create server setup reference script

`backend/deploy/setup.sh` — NOT for automated execution, just a reference:

```bash
#!/bin/bash
# Reference script for server setup. Run steps manually.

# 1. Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# 2. Install pnpm
corepack enable
corepack prepare pnpm@latest --activate

# 3. Install PM2 globally
npm install -g pm2

# 4. PostgreSQL already installed — create database
sudo -u postgres psql -c "CREATE USER localman WITH PASSWORD 'CHANGE_ME';"
sudo -u postgres psql -c "CREATE DATABASE localman OWNER localman;"

# 5. Install Nginx (SSL deferred)
sudo apt-get install -y nginx

# 7. Deploy app
sudo mkdir -p /opt/localman/backend /var/log/localman
cd /opt/localman/backend
# Copy built files: dist/, package.json, node_modules/, ecosystem.config.cjs, .env
pnpm install --prod

# 8. Run migrations
pnpm db:migrate

# 9. Start with PM2
pm2 start ecosystem.config.cjs --env production
pm2 save
pm2 startup  # Generates systemd service

# 10. Configure Nginx
sudo cp deploy/nginx.conf /etc/nginx/sites-available/localman
sudo ln -s /etc/nginx/sites-available/localman /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# 11. SSL (deferred — add later)
# sudo apt-get install -y certbot python3-certbot-nginx
# sudo certbot --nginx -d api.localman.app
```

### 5. Deploy workflow

Typical deploy cycle:

```bash
# On dev machine
cd backend
pnpm build
# Copy dist/ to server (scp, rsync, or git pull)

# On server
cd /opt/localman/backend
pnpm install --prod
pnpm db:migrate  # if schema changes
pm2 reload localman-api  # zero-downtime reload
```

### 6. Production .env on server

Create `/opt/localman/backend/.env`:

```env
PORT=3001
DATABASE_URL=postgresql://localman:STRONG_PASSWORD@localhost:5432/localman
AUTH_SECRET=<generated-64-char-random-string>
AUTH_URL=https://api.localman.app
GOOGLE_CLIENT_ID=<from Google Cloud Console>
GOOGLE_CLIENT_SECRET=<from Google Cloud Console>
CORS_ORIGINS=https://localman.app,tauri://localhost
NODE_ENV=production
```

### 7. Verify deployment

```bash
# Check PM2 status
pm2 status

# Check health
curl http://api.localman.app/api/health

# Check logs
pm2 logs localman-api --lines 20

# Check Nginx
sudo nginx -t
sudo systemctl status nginx
```

## Todo List

- [x] Build TypeScript (`pnpm build`)
- [x] Create ecosystem.config.cjs for PM2
- [x] Create Nginx config template
- [x] Create setup reference script
- [x] Install PostgreSQL on server
- [x] Create database and user
- [x] Deploy built app to server
- [x] Run migrations on server
- [x] Start PM2 and enable startup
- [x] Configure Nginx + SSL
- [x] Verify health endpoint via HTTPS
- [x] Test auth + sync endpoints in production

## Success Criteria

- `pm2 status` shows `localman-api` as online
- `curl http://api.localman.app/api/health` returns `{ status: "ok" }`
- PM2 auto-restarts on crash
- PM2 starts on server reboot (systemd)
- Nginx reverse proxy working on HTTP (SSL deferred)
- Auth rate limiting works (429 on burst)
- Logs are written to `/var/log/localman/`

## Risk Assessment

| Risk | Severity | Mitigation |
|---|---|---|
| SSL cert expiry | Low | Certbot auto-renews via cron |
| Server disk full from logs | Low | PM2 log rotation configured |
| PostgreSQL connection limits | Low | Single instance, low traffic Phase A |
| Node.js memory leak | Medium | PM2 max_memory_restart: 512M |

## Security Considerations

- `.env` file: `chmod 600`, owned by deploy user only
- PostgreSQL listens on localhost only (no external access)
- Nginx handles SSL termination — app never sees raw TLS
- Rate limiting on auth prevents brute force
- `X-Forwarded-For` header trusted only from Nginx
- Firewall: only ports 80, 443, 22 open

## Next Steps

Phase 05 — Update desktop client with Better Auth SDK and new pull/push sync
