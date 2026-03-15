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

# 5. Install Nginx
sudo apt-get install -y nginx

# 6. Deploy app
sudo mkdir -p /opt/localman/backend /var/log/localman
cd /opt/localman/backend
# Copy built files: dist/, package.json, node_modules/, ecosystem.config.cjs, .env
pnpm install --prod

# 7. Run migrations
pnpm db:migrate

# 8. Start with PM2
pm2 start ecosystem.config.cjs --env production
pm2 save
pm2 startup  # Generates systemd service

# 9. Configure Nginx
sudo cp deploy/nginx.conf /etc/nginx/sites-available/localman
sudo ln -s /etc/nginx/sites-available/localman /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# 10. SSL (deferred)
# sudo apt-get install -y certbot python3-certbot-nginx
# sudo certbot --nginx -d api.localman.app
