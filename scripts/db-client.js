const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

function loadEnv() {
  const envPath = path.resolve(__dirname, '..', '.env.local');
  if (!fs.existsSync(envPath)) {
    throw new Error('.env.local não encontrado. Crie o arquivo com DB_HOST, DB_PORT, DB_NAME, DB_USER e DB_PASSWORD.');
  }
  const lines = fs.readFileSync(envPath, 'utf8').trim().split(/\r?\n/);
  for (const line of lines) {
    if (!line || line.startsWith('#')) continue;
    const idx = line.indexOf('=');
    if (idx < 0) continue;
    const key = line.slice(0, idx).trim();
    const val = line.slice(idx + 1).trim();
    if (!process.env[key]) process.env[key] = val;
  }
}

function createDbClient() {
  loadEnv();

  const host = process.env.DB_HOST;
  const port = parseInt(process.env.DB_PORT || '6543', 10);
  const database = process.env.DB_NAME || 'postgres';
  const user = process.env.DB_USER;
  const password = process.env.DB_PASSWORD;

  if (!host || !user || !password) {
    throw new Error(
      'Variáveis de banco ausentes. Adicione ao .env.local:\n' +
      '  DB_HOST=aws-1-sa-east-1.pooler.supabase.com\n' +
      '  DB_PORT=6543\n' +
      '  DB_NAME=postgres\n' +
      '  DB_USER=postgres.xxx\n' +
      '  DB_PASSWORD=sua-senha'
    );
  }

  return new Client({ host, port, database, user, password, ssl: { rejectUnauthorized: false } });
}

module.exports = { createDbClient };
