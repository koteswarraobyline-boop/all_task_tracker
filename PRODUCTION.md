# Production Deployment Guide

Task Tracker runs as a **Node.js API + React SPA**. In production, the server serves the built client from `client/dist` and handles `/api/*` on the same domain.

## Prerequisites

- **Node.js** 18+ (22 LTS recommended)
- **MySQL** 8+
- **PM2** (recommended): `npm install -g pm2`
- **Apache or LiteSpeed** with `mod_proxy` (optional; for SSL + reverse proxy)

---

## 1. Environment setup

```bash
cd server
cp .env.production.example .env
```

Edit `server/.env` — required values:

| Variable | Description |
|----------|-------------|
| `NODE_ENV` | Must be `production` |
| `JWT_SECRET` | 64+ char random string |
| `ADMIN_PASSWORD` | Strong password (first boot only) |
| `CLIENT_APP_URL` | Public HTTPS URL, e.g. `https://tasks.example.com` |
| `CORS_ORIGINS` | Same as `CLIENT_APP_URL` (comma-separated if multiple) |
| `DB_*` | MySQL credentials |

Generate JWT secret:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

**Never commit `.env` to git.**

---

## 2. Database

Create MySQL database and user:

```sql
CREATE DATABASE task_tracker CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'task_tracker'@'localhost' IDENTIFIED BY 'your_strong_password';
GRANT ALL PRIVILEGES ON task_tracker.* TO 'task_tracker'@'localhost';
FLUSH PRIVILEGES;
```

On first start, the server creates tables and seeds the admin user (if none exists).

---

## 3. Build & deploy

From the project root (`task_tarker/`):

```bash
npm install --prefix client
npm install --prefix server
npm run deploy
```

Or step by step:

```bash
npm run build --prefix client
cd server
npm run pm2:start    # or: npm run deploy
```

Verify health:

```bash
curl http://localhost:5004/api/health
# {"ok":true,"service":"task-tracker-api","database":"connected",...}
```

---

## 4. Reverse proxy (Apache / LiteSpeed)

Point your domain to the Node process. Example Apache vhost:

```apache
ProxyPreserveHost On
ProxyPass /api http://127.0.0.1:5004/api
ProxyPassReverse /api http://127.0.0.1:5004/api
ProxyPass / http://127.0.0.1:5004/
ProxyPassReverse / http://127.0.0.1:5004/
```

The included `client/public/.htaccess` supports LiteSpeed shared hosting with `[P]` proxy flags.

Enable **HTTPS** (Let's Encrypt) before going live.

---

## 5. PM2 commands

```bash
cd server
npm run pm2:status
npm run pm2:logs
npm run pm2:reload    # zero-downtime after code update
npm run pm2:stop
```

---

## 6. Production checklist

- [ ] `NODE_ENV=production` in `server/.env`
- [ ] Strong `JWT_SECRET` and `ADMIN_PASSWORD`
- [ ] `CLIENT_APP_URL` set to public HTTPS URL (not localhost)
- [ ] `CORS_ORIGINS` matches your domain
- [ ] Client built: `client/dist` exists
- [ ] `/api/health` returns `ok: true`
- [ ] Admin password changed from default (if DB was used in dev)
- [ ] MySQL not exposed to the public internet
- [ ] HTTPS enabled on reverse proxy
- [ ] `DB_SYNC_ALTER` **not** set to `true` in production

---

## 7. Development vs production

| | Development | Production |
|---|-------------|------------|
| Client | `npm run dev` → port **5173** | Built `dist` served by server port **5004** |
| Server | `npm run dev` → port **5004** | PM2 / `npm start` |
| Lighthouse | Test on **5173** scores poorly | Test on **5004** after `npm run build` |

---

## 8. Updating

```bash
git pull
npm run deploy
```

---

## 9. Known dependency notes

- `xlsx` has known audit advisories; exports are auth-gated. Plan to replace in a future release.
- Run `npm audit` periodically on both `client/` and `server/`.

---

## 10. Troubleshooting

| Issue | Fix |
|-------|-----|
| Server exits on start | Check `server/.env` — JWT, CLIENT_APP_URL, CORS |
| Blank page | Run `npm run build --prefix client` |
| Share links show localhost | Set `CLIENT_APP_URL` in `.env` and restart |
| 401 on login | Check JWT_SECRET matches between restarts |
| DB connection failed | Verify MySQL running and `DB_*` credentials |
