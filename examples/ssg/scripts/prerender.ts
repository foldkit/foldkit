import { Console, Effect } from 'effect'
import { FileSystem } from 'effect'
import * as Server from 'foldkit/experimental/server'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

import { NodeRuntime, NodeServices } from '@effect/platform-node'

import type * as ServerEntry from '../src/entry.server'

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url))
const EXAMPLE_DIR = resolve(SCRIPT_DIR, '..')
const CLIENT_DIR = resolve(EXAMPLE_DIR, 'dist/client')
const SERVER_ENTRY_PATH = resolve(EXAMPLE_DIR, 'dist/server/entry.server.js')
const SITE_ORIGIN = 'https://example.com'

const loadServerEntry: Effect.Effect<typeof ServerEntry> = Effect.promise(
  () => import(pathToFileURL(SERVER_ENTRY_PATH).href),
)

const outputFileFor = (path: string): string => {
  const url = new URL(path, SITE_ORIGIN)
  if (url.origin !== SITE_ORIGIN || url.pathname !== path) {
    throw new Error(
      `Cannot generate the non-normalized same-origin path "${path}".`,
    )
  }
  return path === '/'
    ? resolve(CLIENT_DIR, 'index.html')
    : resolve(CLIENT_DIR, path.slice(1), 'index.html')
}

const program = Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem
  const template = yield* fs.readFileString(resolve(CLIENT_DIR, 'index.html'))
  const serverEntry = yield* loadServerEntry

  for (const path of serverEntry.prerenderPaths) {
    const result = yield* Effect.promise(() =>
      serverEntry.renderPage(new Request(`${SITE_ORIGIN}${path}`)),
    )
    if (result._tag === 'Responded') {
      return yield* Effect.die(
        new Error(
          `Cannot write the complete Response returned while generating "${path}" to a static HTML file.`,
        ),
      )
    }
    if (result.status !== undefined && result.status !== 200) {
      return yield* Effect.die(
        new Error(
          `Cannot preserve status ${result.status} while generating "${path}" as a static HTML file.`,
        ),
      )
    }
    if (result.headers !== undefined) {
      return yield* Effect.die(
        new Error(
          `Cannot preserve response headers while generating "${path}" as a static HTML file.`,
        ),
      )
    }
    const html = Server.injectIntoTemplate(template, result.application)
    const outputFile = outputFileFor(path)

    yield* fs.makeDirectory(dirname(outputFile), { recursive: true })
    yield* fs.writeFileString(outputFile, html)
    yield* Console.log(`Generated ${path}`)
  }
}).pipe(Effect.provide(NodeServices.layer))

NodeRuntime.runMain(program)
