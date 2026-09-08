import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const server = await import('foldkit/experimental/server')
const runtime = await import('foldkit/runtime')
const umbrella = await import('foldkit/experimental')

const failures = []
const check = (condition, message) => {
  if (!condition) {
    failures.push(message)
  }
}

check(
  typeof server.MissingBuildId === 'function',
  'foldkit/experimental/server does not export MissingBuildId',
)
check(
  typeof server.renderToString === 'function',
  'foldkit/experimental/server does not export renderToString',
)
check(
  typeof umbrella.Server?.MissingBuildId === 'function',
  'foldkit/experimental Server namespace does not expose MissingBuildId',
)
check(
  typeof runtime.hydrate === 'function',
  'foldkit/runtime does not export hydrate',
)

// The build id is settled before the view runs, so this view is never called.
const { Effect } = await import('effect')
const error = await Effect.runPromise(
  Effect.flip(
    server.renderToString({
      init: () => ({ model: {} }),
      view: () => ({ title: 't', body: null }),
    }),
  ),
)
check(
  error._tag === 'MissingBuildId',
  'expected MissingBuildId, got ' + String(error._tag),
)
check(
  error instanceof server.MissingBuildId,
  'the failure is not an instance of the exported MissingBuildId',
)

// HydrateOptions is a type, so it is asserted through the emitted declarations.
const runtimeTypes = readFileSync(
  resolve(process.cwd(), 'node_modules/foldkit/dist/runtime/public.d.ts'),
  'utf8',
)
check(
  runtimeTypes.includes('HydrateOptions'),
  'foldkit/runtime declarations do not export HydrateOptions',
)

if (failures.length > 0) {
  console.error(failures.join('\n'))
  process.exit(1)
}
