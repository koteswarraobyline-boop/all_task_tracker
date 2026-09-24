/** PM2 process config — from this folder: pm2 start ecosystem.config.cjs */
const path = require('path');

const root = __dirname;
const serverDir = path.join(root, 'server');

module.exports = {
  apps: [
    {
      name: 'task-tracker-api',
      script: 'server.js',
      cwd: serverDir,
      interpreter: 'node',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      min_uptime: '10s',
      max_restarts: 15,
      exp_backoff_restart_delay: 200,
      env: {
        NODE_ENV: 'production',
      },
      kill_timeout: 10000,
      merge_logs: true,
      time: true,
      error_file: path.join(serverDir, 'logs/pm2-error.log'),
      out_file: path.join(serverDir, 'logs/pm2-out.log'),
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    },
  ],
};
