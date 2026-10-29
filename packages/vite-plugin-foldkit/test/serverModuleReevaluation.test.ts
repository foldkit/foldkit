import { Option } from 'effect'
import { EventEmitter, once } from 'node:events'
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { type ViteDevServer, createServer as createViteServer } from 'vite'
import { describe, expect, it, onTestFinished, vi } from 'vitest'

import { foldkit } from '../src/index.ts'
import { boundPort } from './boundPort.ts'

const FIXTURE_ROOT = resolve(
  import.meta.dirname,
  'fixtures/ssr-declaration-reevaluation',
)
const packageRootOf = (specifier: string, depth: number): string =>
  resolve(
    dirname(fileURLToPath(import.meta.resolve(specifier))),
    ...globalThis.Array.from({ length: depth }, () => '..'),
  )
const LINKED_PACKAGES = [
  { name: 'foldkit', root: packageRootOf('foldkit', 1) },
  { name: 'effect', root: packageRootOf('effect', 1) },
]
const DEV_SERVER_TEST_TIMEOUT_MS = 20_000

const copyFixtureToTemporaryRoot = (): string => {
  const root = realpathSync(
    mkdtempSync(join(tmpdir(), 'foldkit-ssr-declarations-')),
  )
  onTestFinished(() => rmSync(root, { recursive: true, force: true }))

  cpSync(FIXTURE_ROOT, root, { recursive: true })
  mkdirSync(join(root, 'node_modules'))

  for (const { name, root: packageRoot } of LINKED_PACKAGES) {
    symlinkSync(packageRoot, join(root, 'node_modules', name))
  }

  return root
}

type DevServer = Readonly<{
  origin: string
  server: ViteDevServer
  hotUpdates: EventEmitter
}>

const startServer = async (
  root: string,
  serverOptions: Readonly<{ hmr?: false }> = {},
): Promise<DevServer> => {
  const hotUpdates = new EventEmitter()
  const server = await createViteServer({
    root,
    configFile: false,
    logLevel: 'silent',
    plugins: [
      ...foldkit({
        devToolsMcpPort: false,
        ssr: { serverEntry: '/entry.server.ts' },
      }),
      {
        name: 'test:ssr-hot-update',
        hotUpdate() {
          if (this.environment.name === 'ssr') {
            hotUpdates.emit('update')
          }
        },
      },
    ],
    // NOTE: With the watcher off, the test reports each edit to Vite itself,
    // so it controls when Vite sees each edit.
    server: { host: '127.0.0.1', port: 0, watch: null, ...serverOptions },
  })
  onTestFinished(() => server.close().catch(() => undefined))
  await server.listen()

  const origin = `http://127.0.0.1:${Option.getOrThrowWith(
    boundPort(server.httpServer?.address()),
    () => new Error('The server has no bound port'),
  )}`

  return { origin, server, hotUpdates }
}

// NOTE: Vite invalidates the edited module only after its plugins' async
// `watchChange` hooks settle, so a request sent right after the change event
// can still load the copy from before the edit. The `ssr` environment's
// `hotUpdate` hook runs after that invalidation.
const editFile = async (
  root: string,
  { server, hotUpdates }: DevServer,
  fileName: string,
  source: string,
): Promise<void> => {
  const file = join(root, fileName)
  const handledEdit = once(hotUpdates, 'update')

  writeFileSync(file, source)
  server.watcher.emit('change', file)

  await handledEdit
}

const fixtureSource = (root: string, fileName: string): string =>
  readFileSync(join(root, fileName), 'utf-8')

const render = async (origin: string): Promise<string> => {
  const response = await fetch(`${origin}/`, {
    headers: { accept: 'text/html' },
  })

  return response.text()
}

describe('Block Definition declarations under the SSR dev server', () => {
  it(
    'reevaluates a split Block Definition when HMR is disabled',
    async () => {
      const root = copyFixtureToTemporaryRoot()
      const devServer = await startServer(root, { hmr: false })

      expect(await render(devServer.origin)).toBe('revision 1')

      const file = join(root, 'declarations.ts')
      writeFileSync(
        file,
        fixtureSource(root, 'declarations.ts').replace(
          'revision = 1',
          'revision = 2',
        ),
      )
      devServer.server.watcher.emit('change', file)

      await vi.waitFor(async () => {
        expect(await render(devServer.origin)).toBe('revision 2')
      })
    },
    DEV_SERVER_TEST_TIMEOUT_MS,
  )

  it(
    'renders after an edit to a module that declares against a Block Definition it imports',
    async () => {
      const root = copyFixtureToTemporaryRoot()
      const devServer = await startServer(root)

      expect(await render(devServer.origin)).toBe('revision 1')

      await editFile(
        root,
        devServer,
        'declarations.ts',
        fixtureSource(root, 'declarations.ts').replace(
          'revision = 1',
          'revision = 2',
        ),
      )

      expect(await render(devServer.origin)).toBe('revision 2')
    },
    DEV_SERVER_TEST_TIMEOUT_MS,
  )

  it(
    'renders after an edit that moves a declaration into a module the edited module imports',
    async () => {
      const root = copyFixtureToTemporaryRoot()
      const devServer = await startServer(root)

      expect(await render(devServer.origin)).toBe('revision 1')

      await editFile(
        root,
        devServer,
        'declarations.ts',
        fixtureSource(root, 'declarations.extracted.ts'),
      )

      expect(await render(devServer.origin)).toBe('revision 2')
    },
    DEV_SERVER_TEST_TIMEOUT_MS,
  )

  it(
    'rejects an edit that declares one name twice',
    async () => {
      const root = copyFixtureToTemporaryRoot()
      const devServer = await startServer(root)

      expect(await render(devServer.origin)).toBe('revision 1')

      await editFile(
        root,
        devServer,
        'declarations.ts',
        fixtureSource(root, 'declarations.duplicate.ts'),
      )

      expect(await render(devServer.origin)).toContain(
        String.raw`Block \"Application\" declares Command \"LoadPreferences\" more than once.`,
      )
    },
    DEV_SERVER_TEST_TIMEOUT_MS,
  )
})
