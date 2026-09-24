#!/usr/bin/env node
/** Print a random JWT secret for server/.env — run: node scripts/generate-jwt-secret.js */
console.log(require('crypto').randomBytes(48).toString('hex'));
