import { fileURLToPath } from 'node:url'

// Loads tests/.env.test if present (local runs); in CI, real secrets are
// injected as actual environment variables instead, so a missing file here
// is not an error.
try {
  const path = fileURLToPath(new URL('../.env.test', import.meta.url))
  // @ts-expect-error -- process.loadEnvFile is Node 20.12+, not yet in @types/node's older lib defs
  process.loadEnvFile(path)
} catch {
  // no .env.test — assume CI secrets are already in process.env
}
