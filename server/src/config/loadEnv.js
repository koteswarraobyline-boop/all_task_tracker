const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

// Resolve server root from this file: server/src/config → server/
const serverRoot = path.resolve(__dirname, '../..');

const candidates = [
  path.join(serverRoot, '.env'),
  path.join(process.cwd(), '.env'),
  path.join(process.cwd(), '../.env'),
];

let envPath = null;
for (const candidate of candidates) {
  if (fs.existsSync(candidate)) {
    envPath = candidate;
    break;
  }
}

if (envPath) {
  dotenv.config({ path: envPath });
  console.log(`Loaded env from ${envPath}`);
} else {
  console.error('');
  console.error('ERROR: No .env file found.');
  console.error(`Expected at: ${path.join(serverRoot, '.env')}`);
  console.error('');
  console.error('Create it on the server (from the server/ folder):');
  console.error('  nano .env');
  console.error('  # or: cp .env.example .env && nano .env');
  console.error('');
  process.exit(1);
}

module.exports = { envPath, serverRoot };
