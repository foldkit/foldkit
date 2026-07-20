import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Copies the built dists into `foldkit-dev` / `foldkit-dev-optimised` slots
 * in a lustre-labs/benchmark clone, so the local loop is:
 *
 *   pnpm build
 *   HARNESS_DIR=~/dev/lustre-benchmark pnpm bench:install
 *   HARNESS_DIR=~/dev/lustre-benchmark pnpm bench:run
 *
 * The -dev slot names keep local iterations separate from the versioned
 * slots the harness UI registers via its index.html.
 */

const packageDir = join(dirname(fileURLToPath(import.meta.url)), '..')

const harnessDir = process.env.HARNESS_DIR
if (!harnessDir) {
  console.error(
    'HARNESS_DIR is required: path to a lustre-labs/benchmark clone',
  )
  process.exit(1)
}
if (!existsSync(join(harnessDir, 'priv/implementations'))) {
  console.error(
    `${harnessDir} is not a lustre-labs/benchmark clone: missing priv/implementations`,
  )
  process.exit(1)
}

const slots = [
  { source: join(packageDir, 'dist/naive'), slot: 'foldkit-dev' },
  { source: join(packageDir, 'dist/optimised'), slot: 'foldkit-dev-optimised' },
]

for (const { source, slot } of slots) {
  if (!existsSync(source)) {
    console.error(`missing ${source}; run \`pnpm build\` first`)
    process.exit(1)
  }
  const target = join(harnessDir, 'priv/implementations', slot, 'dist')
  rmSync(target, { recursive: true, force: true })
  mkdirSync(target, { recursive: true })
  cpSync(source, target, { recursive: true })
  console.log(`installed ${slot}`)
}
