import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    setupFiles: ['tests/helpers/loadEnv.ts'],
    // These are integration tests against a live Supabase project + the
    // real Claude API — real network round trips, not mocked units.
    testTimeout: 60_000,
    hookTimeout: 30_000,
    fileParallelism: false,
    reporters: ['default', 'json'],
    outputFile: { json: 'vitest-report.json' },
  },
})
