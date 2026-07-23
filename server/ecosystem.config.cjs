/**
 * PM2 process file for Task Tracker API
 *
 * First-time on the host:
 *   cd server
 *   npm install --omit=dev
 *   npm install -g pm2
 *   cp .env.production.example .env   # fill DB + JWT + public URL
 *   mkdir -p logs
 *   # Build UI once (from repo root or client/):
 *   #   cd ../client && cp .env.production.example .env.production && npm ci && npm run build
 *   pm2 start ecosystem.config.cjs
 *   pm2 save
 *   pm2 startup
 *
 * After code/UI updates:
 *   npm run deploy          # from server/ (rebuilds client + reloads PM2)
 *
 * Useful:
 *   pm2 status
 *   pm2 logs task-tracker-api
 *   pm2 restart task-tracker-api
 *   curl -s http://127.0.0.1:5004/api/health
 */
const fs = require('fs');
const path = require('path');

const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

module.exports = {
  apps: [
    {
      name: 'task-tracker-api',
      script: 'server.js',
      cwd: __dirname,
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '400M',
      env: {
        NODE_ENV: 'production',
      },
      error_file: path.join(logsDir, 'pm2-error.log'),
      out_file: path.join(logsDir, 'pm2-out.log'),
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      time: true,
      kill_timeout: 8000,
      listen_timeout: 15000,
      wait_ready: true,
      // Restart if the process exits or becomes unstable
      max_restarts: 20,
      min_uptime: '10s',
      exp_backoff_restart_delay: 200,
    },
  ],
};
