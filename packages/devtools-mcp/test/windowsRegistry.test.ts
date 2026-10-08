import { Effect, Option, pipe } from 'effect'
import type { RelayRecord } from 'foldkit/devtools-protocol'
import { execFileSync } from 'node:child_process'
import { mkdir, readdir, writeFile } from 'node:fs/promises'
import { join, win32 } from 'node:path'
import { createServer } from 'vite'
import { expect, it, onTestFinished } from 'vitest'

import { foldkit } from '@foldkit/vite-plugin'

import {
  discoverRelays,
  makeRelayRegistryReader,
} from '../src/relayRegistry.ts'
import {
  POLL_TIMEOUT,
  listedIds,
  loggedErrors,
  openBrowserRuntime,
  openSession,
  silenceRelayErrors,
  startApplication,
  useWorkspace,
} from './relayFixtures.ts'
import {
  RELAY_DIRECTORY_VARIABLE,
  RUNTIME_DIRECTORY_VARIABLE,
  runWithNode,
} from './relayRegistryFixtures.ts'

const USERS_GROUP_SID = 'S-1-5-32-545'
const SHARED_WITH_OTHER_USERS = 'is readable or writable by other users'
const TEST_TIMEOUT = 30_000

const icaclsPath = (): string =>
  pipe(
    Option.fromNullishOr(process.env['SystemRoot']),
    Option.map(systemRoot => win32.join(systemRoot, 'System32', 'icacls.exe')),
    Option.getOrThrowWith(() => new Error('SystemRoot is not set')),
  )

const workspace = useWorkspace()

it.runIf(process.platform === 'win32')(
  'publishes under the temporary directory and discovers through it',
  async () => {
    delete process.env[RELAY_DIRECTORY_VARIABLE]
    delete process.env[RUNTIME_DIRECTORY_VARIABLE]
    const application = join(workspace.root, 'application')
    const server = await startApplication(application)
    await openBrowserRuntime(server, 'runtime-application')
    const session = await openSession(application)

    await expect
      .poll(() => listedIds(session), { timeout: POLL_TIMEOUT })
      .toStrictEqual(['runtime-application'])
  },
  TEST_TIMEOUT,
)

it.runIf(process.platform === 'win32')(
  'neither publishes to nor reads from a directory other users can read',
  async () => {
    silenceRelayErrors()
    const registryDirectory = join(workspace.root, 'registry')
    const application = join(workspace.root, 'application')
    await mkdir(registryDirectory)
    await mkdir(application)
    execFileSync(icaclsPath(), [
      registryDirectory,
      '/grant',
      `*${USERS_GROUP_SID}:(OI)(CI)RX`,
    ])
    process.env[RELAY_DIRECTORY_VARIABLE] = registryDirectory
    const planted: RelayRecord = {
      version: 1,
      id: 'planted',
      root: application,
      url: 'ws://127.0.0.1:1/__foldkit/devtools-mcp?token=planted',
      pid: process.pid,
      startedAt: 1,
    }
    await writeFile(
      join(registryDirectory, 'planted.json'),
      JSON.stringify(planted),
    )

    const server = await createServer({
      root: application,
      configFile: false,
      logLevel: 'silent',
      server: { port: 0, host: '127.0.0.1' },
      plugins: [foldkit()],
    })
    onTestFinished(() => server.close().catch(() => undefined))
    await server.listen()

    await expect
      .poll(loggedErrors, { timeout: POLL_TIMEOUT })
      .toContainEqual(expect.stringContaining(SHARED_WITH_OTHER_USERS))
    expect(await readdir(registryDirectory)).toStrictEqual(['planted.json'])
    expect(
      await runWithNode(
        Effect.flatMap(makeRelayRegistryReader, registryReader =>
          discoverRelays(application, registryReader),
        ),
      ),
    ).toStrictEqual([])
  },
  TEST_TIMEOUT,
)
