import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

// Test unit: niente rete, niente database. I test sul DB stanno in vitest.db.config.ts.
const root = fileURLToPath(new URL('.', import.meta.url)); // termina con '/'

export default defineConfig({
  resolve: { alias: [{ find: /^@\//, replacement: root }] },
  test: {
    environment: 'node',
    include: ['lib/**/*.test.ts', 'supabase/functions/**/*.test.ts'],
    passWithNoTests: true,
  },
});
