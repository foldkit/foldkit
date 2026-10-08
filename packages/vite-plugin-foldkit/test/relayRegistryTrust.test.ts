import { Effect, FileSystem, Layer, Option } from 'effect'
import { ChildProcessSpawner } from 'effect/process'
import {
  chmod,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it, onTestFinished } from 'vitest'

import * as NodeServices from '@effect/platform-node/NodeServices'

import {
  makeCachedWindowsProbe,
  makeRelayRegistryTrust,
  powershellPath,
  windowsDirectoryRefusal,
} from '../src/relayRegistryTrust.ts'

const USER = 'S-1-5-21-1111111111-2222222222-3333333333-1001'
const OTHER = 'S-1-5-21-1111111111-2222222222-3333333333-1002'
const GROUP = 'S-1-5-21-1111111111-2222222222-3333333333-513'
const PRIVATE = `O:${USER}G:${GROUP}D:(A;OICIID;FA;;;SY)(A;OICIID;FA;;;BA)(A;OICIID;FA;;;${USER})`
const SHARED = `O:${USER}G:${GROUP}D:(A;OICI;FA;;;${USER})(A;OICI;0x1200a9;;;BU)`
const IDENTITY = `"host\\user","${USER}"`
const PROBE_TEST_TIMEOUT = 30_000

const UNVERIFIED_OWNERSHIP = Option.some(
  'has ownership that cannot be verified',
)
const UNVERIFIED_PERMISSIONS = Option.some(
  'has permissions that cannot be verified',
)
const OWNED_BY_ANOTHER_USER = Option.some('is owned by another user')
const SHARED_WITH_OTHER_USERS = Option.some(
  'is readable or writable by other users',
)

describe('windowsDirectoryRefusal', () => {
  it('accepts inherited entries and a directory owned by Administrators', () => {
    expect(windowsDirectoryRefusal(PRIVATE, USER)).toStrictEqual(Option.none())
    expect(
      windowsDirectoryRefusal(
        `O:BAG:${GROUP}D:PAI(A;OICI;FA;;;SY)(A;OICI;FA;;;BA)(A;OICIIO;GA;;;CO)(A;OICI;FA;;;${USER})S:AI(AU;SA;FA;;;WD)`,
        USER,
      ),
    ).toStrictEqual(Option.none())
  })

  it('refuses another owner', () => {
    expect(
      windowsDirectoryRefusal(
        `O:${OTHER}G:${GROUP}D:(A;OICI;FA;;;${USER})`,
        USER,
      ),
    ).toStrictEqual(OWNED_BY_ANOTHER_USER)
  })

  it('refuses an entry that allows another account', () => {
    for (const account of ['BU', 'WD', 'AU', OTHER]) {
      expect(
        windowsDirectoryRefusal(
          `O:${USER}G:${GROUP}D:(A;OICI;FA;;;${USER})(A;OICI;0x1200a9;;;${account})`,
          USER,
        ),
      ).toStrictEqual(SHARED_WITH_OTHER_USERS)
    }
  })

  it('ignores deny entries', () => {
    expect(
      windowsDirectoryRefusal(
        `O:${USER}G:${GROUP}D:(D;OICI;FA;;;BU)(OD;;FA;guid;;WD)(A;OICI;FA;;;${USER})`,
        USER,
      ),
    ).toStrictEqual(Option.none())
  })

  it('refuses a null access control list', () => {
    expect(
      windowsDirectoryRefusal(`O:${USER}G:${GROUP}D:NO_ACCESS_CONTROL`, USER),
    ).toStrictEqual(SHARED_WITH_OTHER_USERS)
  })

  it('refuses a descriptor it cannot read', () => {
    expect(
      windowsDirectoryRefusal(
        `O:${USER}G:${GROUP}D:(XA;;FA;;;BU;(@User.Title=="PM"))`,
        USER,
      ),
    ).toStrictEqual(UNVERIFIED_OWNERSHIP)
    expect(windowsDirectoryRefusal('Access is denied.', USER)).toStrictEqual(
      UNVERIFIED_OWNERSHIP,
    )
    expect(windowsDirectoryRefusal(`O:${USER}G:${GROUP}`, USER)).toStrictEqual(
      UNVERIFIED_PERMISSIONS,
    )
    expect(
      windowsDirectoryRefusal(`O:${USER}D:(A;OICI;FA;;${USER})`, USER),
    ).toStrictEqual(UNVERIFIED_PERMISSIONS)
    expect(
      windowsDirectoryRefusal(`O:${USER}D:(AU;SA;FA;;;${USER})`, USER),
    ).toStrictEqual(UNVERIFIED_PERMISSIONS)
  })
})

describe('powershellPath', () => {
  it('names PowerShell by its absolute path under the system root', () => {
    expect(powershellPath('C:\\Windows')).toBe(
      'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe',
    )
  })
})

const temporaryDirectory = async () => {
  const directory = await mkdtemp(join(tmpdir(), 'foldkit-registry-'))
  onTestFinished(() => rm(directory, { recursive: true, force: true }))
  return directory
}

type CachedWindowsProbe = Effect.Success<
  ReturnType<typeof makeCachedWindowsProbe>
>

const probedVerdict = (
  cachedProbe: CachedWindowsProbe,
  probedDirectory: string,
  identifyingDirectory: string,
) =>
  Effect.runPromise(
    Effect.gen(function* () {
      const fileSystem = yield* FileSystem.FileSystem
      const info = yield* fileSystem.stat(identifyingDirectory)
      return yield* cachedProbe(probedDirectory, info)
    }).pipe(Effect.provide(NodeServices.layer)),
  )

const verdictFor = (cachedProbe: CachedWindowsProbe, target: string) =>
  probedVerdict(cachedProbe, target, target)

const freshProbeVerdict = async (executable: string, target: string) => {
  const cachedProbe = await Effect.runPromise(
    makeCachedWindowsProbe(Option.some(executable)),
  )
  return probedVerdict(cachedProbe, target, await temporaryDirectory())
}

const standInProbe = async (body: string) => {
  const directory = await mkdtemp(join(tmpdir(), 'foldkit-probe-'))
  onTestFinished(() => rm(directory, { recursive: true, force: true }))
  const executable = join(directory, 'powershell')
  await writeFile(executable, `#!/bin/sh\n${body}\n`)
  await chmod(executable, 0o755)
  return {
    directory,
    executable,
    probe: (target: string) => freshProbeVerdict(executable, target),
  }
}

describe('makeCachedWindowsProbe', () => {
  it.skipIf(process.platform === 'win32')(
    'reads the descriptor and the user from the probe output',
    async () => {
      const accepted = await standInProbe(
        `printf '%s\\r\\n' '${PRIVATE}' '${IDENTITY}'`,
      )
      const shared = await standInProbe(
        `printf '%s\\n' '' '${SHARED}' '${IDENTITY}'`,
      )

      expect(await accepted.probe('C:\\registry')).toStrictEqual(Option.none())
      expect(await shared.probe('C:\\registry')).toStrictEqual(
        SHARED_WITH_OTHER_USERS,
      )
    },
  )

  it.skipIf(process.platform === 'win32')(
    'passes the directory through the environment',
    async () => {
      const directory = `C:\\it's "here" $(exit 1)`
      const echoing = await standInProbe(
        'printf \'%s\' "$FOLDKIT_DEVTOOLS_PROBED_DIRECTORY" > "$(dirname "$0")/received"',
      )

      expect(await echoing.probe(directory)).toStrictEqual(UNVERIFIED_OWNERSHIP)
      expect(await readFile(join(echoing.directory, 'received'), 'utf-8')).toBe(
        directory,
      )
    },
  )

  it.skipIf(process.platform === 'win32')(
    'refuses when the probe fails, prints too little, or does not finish',
    async () => {
      const failing = await standInProbe(
        `printf '%s\\n' '${PRIVATE}' '${IDENTITY}'\necho 'Access is denied.' >&2\nexit 1`,
      )
      const silent = await standInProbe(`printf '%s\\n' '${PRIVATE}'`)
      const anonymous = await standInProbe(
        `printf '%s\\n' '${PRIVATE}' '"host\\\\user","unknown"'`,
      )
      const hanging = await standInProbe(
        `printf '%s\\n' '${PRIVATE}' '${IDENTITY}'\nsleep 30`,
      )

      expect(await failing.probe('C:\\registry')).toStrictEqual(
        UNVERIFIED_OWNERSHIP,
      )
      expect(await silent.probe('C:\\registry')).toStrictEqual(
        UNVERIFIED_OWNERSHIP,
      )
      expect(await anonymous.probe('C:\\registry')).toStrictEqual(
        UNVERIFIED_OWNERSHIP,
      )
      expect(await hanging.probe('C:\\registry')).toStrictEqual(
        UNVERIFIED_OWNERSHIP,
      )
    },
    PROBE_TEST_TIMEOUT,
  )

  it('refuses when the probe cannot start', async () => {
    const missing = join(tmpdir(), 'foldkit-missing-probe', 'powershell.exe')

    expect(await freshProbeVerdict(missing, 'C:\\registry')).toStrictEqual(
      UNVERIFIED_OWNERSHIP,
    )
  })

  it.skipIf(process.platform === 'win32')(
    'probes again after a probe that failed and keeps a verdict it read',
    async () => {
      const recoveringProbe = await standInProbe(
        [
          'runs="$(dirname "$0")/runs"',
          'echo run >> "$runs"',
          'if [ "$(wc -l < "$runs")" -eq 1 ]; then exit 1; fi',
          `printf '%s\\n' '${PRIVATE}' '${IDENTITY}'`,
        ].join('\n'),
      )
      const runCount = async () =>
        (await readFile(join(recoveringProbe.directory, 'runs'), 'utf-8'))
          .split('\n')
          .filter(line => line !== '').length
      const target = await temporaryDirectory()
      const cachedProbe = await Effect.runPromise(
        makeCachedWindowsProbe(Option.some(recoveringProbe.executable)),
      )
      const probeTarget = () => verdictFor(cachedProbe, target)

      expect(await probeTarget()).toStrictEqual(UNVERIFIED_OWNERSHIP)
      expect(await runCount()).toBe(1)

      expect(await probeTarget()).toStrictEqual(Option.none())
      expect(await runCount()).toBe(2)

      expect(await probeTarget()).toStrictEqual(Option.none())
      expect(await runCount()).toBe(2)
    },
    PROBE_TEST_TIMEOUT,
  )

  it('refuses without probing when no PowerShell path is known', async () => {
    const target = await temporaryDirectory()
    const cachedProbe = await Effect.runPromise(
      makeCachedWindowsProbe(Option.none()),
    )

    expect(await verdictFor(cachedProbe, target)).toStrictEqual(
      UNVERIFIED_OWNERSHIP,
    )
  })
})

describe('makeRelayRegistryTrust', () => {
  it.runIf(process.platform === 'win32')(
    'probes a directory once until it is replaced',
    async () => {
      const directory = await mkdtemp(join(tmpdir(), 'foldkit-trusted-'))
      onTestFinished(() => rm(directory, { recursive: true, force: true }))
      const spawned = { count: 0 }
      const countingSpawner = Layer.effect(
        ChildProcessSpawner.ChildProcessSpawner,
        Effect.map(ChildProcessSpawner.ChildProcessSpawner, spawner =>
          ChildProcessSpawner.make(command => {
            spawned.count += 1
            return spawner.spawn(command)
          }),
        ),
      ).pipe(Layer.provide(NodeServices.layer))
      const trust = await Effect.runPromise(makeRelayRegistryTrust)
      const refusal = () =>
        Effect.runPromise(
          trust
            .refusal(directory)
            .pipe(
              Effect.provide(countingSpawner),
              Effect.provide(NodeServices.layer),
            ),
        )

      expect(await refusal()).toStrictEqual(Option.none())
      expect(spawned.count).toBe(1)

      expect(await refusal()).toStrictEqual(Option.none())
      expect(spawned.count).toBe(1)

      await rm(directory, { recursive: true })
      await mkdir(directory)

      expect(await refusal()).toStrictEqual(Option.none())
      expect(spawned.count).toBe(2)
    },
    PROBE_TEST_TIMEOUT,
  )
})
