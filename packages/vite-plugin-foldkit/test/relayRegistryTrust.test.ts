import { Effect, Layer, Option, pipe } from 'effect'
import { ChildProcessSpawner } from 'effect/process'
import { execFileSync, spawnSync } from 'node:child_process'
import {
  chmod,
  copyFile,
  mkdir,
  mkdtemp,
  realpath,
  readFile,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, win32 } from 'node:path'
import { describe, expect, it, onTestFinished } from 'vitest'

import { NodeFileSystem, NodeServices } from '@effect/platform-node'

import {
  powershellPath,
  probeWindowsDirectory,
  relayRegistryTrust,
  windowsDirectoryChainRefusal,
  windowsDirectoryRefusal,
  windowsTempRootRefusal,
} from '../src/relayRegistryTrust.ts'

const USER = 'S-1-5-21-1111111111-2222222222-3333333333-1001'
const OTHER = 'S-1-5-21-1111111111-2222222222-3333333333-1002'
const DOMAIN_ADMINISTRATOR = 'S-1-5-21-4444444444-5555555555-6666666666-500'
const GROUP = 'S-1-5-21-1111111111-2222222222-3333333333-513'
const PRIVATE = `O:${USER}G:${GROUP}D:(A;OICIID;FA;;;SY)(A;OICIID;FA;;;BA)(A;OICIID;FA;;;${USER})`
const SHARED = `O:${USER}G:${GROUP}D:(A;OICI;FA;;;${USER})(A;OICI;0x1200a9;;;BU)`
const WINDOWS_ROOT = `O:BAG:${GROUP}D:(A;OICI;FA;;;SY)(A;OICI;FA;;;BA)(A;OICI;FR;;;BU)`
const IDENTITY = `"host\\user","${USER}"`
const USERS_GROUP_SID = 'S-1-5-32-545'
const TRUSTED_INSTALLER =
  'S-1-5-80-956008885-3418522649-1831038044-1853292631-2271478464'
const PROBED_DIRECTORY = 'C:\\registry'
const PROBE_TEST_TIMEOUT = 30_000
const NATIVE_PROBE_TIMEOUT = 10_000
const NATIVE_PROBE_SCRIPT = `$sections = [System.Security.AccessControl.AccessControlSections]::Owner -bor [System.Security.AccessControl.AccessControlSections]::Access; $directories = [System.Collections.Generic.List[string]]::new(); $directory = [System.IO.DirectoryInfo]::new($env:FOLDKIT_DEVTOOLS_PROBED_DIRECTORY); while ($null -ne $directory) { $directories.Insert(0, $directory.FullName); $directory = $directory.Parent }; foreach ($path in $directories) { $attributes = [System.IO.File]::GetAttributes($path); if (($attributes -band [System.IO.FileAttributes]::ReparsePoint) -ne 0) { 'REPARSE_POINT' } else { 'DIRECTORY' }; ([System.IO.Directory]::GetAccessControl($path)).GetSecurityDescriptorSddlForm($sections) }; & "$env:SystemRoot\\System32\\whoami.exe" /user /fo csv /nh`
const SECONDS_PAST_PROBE_LIMIT = '30'
const STAND_IN_POWERSHELL = join(
  import.meta.dirname,
  'fixtures',
  'standInPowerShell.sh',
)

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
const REPLACEABLE_PARENT = Option.some(
  'has a parent directory that another user can replace',
)
const REPARSE_PARENT = Option.some('has a reparse-point directory in its path')

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

  it('accepts the local Administrator alias', () => {
    expect(
      windowsDirectoryRefusal(
        `O:LAG:${GROUP}D:(A;OICI;FA;;;SY)(A;OICI;FA;;;LA)`,
        USER,
      ),
    ).toStrictEqual(Option.none())
  })

  it('refuses a domain Administrator SID', () => {
    expect(
      windowsDirectoryRefusal(
        `O:${DOMAIN_ADMINISTRATOR}G:${GROUP}D:(A;OICI;FA;;;${DOMAIN_ADMINISTRATOR})`,
        USER,
      ),
    ).toStrictEqual(OWNED_BY_ANOTHER_USER)
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

describe('windowsDirectoryChainRefusal', () => {
  it('accepts read and create access on standard shared ancestors', () => {
    const rootWithSharedCreate = `O:BAG:${GROUP}D:(A;;FA;;;SY)(A;;FA;;;BA)(A;;FR;;;BU)(A;;LC;;;BU)(A;;0x00000006;;;BU)`

    expect(
      windowsDirectoryChainRefusal([rootWithSharedCreate, PRIVATE], USER),
    ).toStrictEqual(Option.none())
  })

  it('accepts a protected ancestor owned by TrustedInstaller', () => {
    const protectedRoot = `O:${TRUSTED_INSTALLER}G:${GROUP}D:(A;;FA;;;${TRUSTED_INSTALLER})(A;;FA;;;SY)(A;;FR;;;BU)`

    expect(
      windowsDirectoryChainRefusal([protectedRoot, PRIVATE], USER),
    ).toStrictEqual(Option.none())
  })

  it('refuses delete-child access on a parent', () => {
    const replaceableRoot = `O:BAG:${GROUP}D:(A;;FA;;;SY)(A;;FA;;;BA)(A;;0x00000040;;;BU)`

    expect(
      windowsDirectoryChainRefusal([replaceableRoot, PRIVATE], USER),
    ).toStrictEqual(REPLACEABLE_PARENT)
  })

  it('refuses access that can replace or redirect a child directory', () => {
    for (const rights of [
      'SD',
      'WD',
      'WO',
      'FA',
      'FW',
      'GW',
      '0x00010000',
      '0x10000000',
      '0x40000000',
      '0x00000002',
      '0x00000100',
    ]) {
      const replaceable = `O:${USER}G:${GROUP}D:(A;;FA;;;${USER})(A;;${rights};;;BU)`

      expect(
        windowsDirectoryChainRefusal(
          [WINDOWS_ROOT, replaceable, PRIVATE],
          USER,
        ),
      ).toStrictEqual(REPLACEABLE_PARENT)
    }
  })

  it('refuses another owner or an unrecognized access-right family', () => {
    const anotherOwner = `O:${OTHER}G:${GROUP}D:(A;;FR;;;BU)`
    const registryKeyRights = `O:${USER}G:${GROUP}D:(A;;FA;;;${USER})(A;;KA;;;BU)`
    const unknownNumericRights = `O:${USER}G:${GROUP}D:(A;;FA;;;${USER})(A;;0x02000000;;;BU)`

    expect(
      windowsDirectoryChainRefusal([WINDOWS_ROOT, anotherOwner, PRIVATE], USER),
    ).toStrictEqual(REPLACEABLE_PARENT)
    expect(
      windowsDirectoryChainRefusal(
        [WINDOWS_ROOT, registryKeyRights, PRIVATE],
        USER,
      ),
    ).toStrictEqual(UNVERIFIED_PERMISSIONS)
    expect(
      windowsDirectoryChainRefusal(
        [WINDOWS_ROOT, unknownNumericRights, PRIVATE],
        USER,
      ),
    ).toStrictEqual(UNVERIFIED_PERMISSIONS)
  })

  it('ignores inherit-only replacement access on the current object', () => {
    const inheritedForChildren = `O:${USER}G:${GROUP}D:(A;OICIIO;FA;;;BU)(A;;FA;;;${USER})`

    expect(
      windowsDirectoryChainRefusal(
        [WINDOWS_ROOT, inheritedForChildren, PRIVATE],
        USER,
      ),
    ).toStrictEqual(Option.none())
  })
})

describe('powershellPath', () => {
  it('names PowerShell by its absolute path under the system root', () => {
    expect(powershellPath('C:\\Windows')).toBe(
      'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe',
    )
  })
})

describe('windowsTempRootRefusal', () => {
  it('accepts only a direct child of the user temporary directory', () => {
    expect(
      windowsTempRootRefusal(
        'C:\\Users\\me\\AppData\\Local\\Temp\\foldkit-devtools-relays',
        'c:\\users\\me\\appdata\\local\\temp',
      ),
    ).toStrictEqual(Option.none())
    expect(
      windowsTempRootRefusal(
        'C:\\Users\\me\\AppData\\Local\\Temp\\custom\\registry',
        'C:\\Users\\me\\AppData\\Local\\Temp',
      ),
    ).toStrictEqual(
      Option.some('is outside the Windows user temporary directory'),
    )
    expect(
      windowsTempRootRefusal(
        'C:\\Users\\other\\registry',
        'C:\\Users\\me\\AppData\\Local\\Temp',
      ),
    ).toStrictEqual(
      Option.some('is outside the Windows user temporary directory'),
    )
  })
})

const probeOutput = (...lines: ReadonlyArray<string>): string =>
  lines
    .map(line => `${line.startsWith('O:') ? 'DIRECTORY\n' : ''}${line}\n`)
    .join('')

type StandInPowerShell = Readonly<{
  executable: string
  runCount: () => Promise<number>
  receivedDirectory: () => Promise<string>
}>

const standInPowerShell = async (
  inputs: Readonly<Record<string, string>>,
): Promise<StandInPowerShell> => {
  const directory = await mkdtemp(join(tmpdir(), 'foldkit-probe-'))
  onTestFinished(() => rm(directory, { recursive: true, force: true }))
  const executable = join(directory, 'powershell')
  await copyFile(STAND_IN_POWERSHELL, executable)
  await chmod(executable, 0o755)

  for (const [name, contents] of Object.entries(inputs)) {
    await writeFile(join(directory, name), contents)
  }

  return {
    executable,
    runCount: async () =>
      (await readFile(join(directory, 'runs'), 'utf-8'))
        .split('\n')
        .filter(line => line !== '').length,
    receivedDirectory: () => readFile(join(directory, 'received'), 'utf-8'),
  }
}

const probe = (executable: string, directory: string) =>
  Effect.runPromise(
    probeWindowsDirectory(Option.some(executable), directory).pipe(
      Effect.provide(NodeServices.layer),
    ),
  )

describe('probeWindowsDirectory', () => {
  it.skipIf(process.platform === 'win32')(
    'reads the descriptor and the user from the probe output',
    async () => {
      const accepted = await standInPowerShell({
        reply: `DIRECTORY\r\n${WINDOWS_ROOT}\r\nDIRECTORY\r\n${PRIVATE}\r\n${IDENTITY}\r\n`,
      })
      const shared = await standInPowerShell({
        reply: probeOutput('', WINDOWS_ROOT, SHARED, IDENTITY),
      })

      expect(await probe(accepted.executable, PROBED_DIRECTORY)).toStrictEqual(
        Option.none(),
      )
      expect(await probe(shared.executable, PROBED_DIRECTORY)).toStrictEqual(
        SHARED_WITH_OTHER_USERS,
      )
    },
  )

  it.skipIf(process.platform === 'win32')(
    'passes the directory through the environment',
    async () => {
      const directory = `C:\\it's "here" $(exit 1)`
      const echoing = await standInPowerShell({})

      expect(await probe(echoing.executable, directory)).toStrictEqual(
        UNVERIFIED_OWNERSHIP,
      )
      expect(await echoing.receivedDirectory()).toBe(directory)
    },
  )

  it.skipIf(process.platform === 'win32')(
    'refuses a reparse-point ancestor',
    async () => {
      const reparse = await standInPowerShell({
        reply: `REPARSE_POINT\n${WINDOWS_ROOT}\nDIRECTORY\n${PRIVATE}\n${IDENTITY}\n`,
      })

      expect(await probe(reparse.executable, PROBED_DIRECTORY)).toStrictEqual(
        REPARSE_PARENT,
      )
    },
  )

  it.skipIf(process.platform === 'win32')(
    'refuses when the probe fails, prints too little, or does not finish',
    async () => {
      const failing = await standInPowerShell({
        reply: probeOutput(WINDOWS_ROOT, PRIVATE, IDENTITY),
        status: '1',
      })
      const silent = await standInPowerShell({
        reply: probeOutput(WINDOWS_ROOT, PRIVATE),
      })
      const anonymous = await standInPowerShell({
        reply: probeOutput(WINDOWS_ROOT, PRIVATE, '"host\\user","unknown"'),
      })
      const hanging = await standInPowerShell({
        reply: probeOutput(WINDOWS_ROOT, PRIVATE, IDENTITY),
        delay: SECONDS_PAST_PROBE_LIMIT,
      })

      expect(await probe(failing.executable, PROBED_DIRECTORY)).toStrictEqual(
        UNVERIFIED_OWNERSHIP,
      )
      expect(await probe(silent.executable, PROBED_DIRECTORY)).toStrictEqual(
        UNVERIFIED_OWNERSHIP,
      )
      expect(await probe(anonymous.executable, PROBED_DIRECTORY)).toStrictEqual(
        UNVERIFIED_OWNERSHIP,
      )
      expect(await probe(hanging.executable, PROBED_DIRECTORY)).toStrictEqual(
        UNVERIFIED_OWNERSHIP,
      )
    },
    PROBE_TEST_TIMEOUT,
  )

  it('refuses when the probe cannot start', async () => {
    const missing = join(tmpdir(), 'foldkit-missing-probe', 'powershell.exe')

    expect(await probe(missing, PROBED_DIRECTORY)).toStrictEqual(
      UNVERIFIED_OWNERSHIP,
    )
  })

  it.skipIf(process.platform === 'win32')(
    'reads the descriptor again on every lookup',
    async () => {
      const changingAccess = await standInPowerShell({
        'reply-1': probeOutput(WINDOWS_ROOT, PRIVATE, IDENTITY),
        'reply-2': probeOutput(WINDOWS_ROOT, SHARED, IDENTITY),
        'reply-3': probeOutput(WINDOWS_ROOT, PRIVATE, IDENTITY),
      })

      expect(
        await probe(changingAccess.executable, PROBED_DIRECTORY),
      ).toStrictEqual(Option.none())
      expect(
        await probe(changingAccess.executable, PROBED_DIRECTORY),
      ).toStrictEqual(SHARED_WITH_OTHER_USERS)
      expect(
        await probe(changingAccess.executable, PROBED_DIRECTORY),
      ).toStrictEqual(Option.none())
      expect(await changingAccess.runCount()).toBe(3)
    },
    PROBE_TEST_TIMEOUT,
  )

  it('refuses without probing when no PowerShell path is known', async () => {
    expect(
      await Effect.runPromise(
        probeWindowsDirectory(Option.none(), PROBED_DIRECTORY).pipe(
          Effect.provide(NodeServices.layer),
        ),
      ),
    ).toStrictEqual(UNVERIFIED_OWNERSHIP)
  })
})

const icaclsPath = (): string =>
  pipe(
    Option.fromNullishOr(process.env['SystemRoot']),
    Option.map(systemRoot => win32.join(systemRoot, 'System32', 'icacls.exe')),
    Option.getOrThrowWith(() => new Error('SystemRoot is not set')),
  )

const describeNativeProbe = (directory: string, spawnedCount: number) => {
  const systemRoots = Object.entries(process.env).filter(
    ([name]) => name.toLowerCase() === 'systemroot',
  )
  const systemRoot = process.env['SystemRoot']

  if (systemRoot === undefined) {
    return { systemRoots, spawnedCount }
  }

  const probe = spawnSync(
    powershellPath(systemRoot),
    ['-NoProfile', '-NonInteractive', '-Command', NATIVE_PROBE_SCRIPT],
    {
      env: {
        ...process.env,
        FOLDKIT_DEVTOOLS_PROBED_DIRECTORY: directory,
      },
      timeout: NATIVE_PROBE_TIMEOUT,
    },
  )

  return {
    systemRoots,
    spawnedCount,
    status: probe.status,
    error: probe.error?.message,
    stdout: probe.stdout?.toString('utf8'),
    stdoutHex: probe.stdout?.toString('hex'),
    stderr: probe.stderr?.toString('utf8'),
    stderrHex: probe.stderr?.toString('hex'),
  }
}

describe('relayRegistryTrust', () => {
  const inspect = (directory: string) =>
    Effect.runPromise(
      relayRegistryTrust
        .inspect(directory)
        .pipe(Effect.provide(NodeServices.layer)),
    )

  it('refuses a symbolic link or junction to a private directory', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'foldkit-trusted-'))
    const linkedDirectory = `${directory}-link`
    onTestFinished(() =>
      rm(linkedDirectory, { recursive: true, force: true }).then(() =>
        rm(directory, { recursive: true, force: true }),
      ),
    )
    await symlink(
      directory,
      linkedDirectory,
      process.platform === 'win32' ? 'junction' : 'dir',
    )

    expect((await inspect(linkedDirectory)).maybeRefusal).toStrictEqual(
      Option.some('is not a regular directory'),
    )
  })

  it('returns the canonical path for a private directory', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'foldkit-trusted-'))
    onTestFinished(() => rm(directory, { recursive: true, force: true }))

    const inspection = await inspect(directory)

    expect(inspection.maybeRefusal).toStrictEqual(Option.none())
    expect(inspection.directory).toBe(await realpath(directory))
  })

  it.skipIf(process.platform === 'win32')(
    'accepts a private directory through a canonical ancestor link',
    async () => {
      const root = await mkdtemp(join(tmpdir(), 'foldkit-trusted-'))
      const target = join(root, 'target')
      const link = join(root, 'link')
      const directory = join(target, 'registry')
      onTestFinished(() => rm(root, { recursive: true, force: true }))
      await mkdir(target, { mode: 0o700 })
      await mkdir(directory, { mode: 0o700 })
      await symlink(target, link, 'dir')

      const inspection = await inspect(join(link, 'registry'))

      expect(inspection.maybeRefusal).toStrictEqual(Option.none())
      expect(inspection.directory).toBe(await realpath(directory))
    },
  )

  it.skipIf(process.platform === 'win32')(
    'accepts a private directory beneath a sticky shared parent',
    async () => {
      const root = await mkdtemp(join(tmpdir(), 'foldkit-trusted-'))
      const parent = join(root, 'shared')
      const directory = join(parent, 'registry')
      onTestFinished(() => rm(root, { recursive: true, force: true }))
      await mkdir(parent)
      await chmod(parent, 0o1777)
      await mkdir(directory, { mode: 0o700 })

      expect((await inspect(directory)).maybeRefusal).toStrictEqual(
        Option.none(),
      )
    },
  )

  it.skipIf(process.platform === 'win32')(
    'refuses a private directory beneath a replaceable parent',
    async () => {
      const root = await mkdtemp(join(tmpdir(), 'foldkit-trusted-'))
      const parent = join(root, 'shared')
      const directory = join(parent, 'registry')
      onTestFinished(() => rm(root, { recursive: true, force: true }))
      await mkdir(parent)
      await chmod(parent, 0o777)
      await mkdir(directory, { mode: 0o700 })

      expect((await inspect(directory)).maybeRefusal).toStrictEqual(
        REPLACEABLE_PARENT,
      )
    },
  )

  it.runIf(process.platform === 'darwin')(
    'refuses macOS allow ACLs on a parent or the registry directory',
    async () => {
      const root = await mkdtemp(join(tmpdir(), 'foldkit-trusted-'))
      const parent = join(root, 'parent')
      const directory = join(parent, 'registry')
      onTestFinished(() => rm(root, { recursive: true, force: true }))
      await mkdir(parent, { mode: 0o700 })
      await mkdir(directory, { mode: 0o700 })

      execFileSync('/bin/chmod', ['+a', 'everyone deny delete', parent])
      expect((await inspect(directory)).maybeRefusal).toStrictEqual(
        Option.none(),
      )

      execFileSync('/bin/chmod', ['+a', 'everyone allow delete_child', parent])
      expect((await inspect(directory)).maybeRefusal).toStrictEqual(
        REPLACEABLE_PARENT,
      )

      execFileSync('/bin/chmod', ['-N', parent])
      execFileSync('/bin/chmod', ['+a', 'everyone allow read', directory])
      expect((await inspect(directory)).maybeRefusal).toStrictEqual(
        SHARED_WITH_OTHER_USERS,
      )
    },
  )

  it('refuses a regular file', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'foldkit-trusted-'))
    const file = join(directory, 'registry')
    onTestFinished(() => rm(directory, { recursive: true, force: true }))
    await writeFile(file, '')

    expect((await inspect(file)).maybeRefusal).toStrictEqual(
      Option.some('is not a regular directory'),
    )
  })

  it('fails closed when the directory cannot be inspected', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'foldkit-trusted-'))
    const missing = join(directory, 'missing')
    onTestFinished(() => rm(directory, { recursive: true, force: true }))

    expect((await inspect(missing)).maybeRefusal).toStrictEqual(
      UNVERIFIED_OWNERSHIP,
    )
  })

  it.runIf(process.platform === 'win32')(
    'reads the access list again on every lookup',
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
      const services = Layer.merge(NodeFileSystem.layer, countingSpawner)
      const lookUp = () =>
        Effect.runPromise(
          relayRegistryTrust.inspect(directory).pipe(Effect.provide(services)),
        ).then(({ maybeRefusal }) => maybeRefusal)

      const firstRefusal = await lookUp()

      expect(
        firstRefusal,
        Option.isSome(firstRefusal)
          ? JSON.stringify(describeNativeProbe(directory, spawned.count))
          : undefined,
      ).toStrictEqual(Option.none())
      expect(spawned.count).toBe(1)

      execFileSync(icaclsPath(), [
        directory,
        '/grant',
        `*${USERS_GROUP_SID}:(OI)(CI)RX`,
      ])
      expect(await lookUp()).toStrictEqual(SHARED_WITH_OTHER_USERS)
      expect(spawned.count).toBe(2)

      execFileSync(icaclsPath(), [
        directory,
        '/remove:g',
        `*${USERS_GROUP_SID}`,
      ])
      expect(await lookUp()).toStrictEqual(Option.none())
      expect(spawned.count).toBe(3)
    },
    PROBE_TEST_TIMEOUT,
  )
})
