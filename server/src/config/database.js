const { Sequelize } = require('sequelize');
require('./loadEnv');

const dbHost = process.env.DB_HOST || 'localhost';
const dbPort = Number(process.env.DB_PORT) || 3306;
const dbUser = process.env.DB_USER || 'root';
const dbPass = process.env.DB_PASS || '';
const dbName = process.env.DB_NAME || 'dev_task_tracker';

if (!process.env.DB_USER || process.env.DB_PASS === undefined) {
  console.warn(
    'DB credentials missing from env. Using defaults (user=%s). Check server/.env.',
    dbUser
  );
}

// Ensure the database exists before connecting (may fail on shared hosts without CREATE privilege)
async function ensureDatabaseExists() {
  const mysql = require('mysql2/promise');
  try {
    const connection = await mysql.createConnection({
      host: dbHost,
      port: dbPort,
      user: dbUser,
      password: dbPass,
      connectTimeout: 10000,
    });
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\`;`);
    await connection.end();
    console.log(`Database '${dbName}' verified or created successfully.`);
  } catch (error) {
    // Shared hosting often forbids CREATE DATABASE; continue if the DB already exists
    console.warn(
      `Could not verify/create database (continuing anyway): ${error.message}`
    );
  }
}

const sequelize = new Sequelize(dbName, dbUser, dbPass, {
  host: dbHost,
  port: dbPort,
  dialect: 'mysql',
  logging: false,
  dialectOptions: {
    connectTimeout: 10000,
  },
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000,
  },
  define: {
    timestamps: true,
    underscored: true,
  },
});

module.exports = {
  sequelize,
  ensureDatabaseExists,
  dbConfig: { host: dbHost, port: dbPort, user: dbUser, name: dbName },
};
