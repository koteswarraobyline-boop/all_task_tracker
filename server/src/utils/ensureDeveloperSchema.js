const { sequelize } = require('../config/database');

/**
 * Add developer profile columns if missing (safe on repeated starts).
 */
async function ensureDeveloperSchema() {
  const alters = [
    { name: 'role', sql: "ADD COLUMN `role` VARCHAR(128) NULL" },
    { name: 'team', sql: "ADD COLUMN `team` VARCHAR(128) NULL" },
    { name: 'status', sql: "ADD COLUMN `status` VARCHAR(32) NOT NULL DEFAULT 'Active'" },
    { name: 'skills', sql: "ADD COLUMN `skills` VARCHAR(512) NULL" },
  ];

  for (const { name, sql } of alters) {
    try {
      await sequelize.query(`ALTER TABLE \`developers\` ${sql}`);
      console.log(`Added developers.${name} column`);
    } catch (err) {
      const msg = String(err.message || '');
      if (/duplicate column|already exists/i.test(msg)) {
        continue;
      }
      if (/unknown table|doesn't exist/i.test(msg)) {
        continue;
      }
      console.warn(`Could not add developers.${name}: ${msg}`);
    }
  }
}

module.exports = { ensureDeveloperSchema };
