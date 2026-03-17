import { FileSystem } from '@effect/platform'
import { NodeContext, NodeRuntime } from '@effect/platform-node'
import { Array, Console, Effect, Schema, String } from 'effect'

const ChangesetFrontmatter = Schema.Struct({
  package: Schema.String,
  bump: Schema.String,
})

const parseFrontmatter = (
  filename: string,
  content: string,
): Effect.Effect<
  ReadonlyArray<typeof ChangesetFrontmatter.Type>,
  unknown,
  never
> => {
  const lines = content.split('\n')
  const startIndex = lines.indexOf('---')
  const endIndex = lines.indexOf('---', startIndex + 1)

  if (startIndex === -1 || endIndex === -1) {
    return Effect.succeed([])
  }

  const frontmatterLines = lines.slice(startIndex + 1, endIndex)

  return Effect.forEach(frontmatterLines, line => {
    const trimmed = String.trim(line)

    if (String.isNonEmpty(trimmed)) {
      const colonIndex = trimmed.indexOf(':')

      if (colonIndex === -1) {
        return Effect.fail(
          `Invalid frontmatter line in ${filename}: ${trimmed}`,
        )
      }

      const package_ = String.trim(trimmed.slice(0, colonIndex)).replace(
        /^'|'$/g,
        '',
      )
      const bump = String.trim(trimmed.slice(colonIndex + 1))

      return Schema.decodeUnknown(ChangesetFrontmatter)({
        package: package_,
        bump,
      }).pipe(Effect.map(Array.of))
    }

    return Effect.succeed([])
  }).pipe(Effect.map(Array.flatten))
}

const program = Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem
  const entries = yield* fs.readDirectory('.changeset')

  const changesetFiles = Array.filter(entries, entry => entry.endsWith('.md'))
  const changesetFilesWithoutReadme = Array.filter(
    changesetFiles,
    entry => entry !== 'README.md',
  )

  const majorChangesets = yield* Effect.forEach(
    changesetFilesWithoutReadme,
    filename =>
      Effect.gen(function* () {
        const content = yield* fs.readFileString(`.changeset/${filename}`)
        const entries = yield* parseFrontmatter(filename, content)
        const majorEntries = Array.filter(
          entries,
          entry => entry.bump === 'major',
        )

        return Array.map(majorEntries, entry => ({
          filename,
          package: entry.package,
        }))
      }),
  ).pipe(Effect.map(Array.flatten))

  if (Array.isNonEmptyArray(majorChangesets)) {
    yield* Console.error(
      '❌ Major changesets are not allowed pre-v1. Use minor for breaking changes instead.',
    )
    yield* Console.error('')
    yield* Console.error('The following changesets contain major bumps:')
    yield* Effect.forEach(majorChangesets, entry =>
      Console.error(`  - .changeset/${entry.filename} (${entry.package})`),
    )
    yield* Console.error('')
    yield* Console.error(
      'Change the bump level from "major" to "minor" and try again.',
    )
    return yield* Effect.fail('Major changesets are blocked pre-v1.')
  }

  yield* Console.log('No major changesets found.')
})

NodeRuntime.runMain(program.pipe(Effect.provide(NodeContext.layer)))
