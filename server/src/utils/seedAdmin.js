const bcrypt = require('bcryptjs');
const { AdminCredential } = require('../models');

const WEAK_PASSWORDS = new Set(['admin123', 'password', '12345678', 'admin']);

const BLOCKED_JWT_SECRETS = new Set([
  'dev-task-tracker-jwt-secret-local',
  'dev-task-tracker-jwt-secret-change-in-production',
  'dev-task-tracker-secret-change-me',
]);

function validateProductionSecrets() {
  const jwt = process.env.JWT_SECRET || '';
  if (!jwt || BLOCKED_JWT_SECRETS.has(jwt) || jwt.length < 32) {
    console.error(
      'FATAL: Set a strong JWT_SECRET in server/.env for production.\n' +
        'Generate: node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'hex\'))"'
    );
    process.exit(1);
  }

  const clientUrl = process.env.CLIENT_APP_URL || '';
  if (!clientUrl || clientUrl.includes('localhost') || clientUrl.includes('127.0.0.1')) {
    console.error('FATAL: Set CLIENT_APP_URL to your public HTTPS URL in production.');
    process.exit(1);
  }

  const adminPwd = process.env.ADMIN_PASSWORD || '';
  if (WEAK_PASSWORDS.has(adminPwd)) {
    console.error('FATAL: ADMIN_PASSWORD is too weak for production.');
    process.exit(1);
  }
}

async function seedDefaultAdmin() {
  const count = await AdminCredential.count();
  if (count > 0) {
    return;
  }

  const username = process.env.ADMIN_USERNAME || 'admin';
  const password = process.env.ADMIN_PASSWORD || 'admin123';

  if (process.env.NODE_ENV === 'production' && (!password || WEAK_PASSWORDS.has(password))) {
    console.error(
      'FATAL: Set a strong ADMIN_PASSWORD in server/.env before running in production.'
    );
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 10);

  await AdminCredential.create({ username, passwordHash });
  console.log(`Default Super Admin created (username: ${username}).`);
  if (process.env.NODE_ENV !== 'production') {
    console.log('Change ADMIN_PASSWORD before deploying to production.');
  }
}

module.exports = { seedDefaultAdmin, validateProductionSecrets };
