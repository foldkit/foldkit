import { Effect, FileSystem, Option } from 'effect'
import type { RelayRecord } from 'foldkit/devtools-protocol'
import {
  chmod,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rename,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, win32 } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  type RelayRegistryReader,
  discoverRelays,
  isWithinRoot,
  makeRelayRegistryReader,
} from '../src/relayRegistry.ts'
import {
  RELAY_DIRECTORY_VARIABLE,
  RUNTIME_DIRECTORY_VARIABLE,
  makeUncheckedRegistryReader,
  runWithNode,
} from './relayRegistryFixtures.ts'

const REGISTRY_DIRECTORY_NAME = 'foldkit-devtools-relays'
const PRIVATE_DIRECTORY_MODE = 0o700
const SHARED_DIRECTORY_MODE = 0o777
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

const urls = (records: ReadonlyArray<RelayRecord>) =>
  records.map(({ url }) => url)

describe('discoverRelays', () => {
  let registryDirectory = ''
  let previousRegistryDirectory: string | undefined

  const publish = async (name: string, value: RelayRecord) => {
    await mkdir(registryDirectory, {
      recursive: true,
      mode: PRIVATE_DIRECTORY_MODE,
    })
    await writeFile(
      join(registryDirectory, `${name}.json`),
      JSON.stringify(value),
      'utf-8',
    )
  }

  const discover = (projectRoot: string) =>
    runWithNode(
      Effect.flatMap(makeUncheckedRegistryReader, registryReader =>
        discoverRelays(projectRoot, registryReader),
      ),
    )

  const discoverWith = (
    registryReader: RelayRegistryReader,
    projectRoot: string,
  ) => runWithNode(discoverRelays(projectRoot, registryReader))

  const refusalLine = () =>
    `[foldkit-devtools-mcp] ignoring the relay registry at ${registryDirectory}: it is readable or writable by other users`

  const discoverWithReplacementsDuringCleanup = (
    projectRoot: string,
    replacementBeforeMove: () => Promise<void>,
    replacementAfterMove: () => Promise<void>,
  ) =>
    runWithNode(
      Effect.gen(function* () {
        const fileSystem = yield* FileSystem.FileSystem
        const registryReader = yield* makeUncheckedRegistryReader
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

        return yield* discoverRelays(projectRoot, registryReader).pipe(
          Effect.provideService(FileSystem.FileSystem, interceptingFileSystem),
        )
      }),
    )

  beforeEach(async () => {
    previousRegistryDirectory = process.env[RELAY_DIRECTORY_VARIABLE]
    registryDirectory = await mkdtemp(join(tmpdir(), 'foldkit-mcp-test-'))
    await rm(registryDirectory, { recursive: true, force: true })
    process.env[RELAY_DIRECTORY_VARIABLE] = registryDirectory
  })

  afterEach(async () => {
    vi.restoreAllMocks()

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
      mode: PRIVATE_DIRECTORY_MODE,
    })
    await writeFile(
      join(registryDirectory, REGISTRY_DIRECTORY_NAME, 'app.json'),
      JSON.stringify(record('/workspace/app', 4000)),
      'utf-8',
    )

    try {
      expect(urls(await discover('/workspace/app'))).toStrictEqual([
        record('/workspace/app', 4000).url,
      ])
    } finally {
      if (previousRuntimeDirectory === undefined) {
        delete process.env[RUNTIME_DIRECTORY_VARIABLE]
      } else {
        process.env[RUNTIME_DIRECTORY_VARIABLE] = previousRuntimeDirectory
      }
    }
  })

  it.skipIf(process.platform === 'win32')(
    'reads the registry under the user cache directory when no runtime directory is set',
    async () => {
      const previousHome = process.env['HOME']
      const previousRuntimeDirectory = process.env[RUNTIME_DIRECTORY_VARIABLE]
      process.env['HOME'] = registryDirectory
      delete process.env[RUNTIME_DIRECTORY_VARIABLE]
      delete process.env[RELAY_DIRECTORY_VARIABLE]
      const defaultDirectory = join(
        registryDirectory,
        '.cache',
        REGISTRY_DIRECTORY_NAME,
      )
      await mkdir(defaultDirectory, {
        recursive: true,
        mode: PRIVATE_DIRECTORY_MODE,
      })
      await writeFile(
        join(defaultDirectory, 'app.json'),
        JSON.stringify(record('/workspace/app', 4000)),
        'utf-8',
      )

      try {
        expect(urls(await discover('/workspace/app'))).toStrictEqual([
          record('/workspace/app', 4000).url,
        ])
      } finally {
        if (previousHome === undefined) {
          delete process.env['HOME']
        } else {
          process.env['HOME'] = previousHome
        }
        if (previousRuntimeDirectory === undefined) {
          delete process.env[RUNTIME_DIRECTORY_VARIABLE]
        } else {
          process.env[RUNTIME_DIRECTORY_VARIABLE] = previousRuntimeDirectory
        }
      }
    },
  )

  it('finds nothing while no dev server has published a relay', async () => {
    expect(await discover('/workspace/app')).toStrictEqual([])
  })

  it('finds the relay published for the project root itself', async () => {
    await publish('app', record('/workspace/app', 4100))

    expect(urls(await discover('/workspace/app'))).toStrictEqual([
      record('/workspace/app', 4100).url,
    ])
  })

  it('finds a relay published for a project inside the root', async () => {
    await publish('app', record('/workspace/apps/site', 4200))

    expect(urls(await discover('/workspace'))).toStrictEqual([
      record('/workspace/apps/site', 4200).url,
    ])
  })

  it('ignores relays published outside the root', async () => {
    await publish('other', record('/elsewhere/app', 4300))
    await publish('sibling', record('/workspace-two/app', 4400))

    expect(await discover('/workspace')).toStrictEqual([])
  })

  it('lists the dev server started most recently first', async () => {
    await publish('older', record('/workspace/a', 4500, { startedAt: 10 }))
    await publish('newer', record('/workspace/b', 4600, { startedAt: 20 }))

    expect(urls(await discover('/workspace'))).toStrictEqual([
      record('/workspace/b', 4600).url,
      record('/workspace/a', 4500).url,
    ])
  })

  it('finds every relay at the nearest root enclosing the project root', async () => {
    await publish('workspace', record('/workspace', 4610, { id: 'outer' }))
    await publish(
      'app',
      record('/workspace/app', 4620, { id: 'inner', startedAt: 10 }),
    )
    await publish(
      'app-again',
      record('/workspace/app', 4640, { id: 'inner-again', startedAt: 20 }),
    )
    await publish('sibling', record('/workspace/other', 4630, { id: 'other' }))

    expect(urls(await discover('/workspace/app/src'))).toStrictEqual([
      record('/workspace/app', 4640).url,
      record('/workspace/app', 4620).url,
    ])
  })

  it('drops and removes the record of a dev server that is gone', async () => {
    await publish('gone', record('/workspace/app', 4700, { pid: DEAD_PID }))

    expect(await discover('/workspace')).toStrictEqual([])
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
    ).toStrictEqual([])
    expect(JSON.parse(await readFile(recordPath, 'utf-8'))).toEqual(
      newestReplacement,
    )
  })

  it('skips records it cannot read', async () => {
    await mkdir(registryDirectory, {
      recursive: true,
      mode: PRIVATE_DIRECTORY_MODE,
    })
    await writeFile(join(registryDirectory, 'broken.json'), '{', 'utf-8')
    await publish('app', record('/workspace/app', 4800))

    expect(urls(await discover('/workspace'))).toStrictEqual([
      record('/workspace/app', 4800).url,
    ])
  })

  it('reads records through the canonical directory returned by trust', async () => {
    const canonicalDirectory = `${registryDirectory}-canonical`
    await mkdir(registryDirectory, { mode: PRIVATE_DIRECTORY_MODE })
    await mkdir(canonicalDirectory, { mode: PRIVATE_DIRECTORY_MODE })

    try {
      await writeFile(
        join(canonicalDirectory, 'app.json'),
        JSON.stringify(record('/workspace/app', 4850)),
        'utf-8',
      )
      const registryReader = await Effect.runPromise(
        makeUncheckedRegistryReader,
      )
      const canonicalReader: RelayRegistryReader = {
        ...registryReader,
        trust: {
          inspect: () =>
            Effect.succeed({
              directory: canonicalDirectory,
              maybeRefusal: Option.none(),
            }),
        },
      }

      expect(urls(await discoverWith(canonicalReader, '/workspace'))).toEqual([
        record('/workspace/app', 4850).url,
      ])
    } finally {
      await rm(canonicalDirectory, { recursive: true, force: true })
    }
  })

  it('reads no record through a symbolic link or junction', async () => {
    const targetDirectory = `${registryDirectory}-target`
    const reported = vi.spyOn(console, 'error').mockImplementation(() => {})
    await mkdir(targetDirectory, { mode: PRIVATE_DIRECTORY_MODE })
    await writeFile(
      join(targetDirectory, 'planted.json'),
      JSON.stringify(record('/workspace/app', 4860)),
      'utf-8',
    )
    await symlink(
      targetDirectory,
      registryDirectory,
      process.platform === 'win32' ? 'junction' : 'dir',
    )

    try {
      const registryReader = await Effect.runPromise(makeRelayRegistryReader)

      expect(
        await discoverWith(registryReader, '/workspace/app'),
      ).toStrictEqual([])
      expect(reported.mock.calls.map(call => call.join(' '))).toStrictEqual([
        `[foldkit-devtools-mcp] ignoring the relay registry at ${registryDirectory}: it is not a regular directory`,
      ])
    } finally {
      await rm(targetDirectory, { recursive: true, force: true })
    }
  })

  it.skipIf(process.platform === 'win32')(
    'reads no record from a registry directory that other users can write to',
    async () => {
      const reported = vi.spyOn(console, 'error').mockImplementation(() => {})
      await publish('planted', record('/workspace/app', 4900))
      await chmod(registryDirectory, SHARED_DIRECTORY_MODE)
      const registryReader = await Effect.runPromise(makeRelayRegistryReader)

      expect(
        await discoverWith(registryReader, '/workspace/app'),
      ).toStrictEqual([])
      expect(
        await discoverWith(registryReader, '/workspace/app'),
      ).toStrictEqual([])

      expect(reported.mock.calls.map(call => call.join(' '))).toStrictEqual([
        refusalLine(),
      ])
    },
  )

  it.skipIf(process.platform === 'win32')(
    'reports a refused registry directory once in each session',
    async () => {
      const reported = vi.spyOn(console, 'error').mockImplementation(() => {})
      await publish('planted', record('/workspace/app', 4910))
      await chmod(registryDirectory, SHARED_DIRECTORY_MODE)

      const discoverInNewSession = async () =>
        discoverWith(
          await Effect.runPromise(makeRelayRegistryReader),
          '/workspace/app',
        )

      expect(await discoverInNewSession()).toStrictEqual([])
      expect(await discoverInNewSession()).toStrictEqual([])

      expect(reported.mock.calls.map(call => call.join(' '))).toStrictEqual([
        refusalLine(),
        refusalLine(),
      ])
    },
  )
})

describe('isWithinRoot', () => {
  it('compares Windows roots without regard to separators or case', () => {
    expect(isWithinRoot('C:\\Users\\x\\app', 'C:/Users/x/app', win32)).toBe(
      true,
    )
    expect(isWithinRoot('C:/Users/x/app', 'C:\\Users\\x\\app', win32)).toBe(
      true,
    )
    expect(isWithinRoot('c:\\users\\X\\app', 'C:/Users/x/app/src', win32)).toBe(
      true,
    )
    expect(isWithinRoot('C:/Users/x/app/src', 'c:\\users\\X\\app', win32)).toBe(
      false,
    )
    expect(isWithinRoot('C:\\Users\\x\\app', 'D:/other', win32)).toBe(false)
    expect(isWithinRoot('D:/other', 'C:\\Users\\x\\app', win32)).toBe(false)
  })
})
