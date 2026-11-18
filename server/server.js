const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('./src/config/loadEnv');

const { sequelize, ensureDatabaseExists, dbConfig } = require('./src/config/database');
const { seedDefaultAdmin, validateProductionSecrets } = require('./src/utils/seedAdmin');
const { ensureTaskSchema } = require('./src/utils/ensureTaskSchema');
const { ensureDeveloperSchema } = require('./src/utils/ensureDeveloperSchema');
const { ensureWbsSchema } = require('./src/utils/ensureWbsSchema');
const projectRoutes = require('./src/routes/projectRoutes');
const taskRoutes = require('./src/routes/taskRoutes');
const developerRoutes = require('./src/routes/developerRoutes');
const dashboardRoutes = require('./src/routes/dashboardRoutes');
const authRoutes = require('./src/routes/authRoutes');
const clientAccessRoutes = require('./src/routes/clientAccessRoutes');

require('./src/models');

const app = express();
const PORT = Number(process.env.PORT) || 5004;
const HOST = process.env.HOST || '0.0.0.0';
const isProd = process.env.NODE_ENV === 'production';

const clientDist =
  process.env.CLIENT_DIST_PATH ||
  path.resolve(__dirname, '../client/dist');

app.set('trust proxy', Number(process.env.TRUST_PROXY) || 1);

if (isProd) {
  validateProductionSecrets();
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

/** Production: only configured origins. Dev: env + localhost defaults. */
const allowedOrigins = isProd
  ? [...new Set(envOrigins)]
  : [...new Set([...envOrigins, ...defaultDevOrigins])];

if (isProd && allowedOrigins.length === 0) {
  console.error('FATAL: Set CORS_ORIGINS or CLIENT_APP_URL in production.');
  process.exit(1);
}

app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  })
);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) {
        callback(null, true);
        return;
      }
      if (!isProd || allowedOrigins.includes(origin)) {
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
  } catch {
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

app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Not found' });
});

if (fs.existsSync(clientDist)) {
  app.use(
    express.static(clientDist, {
      maxAge: isProd ? '7d' : 0,
      index: false,
    })
  );
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(clientDist, 'index.html'), (err) => {
      if (err) next(err);
    });
  });
  console.log(`Serving frontend from ${clientDist}`);
} else if (isProd) {
  console.warn(`WARNING: Frontend dist not found at ${clientDist}. Build client before deploy.`);
} else {
  console.warn(`Frontend dist not found at ${clientDist} (API-only mode)`);
}

app.use((err, req, res, next) => {
  console.error('Express Error Handler:', err);
  const status = err.status || 500;
  const message =
    isProd && status >= 500
      ? 'An unexpected error occurred'
      : err.message || 'An unexpected error occurred';
  res.status(status).json({ error: message });
});

function listenHttp() {
  return new Promise((resolve, reject) => {
    const server = app.listen(PORT, HOST, () => {
      console.log(
        `Server is running on http://${HOST}:${PORT} (${isProd ? 'production' : 'development'})`
      );
      if (typeof process.send === 'function') {
        process.send('ready');
      }
      resolve(server);
    });
    server.on('error', reject);
  });
}

async function initDatabase() {
  if (isProd && process.env.DB_SYNC_ALTER === 'true') {
    console.warn(
      'WARNING: DB_SYNC_ALTER=true in production can alter live tables. Prefer migrations.'
    );
  }

  console.log(
    `Connecting to MySQL as ${dbConfig.user}@${dbConfig.host}:${dbConfig.port}/${dbConfig.name}`
  );

  await ensureDatabaseExists();
  await sequelize.authenticate();
  console.log('Database connection has been established successfully.');

  const syncOptions = !isProd && process.env.DB_SYNC_ALTER === 'true' ? { alter: true } : {};
  await sequelize.sync(syncOptions);
  console.log('Database models synchronized successfully.');

  await ensureTaskSchema();
  console.log('Task schema columns verified.');

  await ensureDeveloperSchema();
  console.log('Developer schema columns verified.');

  await ensureWbsSchema();
  console.log('WBS schema columns verified.');

  await seedDefaultAdmin();
}

/**
 * Listen first, then connect DB (with retries).
 * Why: if process exits on DB failure, LiteSpeed returns HTML 503 and login breaks.
 * Keeping HTTP up lets /api/health report JSON and PM2/host keep the process alive.
 */
async function startServer() {
  let server;
  try {
    server = await listenHttp();
  } catch (error) {
    console.error(`Unable to bind HTTP on ${HOST}:${PORT}:`, error);
    process.exit(1);
  }

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

  const maxAttempts = Number(process.env.DB_CONNECT_RETRIES) || (isProd ? 10 : 3);
  const delayMs = Number(process.env.DB_CONNECT_RETRY_MS) || 3000;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      await initDatabase();
      return;
    } catch (error) {
      console.error(`Database init failed (attempt ${attempt}/${maxAttempts}):`, error.message || error);
      if (attempt < maxAttempts) {
        await new Promise((r) => setTimeout(r, delayMs));
      }
    }
  }

  console.error(
    'Database still unavailable after retries. HTTP stays up; /api/health will return 503 until MySQL works.'
  );
}

process.on('uncaughtException', (err) => {
  console.error('uncaughtException:', err);
  if (isProd) process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('unhandledRejection:', reason);
  if (isProd) process.exit(1);
});

startServer();
