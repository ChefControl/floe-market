// The tests of firestore.rules (test/rules/), which need the Firestore emulator: `npm run test:rules`. The files run
// one at a time: they share the emulator's one database and each clears it before every test, so side by side one
// file's clearing could wipe what another's test had just written (a worse bet's first write, gone before the check
// that a smaller one is turned away).
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: { include: ['test/rules/**/*.test.ts'], environment: 'node', testTimeout: 20_000, hookTimeout: 30_000, fileParallelism: false },
});
