import { readdirSync } from 'node:fs'

import { resolveChangedFiles } from './lib/changed-files.mjs'

const MAX_SHARD_COUNT = 10
const SPEC_SUFFIX = '.spec.ts'
const ALL_EXAMPLES_FILES = new Set([
  '.github/workflows/examples-e2e.yml',
  '.npmrc',
  'examples/vite.aliases.ts',
  'package.json',
  'pnpm-lock.yaml',
  'pnpm-workspace.yaml',
  'scripts/lib/changed-files.mjs',
  'scripts/plan-examples-e2e.mjs',
  'tsconfig.base.json',
])
const ALL_EXAMPLES_PREFIXES = [
  'packages/devtools/',
  'packages/foldkit/',
  'packages/markdown/',
  'packages/ui/',
  'packages/vite-plugin-foldkit/',
]

const exampleSlugs = readdirSync('packages/examples-e2e/e2e')
  .filter(fileName => fileName.endsWith(SPEC_SUFFIX))
  .map(fileName => fileName.slice(0, -SPEC_SUFFIX.length))
  .sort()

const { changedFiles, isUnknownDiff } = resolveChangedFiles(
  process.argv.slice(2),
)

const isE2eHarnessFile = changedFiles.some(
  fileName =>
    fileName.startsWith('packages/examples-e2e/') &&
    !(
      fileName.startsWith('packages/examples-e2e/e2e/') &&
      fileName.endsWith(SPEC_SUFFIX)
    ),
)

const isAllExamplesAffected =
  isUnknownDiff ||
  isE2eHarnessFile ||
  changedFiles.some(
    fileName =>
      ALL_EXAMPLES_FILES.has(fileName) ||
      ALL_EXAMPLES_PREFIXES.some(prefix => fileName.startsWith(prefix)),
  )

const affectedExampleSlugs = isAllExamplesAffected
  ? exampleSlugs
  : exampleSlugs.filter(exampleSlug =>
      changedFiles.some(
        fileName =>
          fileName.startsWith(`examples/${exampleSlug}/`) ||
          fileName === `packages/examples-e2e/e2e/${exampleSlug}${SPEC_SUFFIX}`,
      ),
    )

const shardCount = Math.max(
  1,
  Math.min(MAX_SHARD_COUNT, affectedExampleSlugs.length),
)
const shards = Array.from({ length: shardCount }, (_, shardIndex) =>
  affectedExampleSlugs.filter(
    (_, exampleIndex) => exampleIndex % shardCount === shardIndex,
  ),
)
const matrix = {
  include: shards.map((exampleShard, shardIndex) => ({
    shard: shardIndex + 1,
    examples: exampleShard.join(' '),
  })),
}

process.stdout.write(`matrix=${JSON.stringify(matrix)}\n`)
process.stdout.write(`example-count=${affectedExampleSlugs.length}\n`)
