import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    globalSetup: ['tests/setup/globalSetup.ts'],
    env: {
      NODE_ENV: 'test',
      // Keep hashing fast in tests; production cost comes from BCRYPT_ROUNDS.
      BCRYPT_ROUNDS: '4',
    },
    // Integration tests share one database, so run files sequentially.
    fileParallelism: false,
    testTimeout: 15_000,
  },
});
