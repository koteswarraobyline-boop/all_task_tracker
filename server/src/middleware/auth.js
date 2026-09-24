const jwt = require('jsonwebtoken');

const isProd = process.env.NODE_ENV === 'production';
const DEV_FALLBACK = 'dev-task-tracker-secret-change-me';
const JWT_SECRET = process.env.JWT_SECRET || (isProd ? null : DEV_FALLBACK);

const BLOCKED_JWT_SECRETS = new Set([
  'dev-task-tracker-jwt-secret-local',
  'dev-task-tracker-jwt-secret-change-in-production',
  'dev-task-tracker-secret-change-me',
]);

if (!JWT_SECRET) {
  console.error('FATAL: JWT_SECRET is required when NODE_ENV=production. Set it in server/.env');
  process.exit(1);
}

if (isProd && (BLOCKED_JWT_SECRETS.has(JWT_SECRET) || JWT_SECRET.length < 32)) {
  console.error(
    'FATAL: JWT_SECRET must be a strong random string (32+ chars) in production.\n' +
      'Generate one on the server:\n' +
      '  node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'hex\'))"\n' +
      'Then set JWT_SECRET=... in server/.env (do not use dev-task-tracker defaults).'
  );
  process.exit(1);
}

function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.admin = { id: payload.id, username: payload.username };
    return next();
  } catch {
    return res.status(401).json({ error: 'Unauthorized' });
  }
}

module.exports = {
  authMiddleware,
  JWT_SECRET,
};
