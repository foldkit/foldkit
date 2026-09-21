import { ConfigProvider, Effect, Option } from 'effect'
import type { RelayRecord } from 'foldkit/devtools-protocol'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import * as NodeServices from '@effect/platform-node/NodeServices'

import {
  type Settings,
  loadSettings,
  resolveRelayUrl,
} from '../src/relayLocation.ts'

const RELAY_DIRECTORY_VARIABLE = 'FOLDKIT_DEVTOOLS_RELAY_DIRECTORY'
const PROJECT_ROOT = '/workspace/app'

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
  url: 'ws://127.0.0.1:5173/__foldkit/devtools-mcp?token=abc',
  pid: process.pid,
  startedAt: 1,
}

describe('resolveRelayUrl', () => {
  let registryDirectory = ''
  let previousRegistryDirectory: string | undefined

  const resolve = (value: Settings) =>
    Effect.runPromise(
      resolveRelayUrl(value).pipe(
        Effect.provideService(
          ConfigProvider.ConfigProvider,
          ConfigProvider.fromEnv(),
        ),
        Effect.provide(NodeServices.layer),
      ),
    )

  beforeEach(async () => {
    previousRegistryDirectory = process.env[RELAY_DIRECTORY_VARIABLE]
    registryDirectory = await mkdtemp(join(tmpdir(), 'foldkit-mcp-location-'))
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

  const publish = async () => {
    await mkdir(registryDirectory, { recursive: true })
    await writeFile(
      join(registryDirectory, 'app.json'),
      JSON.stringify(published),
      'utf-8',
    )
  }

  it('uses a configured port instead of a published relay', async () => {
    await publish()
    expect(
      await resolve(settings({ maybeConfiguredPort: Option.some('4600') })),
    ).toBe('ws://localhost:4600')
  })

  it('uses a configured host with a configured port', async () => {
    expect(
      await resolve(
        settings({
          maybeConfiguredPort: Option.some('4600'),
          maybeConfiguredHost: Option.some('devbox'),
        }),
      ),
    ).toBe('ws://devbox:4600')
  })

  it('uses a published relay address with its token', async () => {
    await publish()
    expect(await resolve(settings())).toBe(published.url)
  })

  it('replaces only a published relay hostname with a configured host', async () => {
    await publish()
    expect(
      await resolve(settings({ maybeConfiguredHost: Option.some('devbox') })),
    ).toBe('ws://devbox:5173/__foldkit/devtools-mcp?token=abc')
  })

  it('uses the legacy port when no relay is published', async () => {
    expect(await resolve(settings())).toBe('ws://localhost:9988')
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
