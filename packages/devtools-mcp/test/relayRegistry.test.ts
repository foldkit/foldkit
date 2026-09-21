import { ConfigProvider, Effect, FileSystem, Option } from 'effect'
import type { RelayRecord } from 'foldkit/devtools-protocol'
import {
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rename,
  rm,
  writeFile,
} from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import * as NodeServices from '@effect/platform-node/NodeServices'

import { discoverRelay } from '../src/relayRegistry.ts'

const RELAY_DIRECTORY_VARIABLE = 'FOLDKIT_DEVTOOLS_RELAY_DIRECTORY'
const RUNTIME_DIRECTORY_VARIABLE = 'XDG_RUNTIME_DIR'
const REGISTRY_DIRECTORY_NAME = 'foldkit-devtools-relays'
// NOTE: This exceeds every PID Linux or macOS can issue, so no live process can
// carry it.
const DEAD_PID = 2_147_483_647

const record = (
  root: string,
  port: number,
  overrides: Partial<RelayRecord> = {},
): RelayRecord => ({
  version: 1,
  id: `relay-for-${root}`,
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

  const discoverWithReplacementsDuringCleanup = (
    projectRoot: string,
    replacementBeforeMove: () => Promise<void>,
    replacementAfterMove: () => Promise<void>,
  ) =>
    Effect.runPromise(
      Effect.gen(function* () {
        const fileSystem = yield* FileSystem.FileSystem
        let didStartCleanup = false

        const publishBeforeCleanup = () =>
          Effect.promise(replacementBeforeMove).pipe(Effect.orDie)

        const interceptingFileSystem: FileSystem.FileSystem = {
          ...fileSystem,
          rename: (oldPath, newPath) => {
            if (didStartCleanup) {
              return fileSystem.rename(oldPath, newPath)
            }

            didStartCleanup = true
            return publishBeforeCleanup().pipe(
              Effect.andThen(fileSystem.rename(oldPath, newPath)),
              Effect.andThen(
                Effect.promise(replacementAfterMove).pipe(Effect.orDie),
              ),
            )
          },
          remove: (path, options) => {
            if (didStartCleanup) {
              return fileSystem.remove(path, options)
            }

            return publishBeforeCleanup().pipe(
              Effect.andThen(fileSystem.remove(path, options)),
            )
          },
        }

        return yield* discoverRelay(projectRoot).pipe(
          Effect.provideService(FileSystem.FileSystem, interceptingFileSystem),
        )
      }).pipe(
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

  it('reads the registry under XDG_RUNTIME_DIR when no directory is configured', async () => {
    const previousRuntimeDirectory = process.env[RUNTIME_DIRECTORY_VARIABLE]
    process.env[RUNTIME_DIRECTORY_VARIABLE] = registryDirectory
    delete process.env[RELAY_DIRECTORY_VARIABLE]
    await mkdir(join(registryDirectory, REGISTRY_DIRECTORY_NAME), {
      recursive: true,
    })
    await writeFile(
      join(registryDirectory, REGISTRY_DIRECTORY_NAME, 'app.json'),
      JSON.stringify(record('/workspace/app', 4000)),
      'utf-8',
    )

    try {
      expect(await discover('/workspace/app')).toMatchObject({
        url: record('/workspace/app', 4000).url,
      })
    } finally {
      if (previousRuntimeDirectory === undefined) {
        delete process.env[RUNTIME_DIRECTORY_VARIABLE]
      } else {
        process.env[RUNTIME_DIRECTORY_VARIABLE] = previousRuntimeDirectory
      }
    }
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

  it('keeps the newest replacement published while stale cleanup is in progress', async () => {
    const stale = record('/workspace/app', 4750, {
      id: 'stale',
      pid: DEAD_PID,
    })
    const firstReplacement = record('/workspace/app', 4751, {
      id: 'first-replacement',
    })
    const newestReplacement = record('/workspace/app', 4752, {
      id: 'newest-replacement',
    })
    const recordPath = join(registryDirectory, 'app.json')
    const publishAtomically = async (value: RelayRecord) => {
      const pendingPath = `${recordPath}.${value.id}.pending`
      await writeFile(pendingPath, JSON.stringify(value), 'utf-8')
      await rename(pendingPath, recordPath)
    }
    await publish('app', stale)

    expect(
      await discoverWithReplacementsDuringCleanup(
        '/workspace',
        () => publishAtomically(firstReplacement),
        () => publishAtomically(newestReplacement),
      ),
    ).toBeUndefined()
    expect(JSON.parse(await readFile(recordPath, 'utf-8'))).toEqual(
      newestReplacement,
    )
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
