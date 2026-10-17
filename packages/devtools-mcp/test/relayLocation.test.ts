import { ConfigProvider, Effect, Option } from 'effect'
import type { RelayRecord } from 'foldkit/devtools-protocol'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import {
  type Settings,
  loadSettings,
  resolveRelayTargets,
} from '../src/relayLocation.ts'
import {
  RELAY_DIRECTORY_VARIABLE,
  makeUncheckedRegistryReader,
  runWithNode,
} from './relayRegistryFixtures.ts'

const PROJECT_ROOT = '/workspace/app'
const PRIVATE_DIRECTORY_MODE = 0o700
const RELAY_TOKEN = 'a'.repeat(64)

const settings = (overrides: Partial<Settings> = {}): Settings => ({
  maybeConfiguredPort: Option.none(),
  maybeConfiguredHost: Option.none(),
  projectRoot: PROJECT_ROOT,
  ...overrides,
})

const published: RelayRecord = {
  version: 1,
  id: 'relay',
  root: PROJECT_ROOT,
  url: `ws://127.0.0.1:5173/__foldkit/devtools-mcp?token=${RELAY_TOKEN}`,
  pid: process.pid,
  startedAt: 1,
}

describe('resolveRelayTargets', () => {
  let registryDirectory = ''
  let previousRegistryDirectory: string | undefined

  const resolve = (value: Settings) =>
    runWithNode(
      Effect.flatMap(makeUncheckedRegistryReader, registryReader =>
        resolveRelayTargets(value, registryReader),
      ),
    )

  const resolveUrls = (value: Settings) =>
    resolve(value).then(targets => targets.map(({ url }) => url))

  beforeEach(async () => {
    previousRegistryDirectory = process.env[RELAY_DIRECTORY_VARIABLE]
    registryDirectory = await mkdtemp(join(tmpdir(), 'foldkit-mcp-location-'))
    await rm(registryDirectory, { recursive: true, force: true })
    process.env[RELAY_DIRECTORY_VARIABLE] = registryDirectory
  })

  afterEach(async () => {
    if (previousRegistryDirectory === undefined) {
      delete process.env[RELAY_DIRECTORY_VARIABLE]
    } else {
      process.env[RELAY_DIRECTORY_VARIABLE] = previousRegistryDirectory
    }
    await rm(registryDirectory, { recursive: true, force: true })
  })

  const publish = async (record: RelayRecord = published) => {
    await mkdir(registryDirectory, {
      recursive: true,
      mode: PRIVATE_DIRECTORY_MODE,
    })
    await writeFile(
      join(registryDirectory, 'app.json'),
      JSON.stringify(record),
      'utf-8',
    )
  }

  it('uses a configured port instead of a published relay', async () => {
    await publish()
    expect(
      await resolveUrls(settings({ maybeConfiguredPort: Option.some('4600') })),
    ).toStrictEqual(['ws://localhost:4600'])
  })

  it('uses a configured host instead of a published relay', async () => {
    await publish()
    expect(
      await resolveUrls(
        settings({ maybeConfiguredHost: Option.some('devbox') }),
      ),
    ).toStrictEqual(['ws://devbox:9988'])
  })

  it('uses a configured host with a configured port', async () => {
    await publish()
    expect(
      await resolveUrls(
        settings({
          maybeConfiguredPort: Option.some('4600'),
          maybeConfiguredHost: Option.some('devbox'),
        }),
      ),
    ).toStrictEqual(['ws://devbox:4600'])
  })

  it('brackets a configured IPv6 host', async () => {
    expect(
      await resolveUrls(settings({ maybeConfiguredHost: Option.some('::1') })),
    ).toStrictEqual(['ws://[::1]:9988'])
  })

  it('uses a published relay address with its token', async () => {
    await publish()
    expect(await resolve(settings())).toStrictEqual([
      {
        key: published.id,
        url: published.url,
        maybeProjectRoot: Option.some(PROJECT_ROOT),
      },
    ])
  })

  it('ignores a published relay without a token', async () => {
    const configured = { ...published, url: 'ws://localhost:4600' }
    await publish(configured)

    expect(await resolveUrls(settings())).toStrictEqual([])
  })

  it.each([
    'ws://remote.example:5173/__foldkit/devtools-mcp?token=' + RELAY_TOKEN,
    'wss://127.0.0.1:5173/__foldkit/devtools-mcp?token=' + RELAY_TOKEN,
    'ws://127.0.0.1:5173/__foldkit/devtools-mcp?token=short',
    'ws://127.0.0.1:5173/__foldkit/devtools-mcp?token=' +
      RELAY_TOKEN +
      '&extra=value',
    'ws://user@127.0.0.1:5173/__foldkit/devtools-mcp?token=' + RELAY_TOKEN,
    'ws://127.0.0.1:5173/__foldkit/devtools-mcp?token=' +
      RELAY_TOKEN +
      '#fragment',
    'ws://127.0.0.1/__foldkit/devtools-mcp?token=' + RELAY_TOKEN,
    'ws://localhost:4600/other',
    'ws://localhost:4600?token=' + RELAY_TOKEN,
  ])('ignores an unsafe published relay address: %s', async url => {
    await publish({ ...published, url })

    expect(await resolveUrls(settings())).toStrictEqual([])
  })

  it('returns no targets when no relay is published', async () => {
    expect(await resolve(settings())).toStrictEqual([])
  })
})

describe('loadSettings', () => {
  const VARIABLES = [
    'FOLDKIT_DEVTOOLS_MCP_PORT',
    'FOLDKIT_DEVTOOLS_MCP_HOST',
    'FOLDKIT_PROJECT_ROOT',
  ] as const
  const previous: Partial<
    Record<(typeof VARIABLES)[number], string | undefined>
  > = {}

  beforeEach(() => {
    for (const name of VARIABLES) {
      previous[name] = process.env[name]
    }
  })

  afterEach(() => {
    for (const name of VARIABLES) {
      const value = previous[name]
      if (value === undefined) {
        delete process.env[name]
      } else {
        process.env[name] = value
      }
    }
  })

  it('reads the port, host and project root from the environment', async () => {
    process.env['FOLDKIT_DEVTOOLS_MCP_PORT'] = '4600'
    process.env['FOLDKIT_DEVTOOLS_MCP_HOST'] = 'devbox'
    process.env['FOLDKIT_PROJECT_ROOT'] = PROJECT_ROOT
    const loaded = await Effect.runPromise(
      loadSettings.pipe(
        Effect.provideService(
          ConfigProvider.ConfigProvider,
          ConfigProvider.fromEnv(),
        ),
      ),
    )
    expect(loaded).toEqual(
      settings({
        maybeConfiguredPort: Option.some('4600'),
        maybeConfiguredHost: Option.some('devbox'),
      }),
    )
  })
})
