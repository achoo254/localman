# Deployment Guide

Localman is a 2-tier app: static frontend SPA + optional stateless Fastify proxy backend.

## Frontend — Static Hosting

Build output is a plain `dist/` folder — deploy anywhere that serves static files.

```bash
pnpm install
pnpm build        # outputs dist/
```

### Providers

| Provider | Method |
|----------|--------|
| Vercel | Import repo, set build command `pnpm build`, output dir `dist` |
| Netlify | Same as Vercel |
| Cloudflare Pages | Build command `pnpm build`, output `dist` |
| S3 + CloudFront | Upload `dist/` to S3 bucket, enable static website hosting |
| Nginx (self-host) | `root /app/dist; try_files $uri /index.html;` |

### Required env vars at build time

```
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_PROXY_URL=https://your-proxy.example.com
```

Set these in your hosting provider's environment settings before build.

---

## Backend — Docker

A `Dockerfile` lives in `backend/`. It produces a minimal node:22-alpine image.

### Build & Run

```bash
# Build image
docker build -t localman-proxy ./backend

# Run
docker run -p 3000:3000 \
  -e PORT=3000 \
  -e ALLOWED_ORIGINS=https://your-fe.example.com \
  -e REQUIRE_AUTH=true \
  -e FIREBASE_SERVICE_ACCOUNT_JSON='{"type":"service_account",...}' \
  localman-proxy
```

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | no | Port to listen on (default `3000`) |
| `ALLOWED_ORIGINS` | yes | Comma-separated FE origins for CORS |
| `REQUIRE_AUTH` | yes | `true` = verify Firebase token; `false` = open proxy |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | if auth=true | Firebase service account JSON (inline string or base64) |

### Self-Host Without Firebase

```
REQUIRE_AUTH=false
```

Leave `FIREBASE_SERVICE_ACCOUNT_JSON` unset. The proxy forwards all requests without authentication.

---

## TLS / HTTPS

The backend does not handle TLS directly. Place a reverse proxy in front:

**nginx example:**
```nginx
server {
    listen 443 ssl;
    server_name proxy.example.com;

    ssl_certificate     /etc/ssl/cert.pem;
    ssl_certificate_key /etc/ssl/key.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

**Caddy example (auto TLS):**
```
proxy.example.com {
    reverse_proxy localhost:3000
}
```

---

## CORS Configuration

`ALLOWED_ORIGINS` must include the exact origin of the frontend (scheme + host + port):

```
ALLOWED_ORIGINS=https://localman.example.com,http://localhost:5173
```

Wildcard `*` is not recommended in production when `REQUIRE_AUTH=true` (credentials are sent).

---

## Local Development

```bash
pnpm install
cp .env.example .env
cp backend/.env.example backend/.env
pnpm dev:all        # FE on :5173, BE on :3000
```

No Docker required locally — Fastify runs directly via `tsx`.

---

## Health Check

```
GET /health
→ 200 { "status": "ok" }
```

Use this as the Docker/container health check endpoint.
