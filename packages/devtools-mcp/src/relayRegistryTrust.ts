import {
  Array,
  Data,
  Duration,
  Effect,
  FileSystem,
  Option,
  Stream,
  String,
  pipe,
} from 'effect'
import { ChildProcess, ChildProcessSpawner } from 'effect/process'
import { lstat, realpath } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, win32 } from 'node:path'

const PERMISSIONS_BEYOND_OWNER = 0o077
const PARENT_WRITE_PERMISSIONS = 0o022
const STICKY_DIRECTORY = 0o1000
const ROOT_UID = 0
const PROBE_TIMEOUT = Duration.seconds(10)
const PROBED_DIRECTORY_VARIABLE = 'FOLDKIT_DEVTOOLS_PROBED_DIRECTORY'
const DARWIN_ACL_ENTRY_PATTERN = /^\s*\d+:\s+.+\s(allow|deny)\s+\S+/
const DARWIN_DIRECTORY_MODE_PATTERN = /^d[rwxstST-]{9}[+@ ]/
const PROBE_SCRIPT = `$sections = [System.Security.AccessControl.AccessControlSections]::Owner -bor [System.Security.AccessControl.AccessControlSections]::Access; $directories = [System.Collections.Generic.List[string]]::new(); $directory = [System.IO.DirectoryInfo]::new($env:${PROBED_DIRECTORY_VARIABLE}); while ($null -ne $directory) { $directories.Insert(0, $directory.FullName); $directory = $directory.Parent }; foreach ($path in $directories) { $attributes = [System.IO.File]::GetAttributes($path); if (($attributes -band [System.IO.FileAttributes]::ReparsePoint) -ne 0) { 'REPARSE_POINT' } else { 'DIRECTORY' }; ([System.IO.Directory]::GetAccessControl($path)).GetSecurityDescriptorSddlForm($sections) }; & "$env:SystemRoot\\System32\\whoami.exe" /user /fo csv /nh`

const UNVERIFIED_OWNERSHIP = 'has ownership that cannot be verified'
const UNVERIFIED_PERMISSIONS = 'has permissions that cannot be verified'
const OWNED_BY_ANOTHER_USER = 'is owned by another user'
const SHARED_WITH_OTHER_USERS = 'is readable or writable by other users'
const NOT_REGULAR_DIRECTORY = 'is not a regular directory'
const REPLACEABLE_PARENT =
  'has a parent directory that another user can replace'
const REPARSE_PARENT = 'has a reparse-point directory in its path'
const OUTSIDE_WINDOWS_TEMP = 'is outside the Windows user temporary directory'

const SECURITY_DESCRIPTOR_PATTERN =
  /^O:(S-1-[0-9-]+|[A-Z]{2})(?:G:(?:S-1-[0-9-]+|[A-Z]{2}))?(?:D:([A-Z_]*)((?:\([^()]*\))*))?(?:S:.*)?$/
const OWNER_GROUP = 1
const ACCESS_CONTROL_FLAGS_GROUP = 2
const ACCESS_CONTROL_ENTRIES_GROUP = 3
const ACCESS_CONTROL_ENTRY_PATTERN = /\(([^()]*)\)/g
const ACCESS_CONTROL_ENTRY_GROUP = 1
const ACCESS_CONTROL_ENTRY_FIELD_COUNT = 6
const NO_ACCESS_CONTROL_FLAG = 'NO_ACCESS_CONTROL'
const ALLOW_ENTRY_TYPES: ReadonlyArray<string> = ['A', 'OA']
const DENY_ENTRY_TYPES: ReadonlyArray<string> = ['D', 'OD']
const PRIVILEGED_ACCOUNTS: ReadonlyArray<string> = [
  'SY',
  'S-1-5-18',
  'BA',
  'S-1-5-32-544',
  'LA',
]
const TRUSTED_INSTALLER_SID =
  'S-1-5-80-956008885-3418522649-1831038044-1853292631-2271478464'
const CREATOR_ACCOUNTS: ReadonlyArray<string> = [
  'CO',
  'S-1-3-0',
  'OW',
  'S-1-3-4',
]
const QUOTED_CSV_FIELD_PATTERN = /"([^"]*)"/g
const QUOTED_CSV_FIELD_GROUP = 1
const SECURITY_IDENTIFIER_PATTERN = /^S-1-[0-9-]+$/

type AccessControlEntry = Readonly<{
  type: string
  flags: string
  rights: string
  account: string
}>

type SecurityDescriptor = Readonly<{
  owner: string
  flags: string
  entries: ReadonlyArray<AccessControlEntry>
}>

class WindowsProbeFailed extends Data.TaggedError('WindowsProbeFailed')<{}> {}
class DirectoryProbeFailed extends Data.TaggedError(
  'DirectoryProbeFailed',
)<{}> {}

export type RelayRegistryInspection = Readonly<{
  directory: string
  maybeRefusal: Option.Option<string>
}>

export type RelayRegistryTrust = Readonly<{
  inspect: (
    directory: string,
  ) => Effect.Effect<
    RelayRegistryInspection,
    never,
    ChildProcessSpawner.ChildProcessSpawner
  >
}>

type DirectoryInfo = Pick<FileSystem.File.Info, 'mode' | 'uid'>

export const relayRegistryDirectoryRefusal = (
  info: DirectoryInfo,
  maybeCurrentUid: Option.Option<number>,
): Option.Option<string> =>
  Option.match(maybeCurrentUid, {
    onNone: () => Option.some(UNVERIFIED_OWNERSHIP),
    onSome: currentUid => {
      if (Option.isNone(info.uid)) {
        return Option.some(UNVERIFIED_OWNERSHIP)
      }

      if (info.uid.value !== currentUid) {
        return Option.some(OWNED_BY_ANOTHER_USER)
      }

      if ((info.mode & PERMISSIONS_BEYOND_OWNER) !== 0) {
        return Option.some(SHARED_WITH_OTHER_USERS)
      }

      return Option.none()
    },
  })

const posixDirectoryRefusal = (
  modeValue: bigint,
  uidValue: bigint,
): Option.Option<string> => {
  const mode = globalThis.Number(modeValue)
  const uid = globalThis.Number(uidValue)

  if (
    !globalThis.Number.isSafeInteger(mode) ||
    !globalThis.Number.isSafeInteger(uid)
  ) {
    return Option.some(UNVERIFIED_OWNERSHIP)
  }

  return relayRegistryDirectoryRefusal(
    { mode, uid: Option.some(uid) },
    Option.fromNullishOr(process.getuid?.()),
  )
}

const directoryChain = (
  directory: string,
  parentOf: (path: string) => string = dirname,
): ReadonlyArray<string> => {
  const directories: Array<string> = []
  let current = directory

  while (true) {
    directories.push(current)
    const parent = parentOf(current)

    if (parent === current) {
      return Array.reverse(directories)
    }

    current = parent
  }
}

const posixParentChainRefusal = (directory: string) =>
  Effect.tryPromise({
    try: async () => {
      const currentUid = process.getuid?.()

      if (currentUid === undefined) {
        return Option.some(UNVERIFIED_OWNERSHIP)
      }

      for (const component of directoryChain(directory)) {
        const entry = await lstat(component, { bigint: true })
        const uid = globalThis.Number(entry.uid)
        const mode = globalThis.Number(entry.mode)

        if (
          entry.isSymbolicLink() ||
          !entry.isDirectory() ||
          !globalThis.Number.isSafeInteger(uid) ||
          !globalThis.Number.isSafeInteger(mode)
        ) {
          return Option.some(UNVERIFIED_OWNERSHIP)
        }

        if (uid !== currentUid && uid !== ROOT_UID) {
          return Option.some(REPLACEABLE_PARENT)
        }

        const isParent = component !== directory
        const isWritableByOtherUsers = (mode & PARENT_WRITE_PERMISSIONS) !== 0
        const isSticky = (mode & STICKY_DIRECTORY) !== 0

        if (isParent && isWritableByOtherUsers && !isSticky) {
          return Option.some(REPLACEABLE_PARENT)
        }
      }

      return Option.none<string>()
    },
    catch: () => new DirectoryProbeFailed(),
  })

const darwinAclOutputRefusal = (
  output: string,
  isLeaf: boolean,
): Option.Option<string> => {
  const outputLines = String.split(output, /\r?\n/)
  const lines = output.endsWith('\n')
    ? Array.dropRight(outputLines, 1)
    : outputLines
  const maybeSummary = Array.head(lines)

  if (
    Option.isNone(maybeSummary) ||
    !DARWIN_DIRECTORY_MODE_PATTERN.test(maybeSummary.value)
  ) {
    return Option.some(UNVERIFIED_PERMISSIONS)
  }

  for (const line of Array.drop(lines, 1)) {
    const maybeAction = Option.flatMap(
      Option.fromNullishOr(DARWIN_ACL_ENTRY_PATTERN.exec(line)),
      entry => Array.get(entry, 1),
    )

    if (Option.isNone(maybeAction)) {
      return Option.some(UNVERIFIED_PERMISSIONS)
    }

    if (maybeAction.value === 'allow') {
      return Option.some(isLeaf ? SHARED_WITH_OTHER_USERS : REPLACEABLE_PARENT)
    }
  }

  return Option.none()
}

const darwinAclChainRefusal = (
  directory: string,
): Effect.Effect<
  Option.Option<string>,
  DirectoryProbeFailed,
  ChildProcessSpawner.ChildProcessSpawner
> =>
  Effect.gen(function* () {
    const spawner = yield* ChildProcessSpawner.ChildProcessSpawner

    for (const component of directoryChain(directory)) {
      const probe = yield* spawner.spawn(
        ChildProcess.make(
          '/bin/ls',
          ['-l', '-d', '-e', '-P', '-b', '--', component],
          {
            env: { LC_ALL: 'C' },
            extendEnv: true,
            stdin: 'ignore',
            stderr: 'ignore',
          },
        ),
      )
      const [output, exitCode] = yield* Effect.all(
        [
          pipe(probe.stdout, Stream.decodeText, Stream.mkString),
          probe.exitCode,
        ],
        { concurrency: 'unbounded' },
      )

      if (exitCode !== 0) {
        return yield* Effect.fail(new DirectoryProbeFailed())
      }

      const maybeRefusal = darwinAclOutputRefusal(
        output,
        component === directory,
      )

      if (Option.isSome(maybeRefusal)) {
        return maybeRefusal
      }
    }

    return Option.none<string>()
  }).pipe(
    Effect.scoped,
    Effect.mapError(() => new DirectoryProbeFailed()),
    Effect.timeoutOrElse({
      duration: PROBE_TIMEOUT,
      orElse: () => Effect.fail(new DirectoryProbeFailed()),
    }),
  )

const capturedGroup = (
  match: RegExpMatchArray,
  group: number,
): Option.Option<string> =>
  Option.flatMap(Array.get(match, group), Option.fromNullishOr)

const parseAccessControlEntry = (
  entry: string,
): Option.Option<AccessControlEntry> => {
  const fields = String.split(entry, ';')

  if (fields.length !== ACCESS_CONTROL_ENTRY_FIELD_COUNT) {
    return Option.none()
  }

  const type = Array.headNonEmpty(fields)
  const isKnownType =
    Array.contains(ALLOW_ENTRY_TYPES, type) ||
    Array.contains(DENY_ENTRY_TYPES, type)
  if (!isKnownType) {
    return Option.none()
  }

  return Option.all({
    type: Option.some(type),
    flags: Array.get(fields, 1),
    rights: Array.get(fields, 2),
    account: Option.some(Array.lastNonEmpty(fields)),
  })
}

const parseAccessControlEntries = (
  entries: string,
): Option.Option<ReadonlyArray<AccessControlEntry>> =>
  pipe(
    entries,
    String.matchAll(ACCESS_CONTROL_ENTRY_PATTERN),
    Array.fromIterable,
    Array.map(entry =>
      Option.flatMap(
        capturedGroup(entry, ACCESS_CONTROL_ENTRY_GROUP),
        parseAccessControlEntry,
      ),
    ),
    Option.all,
  )

const parseSecurityDescriptor = (
  sddl: string,
): Option.Option<SecurityDescriptor> =>
  Option.flatMap(
    Option.fromNullishOr(SECURITY_DESCRIPTOR_PATTERN.exec(sddl)),
    descriptor =>
      Option.all({
        owner: capturedGroup(descriptor, OWNER_GROUP),
        flags: capturedGroup(descriptor, ACCESS_CONTROL_FLAGS_GROUP),
        entries: Option.flatMap(
          capturedGroup(descriptor, ACCESS_CONTROL_ENTRIES_GROUP),
          parseAccessControlEntries,
        ),
      }),
  )

export const windowsDirectoryRefusal = (
  sddl: string,
  currentUserSid: string,
): Option.Option<string> => {
  const maybeRawDescriptor = Option.fromNullishOr(
    SECURITY_DESCRIPTOR_PATTERN.exec(sddl),
  )

  if (Option.isNone(maybeRawDescriptor)) {
    return Option.some(UNVERIFIED_OWNERSHIP)
  }

  const maybeDescriptor = parseSecurityDescriptor(sddl)

  if (Option.isNone(maybeDescriptor)) {
    return Option.some(UNVERIFIED_PERMISSIONS)
  }

  const { owner, flags, entries } = maybeDescriptor.value

  if (String.includes(NO_ACCESS_CONTROL_FLAG)(flags)) {
    return Option.some(SHARED_WITH_OTHER_USERS)
  }

  const trustedOwners = [currentUserSid, ...PRIVILEGED_ACCOUNTS]

  if (!Array.contains(trustedOwners, owner)) {
    return Option.some(OWNED_BY_ANOTHER_USER)
  }

  const trustedAccounts = [...trustedOwners, ...CREATOR_ACCOUNTS]
  const isSharedWithOtherUsers = Array.some(
    entries,
    ({ type, account }) =>
      Array.contains(ALLOW_ENTRY_TYPES, type) &&
      !Array.contains(trustedAccounts, account),
  )

  if (isSharedWithOtherUsers) {
    return Option.some(SHARED_WITH_OTHER_USERS)
  }

  return Option.none()
}

const SDDL_ACCESS_RIGHT_CODES: ReadonlyArray<string> = [
  'GA',
  'GR',
  'GW',
  'GX',
  'RC',
  'LC',
  'SD',
  'WD',
  'WO',
  'FA',
  'FR',
  'FW',
  'FX',
]
const HEX_ACCESS_RIGHTS_PATTERN = /^0x[0-9a-f]+$/i
const SYMBOLIC_ACCESS_RIGHTS_PATTERN = /[A-Z]{2}/g
const WRITE_DATA_ACCESS = 0x0000_0002
const WRITE_ATTRIBUTES_ACCESS = 0x0000_0100
const DELETE_ACCESS = 0x0001_0000
const DELETE_CHILD_ACCESS = 0x0000_0040
const CHANGE_PERMISSIONS_ACCESS = 0x0004_0000
const TAKE_OWNERSHIP_ACCESS = 0x0008_0000
const GENERIC_ALL_ACCESS = 0x1000_0000
const GENERIC_WRITE_ACCESS = 0x4000_0000
const KNOWN_FILE_ACCESS = 0xf11f_01ff
const CHILD_REPLACEMENT_ACCESS =
  WRITE_DATA_ACCESS |
  WRITE_ATTRIBUTES_ACCESS |
  DELETE_ACCESS |
  CHANGE_PERMISSIONS_ACCESS |
  TAKE_OWNERSHIP_ACCESS |
  GENERIC_ALL_ACCESS |
  GENERIC_WRITE_ACCESS
const PARENT_REPLACEMENT_ACCESS =
  DELETE_CHILD_ACCESS |
  CHANGE_PERMISSIONS_ACCESS |
  TAKE_OWNERSHIP_ACCESS |
  GENERIC_ALL_ACCESS

const symbolicAccessRights = (
  rights: string,
): Option.Option<ReadonlyArray<string>> =>
  Option.flatMap(
    pipe(
      rights,
      String.matchAll(SYMBOLIC_ACCESS_RIGHTS_PATTERN),
      Array.fromIterable,
      Array.map(Array.head),
      Option.all,
    ),
    codes => {
      const isComplete = Array.length(codes) * 2 === rights.length
      const areKnown = Array.every(codes, code =>
        Array.contains(SDDL_ACCESS_RIGHT_CODES, code),
      )

      return isComplete && areKnown && Array.isArrayNonEmpty(codes)
        ? Option.some(codes)
        : Option.none()
    },
  )

const accessGrantsReplacement = (
  rights: string,
  mask: number,
  symbolicRights: ReadonlyArray<string>,
): Option.Option<boolean> => {
  if (HEX_ACCESS_RIGHTS_PATTERN.test(rights)) {
    const parsed = globalThis.Number.parseInt(rights.slice(2), 16)
    const isKnownMask =
      globalThis.Number.isSafeInteger(parsed) &&
      parsed <= 0xffff_ffff &&
      ((parsed >>> 0) & ~KNOWN_FILE_ACCESS) === 0

    return isKnownMask ? Option.some((parsed & mask) !== 0) : Option.none()
  }

  return Option.map(symbolicAccessRights(rights), codes =>
    Array.some(codes, code =>
      Array.contains([...symbolicRights, 'GA', 'FA'], code),
    ),
  )
}

export const windowsDirectoryChainRefusal = (
  descriptors: ReadonlyArray<string>,
  currentUserSid: string,
): Option.Option<string> => {
  if (Option.isNone(Array.head(descriptors))) {
    return Option.some(UNVERIFIED_OWNERSHIP)
  }

  const maybeParentDescriptors = Option.all(
    Array.map(Array.dropRight(descriptors, 1), parseSecurityDescriptor),
  )

  if (Option.isNone(maybeParentDescriptors)) {
    return Option.some(UNVERIFIED_PERMISSIONS)
  }

  const parentDescriptors = maybeParentDescriptors.value
  const trustedParentOwners = [
    currentUserSid,
    ...PRIVILEGED_ACCOUNTS,
    TRUSTED_INSTALLER_SID,
  ]
  const trustedAccounts = [...trustedParentOwners, ...CREATOR_ACCOUNTS]

  for (const [index, descriptor] of parentDescriptors.entries()) {
    if (!Array.contains(trustedParentOwners, descriptor.owner)) {
      return Option.some(REPLACEABLE_PARENT)
    }

    if (String.includes(NO_ACCESS_CONTROL_FLAG)(descriptor.flags)) {
      return Option.some(REPLACEABLE_PARENT)
    }

    const isRoot = index === 0

    for (const entry of descriptor.entries) {
      const isUntrustedAllow =
        Array.contains(ALLOW_ENTRY_TYPES, entry.type) &&
        !Array.contains(trustedAccounts, entry.account) &&
        !String.includes('IO')(entry.flags)

      if (!isUntrustedAllow) {
        continue
      }

      const maybeCanReplaceSelf = isRoot
        ? Option.some(false)
        : accessGrantsReplacement(entry.rights, CHILD_REPLACEMENT_ACCESS, [
            'SD',
            'WD',
            'WO',
            'FW',
            'GW',
          ])
      const maybeCanReplaceChild = accessGrantsReplacement(
        entry.rights,
        PARENT_REPLACEMENT_ACCESS,
        ['DC', 'WD', 'WO'],
      )
      const maybeCanReplace = Option.map(
        Option.all([maybeCanReplaceSelf, maybeCanReplaceChild]),
        Array.some(value => value),
      )

      if (Option.isNone(maybeCanReplace)) {
        return Option.some(UNVERIFIED_PERMISSIONS)
      }

      if (maybeCanReplace.value) {
        return Option.some(REPLACEABLE_PARENT)
      }
    }
  }

  return Option.none()
}

export const powershellPath = (systemRoot: string): string =>
  win32.join(
    systemRoot,
    'System32',
    'WindowsPowerShell',
    'v1.0',
    'powershell.exe',
  )

export const windowsTempRootRefusal = (
  directory: string,
  tempRoot: string,
): Option.Option<string> =>
  win32.relative(tempRoot, win32.dirname(directory)) === ''
    ? Option.none()
    : Option.some(OUTSIDE_WINDOWS_TEMP)

const currentUserSidFromCsv = (identity: string): Option.Option<string> =>
  pipe(
    identity,
    String.matchAll(QUOTED_CSV_FIELD_PATTERN),
    Array.fromIterable,
    Array.map(field => capturedGroup(field, QUOTED_CSV_FIELD_GROUP)),
    Array.getSomes,
    Array.findLast(field => SECURITY_IDENTIFIER_PATTERN.test(field)),
  )

const probeOutputRefusal = (
  output: string,
  directory: string,
): Effect.Effect<Option.Option<string>, WindowsProbeFailed> => {
  const lines = pipe(
    output,
    String.split(/\r?\n/),
    Array.map(String.trim),
    Array.filter(String.isNonEmpty),
  )
  const maybeCurrentUserSid = Option.flatMap(
    Array.last(lines),
    currentUserSidFromCsv,
  )
  const directoryResults = Array.take(lines, Array.length(lines) - 1)
  const expectedDirectoryCount = Array.length(
    directoryChain(directory, win32.dirname),
  )

  return Option.match(maybeCurrentUserSid, {
    onNone: () => Effect.fail(new WindowsProbeFailed()),
    onSome: currentUserSid => {
      if (Array.length(directoryResults) !== expectedDirectoryCount * 2) {
        return Effect.fail(new WindowsProbeFailed())
      }

      const results = Array.chunksOf(directoryResults, 2)
      const kinds = Array.getSomes(Array.map(results, Array.head))
      const descriptors = Array.getSomes(Array.map(results, Array.last))

      if (
        Array.length(kinds) !== expectedDirectoryCount ||
        Array.length(descriptors) !== expectedDirectoryCount
      ) {
        return Effect.fail(new WindowsProbeFailed())
      }

      if (
        Array.some(
          kinds,
          kind => kind !== 'DIRECTORY' && kind !== 'REPARSE_POINT',
        )
      ) {
        return Effect.fail(new WindowsProbeFailed())
      }

      if (Array.some(kinds, kind => kind === 'REPARSE_POINT')) {
        return Effect.succeed(Option.some(REPARSE_PARENT))
      }

      const maybeLeafDescriptor = Array.last(descriptors)

      return Option.match(maybeLeafDescriptor, {
        onNone: () => Effect.fail(new WindowsProbeFailed()),
        onSome: leafDescriptor =>
          Effect.succeed(
            Option.orElse(
              windowsDirectoryChainRefusal(descriptors, currentUserSid),
              () => windowsDirectoryRefusal(leafDescriptor, currentUserSid),
            ),
          ),
      })
    },
  })
}

const readWindowsDirectoryRefusal = (
  directory: string,
  executable: string,
): Effect.Effect<
  Option.Option<string>,
  WindowsProbeFailed,
  ChildProcessSpawner.ChildProcessSpawner
> =>
  Effect.gen(function* () {
    const spawner = yield* ChildProcessSpawner.ChildProcessSpawner
    const probe = yield* spawner.spawn(
      ChildProcess.make(
        executable,
        ['-NoProfile', '-NonInteractive', '-Command', PROBE_SCRIPT],
        {
          env: { [PROBED_DIRECTORY_VARIABLE]: directory },
          extendEnv: true,
          stdin: 'ignore',
          stderr: 'ignore',
        },
      ),
    )
    const [output, exitCode] = yield* Effect.all(
      [pipe(probe.stdout, Stream.decodeText, Stream.mkString), probe.exitCode],
      { concurrency: 'unbounded' },
    )

    if (exitCode === 0) {
      return yield* probeOutputRefusal(output, directory)
    } else {
      return yield* Effect.fail(new WindowsProbeFailed())
    }
  }).pipe(
    Effect.scoped,
    Effect.mapError(() => new WindowsProbeFailed()),
    Effect.timeoutOrElse({
      duration: PROBE_TIMEOUT,
      orElse: () => Effect.fail(new WindowsProbeFailed()),
    }),
  )

export const probeWindowsDirectory = (
  maybeExecutable: Option.Option<string>,
  directory: string,
): Effect.Effect<
  Option.Option<string>,
  never,
  ChildProcessSpawner.ChildProcessSpawner
> =>
  Option.match(maybeExecutable, {
    onNone: () => Effect.succeed(Option.some(UNVERIFIED_OWNERSHIP)),
    onSome: executable =>
      readWindowsDirectoryRefusal(directory, executable).pipe(
        Effect.orElseSucceed(() => Option.some(UNVERIFIED_OWNERSHIP)),
      ),
  })

const probeDirectoryEntry = (directory: string) =>
  Effect.tryPromise({
    try: async () => {
      const entry = await lstat(directory, { bigint: true })

      if (entry.isSymbolicLink() || !entry.isDirectory()) {
        return {
          directory,
          entry,
          maybeRefusal: Option.some(NOT_REGULAR_DIRECTORY),
        }
      }

      const canonicalDirectory = await realpath(directory)
      const canonicalEntry = await lstat(canonicalDirectory, { bigint: true })
      const isSameEntry =
        entry.dev === canonicalEntry.dev && entry.ino === canonicalEntry.ino

      return {
        directory: canonicalDirectory,
        entry: canonicalEntry,
        maybeRefusal: isSameEntry
          ? Option.none<string>()
          : Option.some(UNVERIFIED_OWNERSHIP),
      }
    },
    catch: () => new DirectoryProbeFailed(),
  })

export const relayRegistryTrust: RelayRegistryTrust = {
  inspect: directory =>
    Effect.gen(function* () {
      const probe = yield* probeDirectoryEntry(directory)

      if (Option.isSome(probe.maybeRefusal)) {
        return {
          directory: probe.directory,
          maybeRefusal: probe.maybeRefusal,
        }
      }

      const maybeRefusal =
        process.platform === 'win32'
          ? yield* Effect.gen(function* () {
              const tempRoot = yield* Effect.tryPromise({
                try: () => realpath(tmpdir()),
                catch: () => new DirectoryProbeFailed(),
              })
              const maybeLocationRefusal = windowsTempRootRefusal(
                probe.directory,
                tempRoot,
              )

              if (Option.isSome(maybeLocationRefusal)) {
                return maybeLocationRefusal
              }

              return yield* probeWindowsDirectory(
                Option.map(
                  Option.fromNullishOr(process.env['SystemRoot']),
                  powershellPath,
                ),
                probe.directory,
              )
            })
          : yield* posixParentChainRefusal(probe.directory).pipe(
              Effect.flatMap(maybeParentRefusal => {
                if (Option.isSome(maybeParentRefusal)) {
                  return Effect.succeed(maybeParentRefusal)
                }

                const maybeLeafRefusal = posixDirectoryRefusal(
                  probe.entry.mode,
                  probe.entry.uid,
                )

                if (Option.isSome(maybeLeafRefusal)) {
                  return Effect.succeed(maybeLeafRefusal)
                }

                return process.platform === 'darwin'
                  ? darwinAclChainRefusal(probe.directory)
                  : Effect.succeed(Option.none<string>())
              }),
            )

      if (Option.isSome(maybeRefusal)) {
        return { directory: probe.directory, maybeRefusal }
      }

      const confirmation = yield* probeDirectoryEntry(directory)
      const isSameDirectory =
        Option.isNone(confirmation.maybeRefusal) &&
        confirmation.directory === probe.directory &&
        confirmation.entry.dev === probe.entry.dev &&
        confirmation.entry.ino === probe.entry.ino

      return {
        directory: probe.directory,
        maybeRefusal: isSameDirectory
          ? Option.none<string>()
          : Option.some(UNVERIFIED_OWNERSHIP),
      }
    }).pipe(
      Effect.orElseSucceed(() => ({
        directory,
        maybeRefusal: Option.some(UNVERIFIED_OWNERSHIP),
      })),
    ),
}
