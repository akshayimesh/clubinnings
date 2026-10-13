import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const backendDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

/** Brings the test database schema up to date before any test file runs. */
export default function setup() {
  try {
    execFileSync(process.execPath, ['scripts/migrate.mjs', 'up', '--test'], { cwd: backendDir, stdio: 'pipe' });
  } catch (err) {
    const output = (err as { stderr?: Buffer; stdout?: Buffer }).stderr?.toString() ?? '';
    throw new Error(
      `Could not migrate the test database. Is Postgres running (make db-up) and TEST_DATABASE_URL set?\n${output}`,
    );
  }
}
