// The tests of firestore.rules (test/rules/), which need the Firestore emulator: `npm run test:rules`.
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: { include: ['test/rules/**/*.test.ts'], environment: 'node', testTimeout: 20_000, hookTimeout: 30_000 },
});
