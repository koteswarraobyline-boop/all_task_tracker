const { sequelize } = require('../config/database');

/**
 * Additive columns for WBS / Lumo-inspired features (safe on repeated starts).
 */
async function ensureWbsSchema() {
  const developerAlters = [
    { name: 'allocation', sql: 'ADD COLUMN `allocation` INT NOT NULL DEFAULT 100' },
  ];

  const projectAlters = [
    {
      name: 'edit_unlock_password',
      sql: 'ADD COLUMN `edit_unlock_password` VARCHAR(255) NULL',
    },
  ];

  for (const { name, sql } of developerAlters) {
    try {
      await sequelize.query(`ALTER TABLE \`developers\` ${sql}`);
      console.log(`Added developers.${name} column`);
    } catch (err) {
      const msg = String(err.message || '');
      if (/duplicate column|already exists/i.test(msg)) continue;
      if (/unknown table|doesn't exist/i.test(msg)) continue;
      console.warn(`Could not add developers.${name}: ${msg}`);
    }
  }

  for (const { name, sql } of projectAlters) {
    try {
      await sequelize.query(`ALTER TABLE \`projects\` ${sql}`);
      console.log(`Added projects.${name} column`);
    } catch (err) {
      const msg = String(err.message || '');
      if (/duplicate column|already exists/i.test(msg)) continue;
      if (/unknown table|doesn't exist/i.test(msg)) continue;
      console.warn(`Could not add projects.${name}: ${msg}`);
    }
  }

  try {
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS \`review_links\` (
        \`id\` INT NOT NULL AUTO_INCREMENT,
        \`project_id\` INT NOT NULL,
        \`node_id\` INT NOT NULL,
        \`label\` VARCHAR(255) NOT NULL DEFAULT 'Review link',
        \`url\` TEXT NOT NULL,
        \`username\` VARCHAR(255) NULL,
        \`site_password\` VARCHAR(255) NULL,
        \`note\` TEXT NULL,
        \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`),
        KEY \`review_links_project_id\` (\`project_id\`),
        KEY \`review_links_node_id\` (\`node_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
  } catch (err) {
    console.warn(`Could not ensure review_links table: ${err.message}`);
  }
}

module.exports = { ensureWbsSchema };
