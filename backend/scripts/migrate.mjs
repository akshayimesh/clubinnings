// Runs node-pg-migrate against DATABASE_URL (or TEST_DATABASE_URL with --test),
// loading variables from the repo-root .env so the CLI matches the app config.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { runner } from 'node-pg-migrate';

const here = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(here, '../../.env'), quiet: true });

const args = process.argv.slice(2);
const direction = args.includes('down') ? 'down' : 'up';
const useTest = args.includes('--test');
const databaseUrl = useTest ? process.env.TEST_DATABASE_URL : process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error(`${useTest ? 'TEST_DATABASE_URL' : 'DATABASE_URL'} is not set (see .env.example)`);
  process.exit(1);
}

try {
  await runner({
    databaseUrl,
    dir: path.resolve(here, '../migrations'),
    migrationsTable: 'pgmigrations',
    direction,
    count: direction === 'down' ? 1 : Infinity,
    singleTransaction: true,
  });
} catch (err) {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
}
