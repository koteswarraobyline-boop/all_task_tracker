/**
 * PM2 process config — keeps the API alive and restarts on crash/reboot.
 *
 * Local / VPS:
 *   cd server
 *   npm i -g pm2
 *   pm2 start ecosystem.config.cjs
 *   pm2 save
 *   pm2 startup
 *
 * Shared cPanel/LiteSpeed Node selector: use the host panel "Restart"
 * and keep Application status = Running (PM2 may not be available there).
 */
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
      max_memory_restart: '512M',
      min_uptime: '10s',
      max_restarts: 20,
      restart_delay: 3000,
      exp_backoff_restart_delay: 1000,
      kill_timeout: 10000,
      listen_timeout: 15000,
      wait_ready: true,
      env: {
        NODE_ENV: 'production',
      },
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      merge_logs: true,
      time: true,
    },
  ],
};
