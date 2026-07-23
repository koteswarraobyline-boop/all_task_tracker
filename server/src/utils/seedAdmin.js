const bcrypt = require('bcryptjs');
const { AdminCredential } = require('../models');

async function seedDefaultAdmin() {
  const count = await AdminCredential.count();
  if (count > 0) {
    return;
  }

  const username = process.env.ADMIN_USERNAME || 'admin';
  const password = process.env.ADMIN_PASSWORD || 'admin123';
  const passwordHash = await bcrypt.hash(password, 10);

  await AdminCredential.create({ username, passwordHash });
  console.log(`Default Super Admin created (username: ${username}). Change the password in production.`);
}

module.exports = { seedDefaultAdmin };
