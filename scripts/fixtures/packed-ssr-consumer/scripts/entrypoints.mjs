import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const server = await import('foldkit/experimental/server')
const program = await import('foldkit/program')
const block = await import('foldkit/block')
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
  typeof program.make === 'function' &&
    typeof program.makeElement === 'function',
  'foldkit/program does not export make and makeElement',
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
const ApplicationComposition = block
  .makeDefinition('Application', { Model, Message })
  .makeComposition()
const ApplicationBlock = block.assemble(() =>
  ApplicationComposition.prepareBlock({
    init: ApplicationComposition.makeInit(() => ({ model: Model.make({}) })),
    update: ApplicationComposition.makeUpdate({
      IgnoredRender: model => ({ model }),
    }),
    view: ApplicationComposition.makeView(() => ({ title: 't', body: null })),
  }),
)
const error = await Effect.runPromise(
  Effect.flip(server.renderToString(ApplicationBlock, {}, {})),
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
