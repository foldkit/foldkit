import { Command, FileSystem } from '@effect/platform'
import { NodeContext, NodeRuntime } from '@effect/platform-node'
import { Array, Console, Effect, Schema } from 'effect'

const PUBLISHABLE_PACKAGES = [
  'foldkit',
  'create-foldkit-app',
  '@foldkit/vite-plugin',
]

const ChangesetConfig = Schema.parseJson(
  Schema.Struct({
    ignore: Schema.Array(Schema.String),
  }),
)

const PnpmListEntry = Schema.Struct({ name: Schema.String })

const listWorkspacePackages = Effect.gen(function* () {
  const command = Command.make('pnpm', 'ls', '-r', '--depth', '-1', '--json')

  const output = yield* Command.string(command)
  const entries = yield* Schema.decodeUnknown(Schema.Array(PnpmListEntry))(
    JSON.parse(output),
  )

  return Array.map(entries, entry => entry.name)
})

const readIgnoreList = Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem
  const raw = yield* fs.readFileString('.changeset/config.json')
  const config = yield* Schema.decodeUnknown(ChangesetConfig)(raw)
  return config.ignore
})

const program = Effect.gen(function* () {
  const workspacePackages = yield* listWorkspacePackages
  const ignoreList = yield* readIgnoreList

  const missing = Array.filter(
    workspacePackages,
    name =>
      !Array.contains(PUBLISHABLE_PACKAGES, name) &&
      !Array.contains(ignoreList, name) &&
      name !== 'foldkit-monorepo',
  )

  if (Array.isNonEmptyArray(missing)) {
    yield* Console.error(
      'ERROR: The following packages are missing from .changeset/config.json ignore list:',
    )
    yield* Effect.forEach(missing, name => Console.error(`  - ${name}`))
    yield* Console.error('')
    yield* Console.error(
      'Add them to .changeset/config.json or to PUBLISHABLE_PACKAGES in this script.',
    )
    return yield* Effect.fail('Changeset ignore list is out of date.')
  }

  yield* Console.log('Changeset ignore list is up to date.')
})

NodeRuntime.runMain(program.pipe(Effect.provide(NodeContext.layer)))
