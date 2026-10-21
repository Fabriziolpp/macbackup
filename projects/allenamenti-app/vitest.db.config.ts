import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

// Test sul database di produzione con i due utenti di test (mai service role).
// Si eseguono solo in sessione: npm run test:rls / npm run test:db.
const root = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  resolve: { alias: [{ find: /^@\//, replacement: root }] },
  test: {
    environment: 'node',
    include: ['tests/db/**/*.test.ts'],
    setupFiles: ['tests/db/setup.ts'],
    fileParallelism: false,
    testTimeout: 60_000,
    hookTimeout: 60_000,
  },
});
