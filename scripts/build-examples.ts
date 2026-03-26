import { Command, FileSystem } from '@effect/platform'
import { NodeContext, NodeRuntime } from '@effect/platform-node'
import { Array, Console, Effect } from 'effect'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { exampleSlugs } from '../packages/website/src/page/example/meta'

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = resolve(SCRIPT_DIR, '..')
const EXAMPLES_DIR = resolve(REPO_ROOT, 'examples')
const OUTPUT_DIR = resolve(
  REPO_ROOT,
  'packages/website/public/example-apps-embed',
)
const BRIDGE_SCRIPT_PATH = resolve(REPO_ROOT, 'scripts/example-bridge.js')
const BRIDGE_SCRIPT_TAG = '<script src="bridge.js"></script></head>'

const buildExample = (slug: string) =>
  Effect.gen(function* () {
    yield* Console.log(`Building example: ${slug}`)
    const fs = yield* FileSystem.FileSystem

    const exampleDir = resolve(EXAMPLES_DIR, slug)
    const outputDir = resolve(OUTPUT_DIR, slug)

    const viteBuild = Command.make(
      'npx',
      'vite',
      'build',
      '--base',
      `/example-apps-embed/${slug}/`,
      '--outDir',
      outputDir,
    ).pipe(Command.workingDirectory(exampleDir))

    yield* Command.exitCode(viteBuild)

    yield* fs.copyFile(BRIDGE_SCRIPT_PATH, resolve(outputDir, 'bridge.js'))

    const htmlPath = resolve(outputDir, 'index.html')
    const htmlExists = yield* fs.exists(htmlPath)

    if (htmlExists) {
      const html = yield* fs.readFileString(htmlPath)
      yield* fs.writeFileString(
        htmlPath,
        html.replace('</head>', BRIDGE_SCRIPT_TAG),
      )
      yield* Console.log('  → injected bridge script')
    }

    yield* Console.log(`  → ${outputDir}`)
  })

const program = Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem

  yield* fs.remove(OUTPUT_DIR, { recursive: true }).pipe(Effect.ignore)
  yield* fs.makeDirectory(OUTPUT_DIR, { recursive: true })

  yield* Effect.forEach(exampleSlugs, buildExample, { concurrency: 1 })

  yield* Console.log('')
  yield* Console.log(
    `Built ${Array.length(exampleSlugs)} examples into ${OUTPUT_DIR}`,
  )
})

NodeRuntime.runMain(program.pipe(Effect.provide(NodeContext.layer)))
