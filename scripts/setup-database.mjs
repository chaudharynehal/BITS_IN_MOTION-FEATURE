import { ensureDatabase } from '../server/db.js';

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is required. Copy .env.example to .env.local and provide the Neon connection string.');
  process.exitCode = 1;
} else {
  await ensureDatabase();
  console.log('BITS in Motion database schema and exercise catalogue are ready.');
}
