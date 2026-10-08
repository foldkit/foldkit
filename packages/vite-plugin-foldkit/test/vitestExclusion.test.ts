import { readdir } from 'node:fs/promises'
import {
  type Plugin,
  type ServerOptions,
  type UserConfig,
  createServer,
} from 'vite'
import { describe, expect, it, onTestFinished } from 'vitest'

import { type FoldkitPluginOptions, foldkit } from '../src/index.ts'
import {
  findFreePort,
  isListenAttemptedOn,
  loggedLines,
  useRelayRegistry,
} from './relayFixtures.ts'

const SETTLE = 500

const directories = useRelayRegistry()

const vitestRuns: ReadonlyArray<
  Readonly<{
    name: string
    config: UserConfig
    plugins: ReadonlyArray<Plugin>
  }>
> = [
  { name: 'test mode', config: { mode: 'test' }, plugins: [] },
  {
    name: 'a Vitest plugin in another mode',
    config: { mode: 'development' },
    plugins: [{ name: 'vitest' }],
  },
]

const servers: ReadonlyArray<
  Readonly<{ name: string; server: ServerOptions; isListening: boolean }>
> = [
  {
    name: 'a listening server',
    server: { port: 0, host: '127.0.0.1' },
    isListening: true,
  },
  {
    name: 'a middleware-mode server',
    server: { middlewareMode: true },
    isListening: false,
  },
]

const settle = () => new Promise<void>(done => setTimeout(done, SETTLE))

describe.each(vitestRuns)('under $name', ({ config, plugins }) => {
  describe.each(servers)(
    'with $name',
    ({ server: serverOptions, isListening }) => {
      const startServer = async (options: FoldkitPluginOptions) => {
        const server = await createServer({
          ...config,
          root: directories.root,
          configFile: false,
          logLevel: 'silent',
          server: serverOptions,
          plugins: [...plugins, foldkit(options)],
        })
        onTestFinished(() => server.close().catch(() => undefined))
        if (isListening) {
          await server.listen()
        }
        return server
      }

      const relayLines = () =>
        loggedLines(console.log).filter(line => line.includes('MCP relay'))

      const relayErrorLines = () =>
        loggedLines(console.error).filter(line =>
          line.includes('[foldkit:devTools]'),
        )

      it('starts no relay by default', async () => {
        const server = await startServer({})
        await settle()

        expect(await readdir(directories.registry)).toStrictEqual([])
        expect(relayLines()).toStrictEqual([])
        expect(relayErrorLines()).toStrictEqual([])
        if (isListening) {
          expect(server.httpServer?.listenerCount('upgrade')).toBe(1)
        }
      })

      it('starts no relay on a configured port', async () => {
        const port = await findFreePort()
        const server = await startServer({ devToolsMcpPort: port })
        await settle()

        expect(isListenAttemptedOn(port)).toBe(false)
        expect(await readdir(directories.registry)).toStrictEqual([])
        expect(relayLines()).toStrictEqual([])
        expect(relayErrorLines()).toStrictEqual([])
        if (isListening) {
          expect(server.httpServer?.listenerCount('upgrade')).toBe(1)
        }
      })
    },
  )
})
