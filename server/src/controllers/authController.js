const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { AdminCredential } = require('../models');
const { JWT_SECRET } = require('../middleware/auth');

async function login(req, res) {
  try {
    const { username, password } = req.body || {};

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const admin = await AdminCredential.findOne({ where: { username } });
    if (!admin) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const valid = await bcrypt.compare(password, admin.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: admin.id, username: admin.username, role: 'superadmin' },
      JWT_SECRET,
      { expiresIn: '12h' }
    );

    return res.json({
      token,
      user: {
        id: admin.id,
        username: admin.username,
        role: 'superadmin',
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function me(req, res) {
  return res.json({
    id: req.admin.id,
    username: req.admin.username,
    role: 'superadmin',
  });
}

module.exports = {
  login,
  me,
};
