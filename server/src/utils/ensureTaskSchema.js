const { sequelize } = require('../config/database');

/**
 * Add flexible CSV columns if missing (safe on shared hosting / repeated starts).
 */
async function ensureTaskSchema() {
  const alters = [
    { name: 'parent_id', sql: "ADD COLUMN `parent_id` VARCHAR(255) NULL" },
    { name: 'record_type', sql: "ADD COLUMN `record_type` VARCHAR(32) NULL DEFAULT 'task'" },
    { name: 'tags', sql: "ADD COLUMN `tags` VARCHAR(512) NULL" },
    { name: 'progress_percent', sql: "ADD COLUMN `progress_percent` DECIMAL(5,2) NULL" },
    { name: 'custom_fields', sql: "ADD COLUMN `custom_fields` TEXT NULL" },
  ];

  const projectAlters = [
    { name: 'original_delivery_date', sql: "ADD COLUMN `original_delivery_date` VARCHAR(32) NULL" },
    { name: 'revised_delivery_date', sql: "ADD COLUMN `revised_delivery_date` VARCHAR(32) NULL" },
    { name: 'target_delivery_date', sql: "ADD COLUMN `target_delivery_date` VARCHAR(32) NULL" },
    { name: 'delivery_notes', sql: "ADD COLUMN `delivery_notes` TEXT NULL" },
  ];

  for (const { name, sql } of alters) {
    try {
      await sequelize.query(`ALTER TABLE \`tasks\` ${sql}`);
      console.log(`Added tasks.${name} column`);
    } catch (err) {
      const msg = String(err.message || '');
      if (/duplicate column|already exists/i.test(msg)) {
        continue;
      }
      if (/unknown table|doesn't exist/i.test(msg)) {
        continue;
      }
      console.warn(`Could not add tasks.${name}: ${msg}`);
    }
  }

  for (const { name, sql } of projectAlters) {
    try {
      await sequelize.query(`ALTER TABLE \`projects\` ${sql}`);
      console.log(`Added projects.${name} column`);
    } catch (err) {
      const msg = String(err.message || '');
      if (/duplicate column|already exists/i.test(msg)) {
        continue;
      }
      if (/unknown table|doesn't exist/i.test(msg)) {
        continue;
      }
      console.warn(`Could not add projects.${name}: ${msg}`);
    }
  }
}

module.exports = { ensureTaskSchema };
