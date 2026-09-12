import { ConfigProvider, Effect, Option } from 'effect'
import { mkdir, mkdtemp, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { NodeServices } from '@effect/platform-node'

import { type RelayRecord, discoverRelay } from '../src/relayRegistry.ts'

const RELAY_DIRECTORY_VARIABLE = 'FOLDKIT_DEVTOOLS_RELAY_DIRECTORY'
// The largest pid Linux hands out is far below this, and macOS lower still,
// so no live process can carry it.
const DEAD_PID = 2_147_483_647

const record = (
  root: string,
  port: number,
  overrides: Partial<RelayRecord> = {},
): RelayRecord => ({
  version: 1,
  root,
  url: `ws://127.0.0.1:${port}/__foldkit/devtools-mcp`,
  pid: process.pid,
  startedAt: 1_000,
  ...overrides,
})

describe('discoverRelay', () => {
  let registryDirectory = ''
  let previousRegistryDirectory: string | undefined

  const publish = async (name: string, value: RelayRecord) => {
    await mkdir(registryDirectory, { recursive: true })
    await writeFile(
      join(registryDirectory, `${name}.json`),
      JSON.stringify(value),
      'utf-8',
    )
  }

  // A fresh environment provider per lookup: Effect's default one snapshots
  // the environment on first use, before the test has pointed the registry
  // at its own directory.
  const discover = (projectRoot: string) =>
    Effect.runPromise(
      discoverRelay(projectRoot).pipe(
        Effect.provideService(
          ConfigProvider.ConfigProvider,
          ConfigProvider.fromEnv(),
        ),
        Effect.provide(NodeServices.layer),
      ),
    ).then(Option.getOrUndefined)

  beforeEach(async () => {
    previousRegistryDirectory = process.env[RELAY_DIRECTORY_VARIABLE]
    registryDirectory = await mkdtemp(join(tmpdir(), 'foldkit-mcp-test-'))
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

  it('finds nothing while no dev server has published a relay', async () => {
    expect(await discover('/workspace/app')).toBeUndefined()
  })

  it('finds the relay published for the project root itself', async () => {
    await publish('app', record('/workspace/app', 4100))

    expect(await discover('/workspace/app')).toMatchObject({
      url: record('/workspace/app', 4100).url,
    })
  })

  it('finds a relay published for a project inside the root', async () => {
    await publish('app', record('/workspace/apps/site', 4200))

    expect(await discover('/workspace')).toMatchObject({
      url: record('/workspace/apps/site', 4200).url,
    })
  })

  it('ignores relays published outside the root', async () => {
    await publish('other', record('/elsewhere/app', 4300))
    await publish('sibling', record('/workspace-two/app', 4400))

    expect(await discover('/workspace')).toBeUndefined()
  })

  it('prefers the dev server started most recently', async () => {
    await publish('older', record('/workspace/a', 4500, { startedAt: 10 }))
    await publish('newer', record('/workspace/b', 4600, { startedAt: 20 }))

    expect(await discover('/workspace')).toMatchObject({
      url: record('/workspace/b', 4600).url,
    })
  })

  it('drops and removes the record of a dev server that is gone', async () => {
    await publish('gone', record('/workspace/app', 4700, { pid: DEAD_PID }))

    expect(await discover('/workspace')).toBeUndefined()
    expect(await readdir(registryDirectory)).toEqual([])
  })

  it('skips records it cannot read', async () => {
    await mkdir(registryDirectory, { recursive: true })
    await writeFile(join(registryDirectory, 'broken.json'), '{', 'utf-8')
    await publish('app', record('/workspace/app', 4800))

    expect(await discover('/workspace')).toMatchObject({
      url: record('/workspace/app', 4800).url,
    })
  })
})
