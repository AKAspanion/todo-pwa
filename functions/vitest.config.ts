import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'scripts/**/*.test.ts'],
    // The test files share one Firestore emulator and clear it before each test, so they run one
    // file at a time. `npm run test` starts the emulator and sets FIRESTORE_EMULATOR_HOST.
    fileParallelism: false,
    testTimeout: 20_000,
    hookTimeout: 20_000,
  },
});
