import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const server = await import('foldkit/experimental/server')
const application = await import('foldkit/application')
const message = await import('foldkit/message')
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
  typeof application.define === 'function',
  'foldkit/application does not export define',
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
const { Effect, Schema } = await import('effect')
const Model = Schema.Struct({})
const Message = message.defineMessageUnion({ IgnoredRender: {} })
const Application = application.define({ Model, Message })
const ApplicationComposition = Application.makeComposition()
const error = await Effect.runPromise(
  Effect.flip(
    server.renderToString(
      ApplicationComposition,
      {
        init: () => ({ model: Model.make({}) }),
        update: model => ({ model }),
        view: () => ({ title: 't', body: null }),
      },
      {},
    ),
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
