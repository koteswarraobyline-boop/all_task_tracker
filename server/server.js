const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
require('./src/config/loadEnv');

const { sequelize, ensureDatabaseExists, dbConfig } = require('./src/config/database');
const { seedDefaultAdmin } = require('./src/utils/seedAdmin');
const { ensureTaskSchema } = require('./src/utils/ensureTaskSchema');
const projectRoutes = require('./src/routes/projectRoutes');
const taskRoutes = require('./src/routes/taskRoutes');
const developerRoutes = require('./src/routes/developerRoutes');
const dashboardRoutes = require('./src/routes/dashboardRoutes');
const authRoutes = require('./src/routes/authRoutes');
const clientAccessRoutes = require('./src/routes/clientAccessRoutes');

// Ensure models & associations are registered before sync
require('./src/models');

const app = express();
const PORT = Number(process.env.PORT) || 5000;
const HOST = process.env.HOST || '0.0.0.0';
const isProd = process.env.NODE_ENV === 'production';

const clientDist =
  process.env.CLIENT_DIST_PATH ||
  path.resolve(__dirname, '../client/dist');

// Required behind Apache/LiteSpeed reverse proxy (correct client IP + rate limits)
app.set('trust proxy', Number(process.env.TRUST_PROXY) || 1);

if (isProd) {
  const jwt = process.env.JWT_SECRET || '';
  if (!jwt || jwt.includes('change') || jwt.includes('dev-task-tracker')) {
    console.warn(
      'WARNING: JWT_SECRET looks weak or unset. Set a long random secret in server/.env before going public.'
    );
  }
  if (!process.env.CLIENT_APP_URL || process.env.CLIENT_APP_URL.includes('localhost')) {
    console.warn(
      'WARNING: CLIENT_APP_URL should be your public HTTPS URL (used in share links).'
    );
  }
}

const defaultDevOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:3000',
  'http://localhost:5004',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
];

const envOrigins = (process.env.CORS_ORIGINS || process.env.CLIENT_APP_URL || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

const allowedOrigins = [...new Set([...envOrigins, ...defaultDevOrigins])];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin) || process.env.NODE_ENV !== 'production') {
        callback(null, true);
      } else {
        callback(null, false);
      }
    },
    credentials: true,
  })
);
app.use(express.json({ limit: process.env.JSON_BODY_LIMIT || '2mb' }));
app.use(express.urlencoded({ extended: true, limit: process.env.JSON_BODY_LIMIT || '2mb' }));

app.get('/api/health', async (req, res) => {
  let database = 'disconnected';
  try {
    await sequelize.authenticate();
    database = 'connected';
  } catch (err) {
    return res.status(503).json({
      ok: false,
      service: 'task-tracker-api',
      database,
      env: isProd ? 'production' : process.env.NODE_ENV || 'development',
      uptime: Math.floor(process.uptime()),
      error: 'Database unavailable',
    });
  }

  res.json({
    ok: true,
    service: 'task-tracker-api',
    database,
    env: isProd ? 'production' : process.env.NODE_ENV || 'development',
    uptime: Math.floor(process.uptime()),
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api', taskRoutes);
app.use('/api/developers', developerRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api', clientAccessRoutes);

// Serve built React app (same domain as API) when dist exists
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(clientDist, 'index.html'), (err) => {
      if (err) next(err);
    });
  });
  console.log(`Serving frontend from ${clientDist}`);
} else {
  console.warn(`Frontend dist not found at ${clientDist} (API-only mode)`);
}

app.use((err, req, res, next) => {
  console.error('Express Error Handler:', err);
  res.status(err.status || 500).json({
    error: err.message || 'An unexpected error occurred',
  });
});

async function startServer() {
  try {
    console.log(
      `Connecting to MySQL as ${dbConfig.user}@${dbConfig.host}:${dbConfig.port}/${dbConfig.name}`
    );

    await ensureDatabaseExists();
    await sequelize.authenticate();
    console.log('Database connection has been established successfully.');

    const syncOptions = process.env.DB_SYNC_ALTER === 'true' ? { alter: true } : {};
    await sequelize.sync(syncOptions);
    console.log('Database models synchronized successfully.');

    await ensureTaskSchema();
    console.log('Task schema columns verified.');

    await seedDefaultAdmin();

    const server = app.listen(PORT, HOST, () => {
      console.log(`Server is running on http://${HOST}:${PORT}`);
      // Signal PM2 that the app is ready (when wait_ready is enabled)
      if (typeof process.send === 'function') {
        process.send('ready');
      }
    });

    const shutdown = async (signal) => {
      console.log(`${signal} received — shutting down…`);
      server.close(async () => {
        try {
          await sequelize.close();
        } catch (err) {
          console.error('Error closing database:', err);
        }
        process.exit(0);
      });
      setTimeout(() => process.exit(1), 10000).unref();
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  } catch (error) {
    console.error('Unable to start the server:', error);
    process.exit(1);
  }
}

startServer();
