/** PM2 process config — from server/: pm2 start ecosystem.config.cjs */
const path = require('path');

module.exports = {
  apps: [
    {
      name: 'task-tracker-api',
      script: './server.js',
      cwd: __dirname,
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
      error_file: path.join(__dirname, 'logs/pm2-error.log'),
      out_file: path.join(__dirname, 'logs/pm2-out.log'),
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    },
  ],
};
