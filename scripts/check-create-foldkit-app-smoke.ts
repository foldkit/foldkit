import { spawnSync } from 'node:child_process'
import {
  cpSync,
  existsSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join, relative, sep } from 'node:path'

import { EXAMPLE_VALUES } from '../packages/create-foldkit-app/src/examples.js'

const PACKAGE_DIR = 'packages/create-foldkit-app'
const OXLINT_PLUGIN_DIR = 'packages/oxlint-plugin-foldkit'
const TEMPLATE_DIR = join(PACKAGE_DIR, 'templates/base')
const PACKAGE_MANAGER_TEMPLATE_DIR = join(
  PACKAGE_DIR,
  'templates/package-managers',
)
const PNPM_WORKSPACE_POLICY_PATH = join(
  PACKAGE_MANAGER_TEMPLATE_DIR,
  'pnpm',
  'pnpm-workspace.yaml',
)
const PNPM_WORKSPACE_POLICY = `allowBuilds:
  esbuild: true
  msgpackr-extract: false
`
const pnpmExecutable = process.env['FOLDKIT_PNPM_EXECUTABLE'] ?? 'pnpm'
const isSkipBuild = process.argv.includes('--skip-build')
const LINT_SMOKE_SOURCE = `const Command = {
  define: (name: string) => () => ({ name }),
}

const defineMessageUnion = <Cases>(cases: Cases): Cases => cases

const Message = defineMessageUnion({
  ClickedSave: {},
  GotChildMessage: { message: {} },
})
const SaveUser = Command.define('SaveUser')()

console.log(Message, SaveUser)
`

type RunOptions = {
  readonly cwd?: string
  readonly env?: Readonly<Record<string, string>>
  readonly inherit?: boolean
  readonly input?: string
  readonly timeoutMs?: number
}

type RunResult = {
  readonly stdout: string
  readonly stderr: string
  readonly status: number | null
}

type TemplatePackageJson = {
  readonly scripts?: {
    readonly lint?: string
  }
}

type OxfmtConfig = {
  readonly sortImports?: {
    readonly ignoreCase?: boolean
    readonly customGroups?: ReadonlyArray<{
      readonly groupName?: string
      readonly elementNamePattern?: ReadonlyArray<string>
    }>
    readonly groups?: ReadonlyArray<string | ReadonlyArray<string>>
  }
}

type PackOutput = ReadonlyArray<{
  readonly filename?: string
}>

type ReleaseManifest = Readonly<{
  schemaVersion: number
  channel: string
  sourceCommit: string
  packages: Readonly<Record<string, string>>
  dependencies: Readonly<Record<string, string>>
}>

type WorkspaceListEntry = Readonly<{
  path?: string
}>

type PackageMetadata = {
  readonly name?: string
  readonly version?: string
}

class SmokeError extends Error {}

const log = (message: string): void => {
  console.log(`[smoke] ${message}`)
}

const fail = (message: string): never => {
  throw new SmokeError(message)
}

const assertSmoke: (
  condition: boolean,
  message: string,
) => asserts condition = (
  condition: boolean,
  message: string,
): asserts condition => {
  if (!condition) {
    fail(message)
  }
}

const parseJson = <T>(raw: string): T => JSON.parse(raw) as T

const readJson = <T>(path: string): T =>
  parseJson<T>(readFileSync(path, 'utf-8'))

const run = (
  command: string,
  args: ReadonlyArray<string>,
  options: RunOptions = {},
): RunResult => {
  const result = spawnSync(command, [...args], {
    cwd: options.cwd,
    encoding: 'utf-8',
    env:
      options.env === undefined
        ? process.env
        : { ...process.env, ...options.env },
    input: options.input,
    stdio: options.inherit ? 'inherit' : 'pipe',
    timeout: options.timeoutMs ?? 60_000,
  })

  return {
    stdout: typeof result.stdout === 'string' ? result.stdout : '',
    stderr: typeof result.stderr === 'string' ? result.stderr : '',
    status: result.status,
  }
}

const runRequired = (
  label: string,
  command: string,
  args: ReadonlyArray<string>,
  options: RunOptions = {},
): RunResult => {
  log(label)
  const result = run(command, args, options)
  if (result.status !== 0) {
    const output = `${result.stdout}${result.stderr}`.trim()
    fail(`${label} failed${output === '' ? '' : `:\n${output}`}`)
  }
  return result
}

const packPackage = (label: string, packageDir: string): string => {
  const result = runRequired(label, 'npm', ['pack', '--json'], {
    cwd: packageDir,
  })
  const packOutput = parseJson<PackOutput>(result.stdout)
  const tarballFilename = packOutput.at(0)?.filename
  assertSmoke(
    tarballFilename !== undefined,
    `${label} did not return a tarball filename`,
  )

  log(`Created ${tarballFilename}`)
  return join(process.cwd(), packageDir, tarballFilename)
}

const readTarballFile = (tarballPath: string, path: string): string =>
  runRequired(`Reading ${path} from packed create-foldkit-app...`, 'tar', [
    '-xOf',
    tarballPath,
    `package/${path}`,
  ]).stdout

const publicWorkspaceVersions = (): Readonly<Record<string, string>> => {
  const result = runRequired(
    'Discovering public workspace packages...',
    pnpmExecutable,
    ['ls', '-r', '--depth', '-1', '--json'],
  )
  const entries = parseJson<ReadonlyArray<WorkspaceListEntry>>(result.stdout)

  return Object.fromEntries(
    entries.flatMap(entry => {
      if (entry.path === undefined) {
        return []
      }

      const manifest = readJson<{
        name?: string
        version?: string
        private?: boolean
      }>(join(entry.path, 'package.json'))

      return manifest.private !== true &&
        manifest.name !== undefined &&
        manifest.version !== undefined
        ? [[manifest.name, manifest.version]]
        : []
    }),
  )
}

const currentCommit = (): string =>
  runRequired('Resolving the packed source commit...', 'git', [
    'rev-parse',
    'HEAD',
  ]).stdout.trim()

const listTreeFiles = (root: string): ReadonlyArray<string> => {
  const files: Array<string> = []

  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name)

      if (entry.isDirectory()) {
        walk(path)
      } else if (entry.isFile()) {
        files.push(relative(root, path).split(sep).join('/'))
      }
    }
  }

  walk(root)
  return files.sort()
}

const assertPackedScaffoldSources = (tarballPath: string): void => {
  withTempDir('create-foldkit-artifact-', tempDir => {
    runRequired('Extracting packed scaffold sources...', 'tar', [
      '-xzf',
      tarballPath,
      '-C',
      tempDir,
    ])

    for (const example of [...EXAMPLE_VALUES, 'ssg', 'ssr']) {
      const expectedRoot = join('examples', example)
      const packedRoot = join(
        tempDir,
        'package/dist/templates/examples',
        example,
      )

      assertSmoke(
        existsSync(packedRoot),
        `packed CLI is missing the ${example} scaffold`,
      )

      const expectedFiles = listTreeFiles(expectedRoot).filter(
        path => path === 'package.json' || path.startsWith('src/'),
      )
      const packedFiles = listTreeFiles(packedRoot)
      assertSmoke(
        JSON.stringify(packedFiles) === JSON.stringify(expectedFiles),
        `packed CLI ${example} scaffold file set does not match the release commit`,
      )

      for (const path of expectedFiles) {
        assertSmoke(
          readFileSync(join(packedRoot, path)).equals(
            readFileSync(join(expectedRoot, path)),
          ),
          `packed CLI ${example}/${path} does not match the release commit`,
        )
      }
    }
  })
}

const assertPackedReleaseInputs = (tarballPath: string): void => {
  log('Checking immutable scaffold inputs in the packed CLI...')

  const releaseManifest = parseJson<ReleaseManifest>(
    readTarballFile(tarballPath, 'dist/templates/release.json'),
  )
  const commit = currentCommit()

  assertSmoke(
    releaseManifest.schemaVersion === 1 &&
      releaseManifest.channel === 'stable' &&
      releaseManifest.sourceCommit === commit,
    'packed stable CLI release metadata does not identify the commit that built it',
  )

  const releasedPackages = Object.entries(releaseManifest.packages).sort()
  const publicPackages = Object.entries(publicWorkspaceVersions()).sort()
  assertSmoke(
    JSON.stringify(releasedPackages) === JSON.stringify(publicPackages),
    'packed CLI release metadata does not cover the complete public workspace package set',
  )

  assertPackedScaffoldSources(tarballPath)

  const packageRuntime = readTarballFile(tarballPath, 'dist/utils/packages.js')
  const fileRuntime = readTarballFile(tarballPath, 'dist/utils/files.js')
  for (const runtime of [packageRuntime, fileRuntime]) {
    assertSmoke(
      !runtime.includes('raw.githubusercontent.com') &&
        !runtime.includes('api.github.com') &&
        !runtime.includes('registry.npmjs.org'),
      'packed CLI still fetches a moving scaffold or package source',
    )
  }
}

const canaryReleaseManifest = (): ReleaseManifest => {
  const commit = currentCommit()
  const packages = Object.fromEntries(
    Object.entries(publicWorkspaceVersions()).map(([name, version]) => [
      name,
      `${version}-canary.${commit.slice(0, 12)}`,
    ]),
  )

  return {
    schemaVersion: 1,
    channel: 'canary',
    sourceCommit: commit,
    packages,
    dependencies: {},
  }
}

const assertPackedCanaryManifest = (
  tarballPath: string,
  expected: ReleaseManifest,
): void => {
  log('Checking commit-addressed canary metadata in the packed CLI...')

  const actual = parseJson<ReleaseManifest>(
    readTarballFile(tarballPath, 'dist/templates/release.json'),
  )

  assertSmoke(
    actual.schemaVersion === expected.schemaVersion &&
      actual.channel === expected.channel &&
      actual.sourceCommit === expected.sourceCommit &&
      JSON.stringify(Object.entries(actual.packages).sort()) ===
        JSON.stringify(Object.entries(expected.packages).sort()),
    'packed canary CLI does not preserve its commit-addressed package snapshot',
  )
}

const assertTemplateTooling = (): void => {
  log('Checking scaffold tooling template...')
  const packageJson = readJson<TemplatePackageJson>(
    join(TEMPLATE_DIR, 'package.json'),
  )
  assertSmoke(
    packageJson.scripts?.lint === 'oxlint src',
    'template package.json lint script must be scoped to src (oxlint src)',
  )
  assertSmoke(
    existsSync(join(TEMPLATE_DIR, '.oxlintrc.json')),
    'template must include .oxlintrc.json',
  )
  assertSmoke(
    !existsSync(join(TEMPLATE_DIR, 'eslint.config.mjs')),
    'template must not include eslint.config.mjs',
  )

  assertSmoke(
    !existsSync(join(TEMPLATE_DIR, '.prettierrc')) &&
      !existsSync(join(TEMPLATE_DIR, '.prettierignore')),
    'template must not include Prettier config files',
  )

  const oxfmtConfig = readJson<OxfmtConfig>(join(TEMPLATE_DIR, '.oxfmtrc.json'))
  const keepsImportSorting =
    oxfmtConfig.sortImports?.ignoreCase === false &&
    oxfmtConfig.sortImports.customGroups?.some(
      group =>
        group.groupName === 'scoped' &&
        JSON.stringify(group.elementNamePattern) ===
          JSON.stringify(['@*', '@*/**']),
    ) === true &&
    JSON.stringify(oxfmtConfig.sortImports.groups) ===
      JSON.stringify([
        ['builtin', 'external'],
        'scoped',
        ['parent', 'sibling', 'index'],
        'unknown',
      ])

  assertSmoke(
    keepsImportSorting,
    'template must keep the Oxfmt import sorting setup',
  )
}

const assertPnpmWorkspacePolicy = (): void => {
  log('Checking pnpm scaffold build policy...')
  assertSmoke(
    !existsSync(join(TEMPLATE_DIR, 'pnpm-workspace.yaml')),
    'base template must not include pnpm-workspace.yaml because non-pnpm scaffolds should not get pnpm config',
  )
  assertSmoke(
    existsSync(PNPM_WORKSPACE_POLICY_PATH),
    'pnpm package manager template must include pnpm-workspace.yaml',
  )
  assertSmoke(
    readFileSync(PNPM_WORKSPACE_POLICY_PATH, 'utf-8') === PNPM_WORKSPACE_POLICY,
    'pnpm package manager template must allow esbuild and deny msgpackr-extract builds through allowBuilds',
  )
}

const readDirectory = (dir: string): ReadonlyArray<string> => {
  try {
    return readdirSync(dir)
  } catch {
    return []
  }
}

const isDirectory = (path: string): boolean => {
  try {
    return statSync(path).isDirectory()
  } catch {
    return false
  }
}

const readPackageMetadata = (path: string): PackageMetadata | undefined => {
  if (!existsSync(path)) {
    return undefined
  }
  try {
    return readJson<PackageMetadata>(path)
  } catch {
    return undefined
  }
}

const findEffectInstalls = (root: string): ReadonlyArray<string> => {
  const found: Array<string> = []
  const walk = (dir: string): void => {
    for (const entry of readDirectory(dir)) {
      const full = join(dir, entry)
      if (!isDirectory(full)) {
        continue
      }

      const metadata = readPackageMetadata(join(full, 'package.json'))
      if (metadata?.name === 'effect') {
        found.push(`${full} (${metadata.version ?? 'unknown version'})`)
      }

      walk(full)
    }
  }

  walk(root)
  return found
}

const assertScaffoldLintWorks = (
  tempDir: string,
  pluginTarballPath: string,
): void => {
  const lintProjectPath = join(tempDir, 'lint-app')
  cpSync(TEMPLATE_DIR, lintProjectPath, { recursive: true })
  writeFileSync(join(lintProjectPath, 'src/lint-smoke.ts'), LINT_SMOKE_SOURCE)

  runRequired(
    'Installing local oxlint plugin tarball into scaffold lint smoke app...',
    'npm',
    [
      'install',
      '--no-audit',
      '--no-fund',
      '--save-dev',
      'oxlint',
      pluginTarballPath,
    ],
    { cwd: lintProjectPath, inherit: true },
  )

  runRequired(
    'Running scaffold lint script with @foldkit/oxlint-plugin...',
    'npm',
    ['run', 'lint'],
    { cwd: lintProjectPath, inherit: true },
  )
}

const installPackedCli = (tempDir: string, tarballPath: string): void => {
  runRequired('Initializing temp npm project...', 'npm', ['init', '-y'], {
    cwd: tempDir,
  })
  runRequired(
    'Installing tarball via npm (reproduces hoisting behavior)...',
    'npm',
    ['install', tarballPath, '--no-audit', '--no-fund'],
    { cwd: tempDir, inherit: true },
  )
}

const assertSingleEffectInstall = (tempDir: string): void => {
  log('Checking for duplicate effect installs...')
  const effectInstalls = findEffectInstalls(join(tempDir, 'node_modules'))
  assertSmoke(
    effectInstalls.length === 1,
    `Expected exactly 1 effect install, found ${effectInstalls.length}:\n${effectInstalls.join('\n')}\n\n` +
      'This indicates a transitive dependency drift that will cross-link incompatible Effect runtimes.',
  )
  log(`Single effect install: ${effectInstalls[0]}`)
}

const assertCliStarts = (tempDir: string): void => {
  log('Running CLI to exercise the Effect runtime initialization...')
  const cliResult = run(
    'node',
    [join(tempDir, 'node_modules/.bin/create-foldkit-app')],
    {
      input: '',
      timeoutMs: 3_000,
    },
  )
  const combinedOutput = `${cliResult.stdout}${cliResult.stderr}`

  assertSmoke(
    !combinedOutput.includes('asEffect'),
    `Effect runtime crashed at startup. This usually means duplicate effect installs with mismatched internal protocols.\n\noutput:\n${combinedOutput}`,
  )
  log('CLI initialized without runtime crash')
}

const withTempDir = (
  prefix: string,
  useTempDir: (tempDir: string) => void,
): void => {
  const tempDir = mkdtempSync(join(tmpdir(), prefix))
  log(`Temp dir: ${tempDir}`)
  try {
    useTempDir(tempDir)
  } finally {
    log('Cleaning up temp dir...')
    rmSync(tempDir, { recursive: true, force: true })
  }
}

const cleanupFiles = (paths: ReadonlyArray<string>): void => {
  for (const path of paths) {
    rmSync(path, { force: true })
  }
}

const main = (): void => {
  const tarballPaths: Array<string> = []

  try {
    assertTemplateTooling()
    assertPnpmWorkspacePolicy()

    if (!isSkipBuild) {
      runRequired(
        'Building create-foldkit-app...',
        pnpmExecutable,
        ['--filter', 'create-foldkit-app', 'build'],
        { inherit: true },
      )
      runRequired(
        'Building @foldkit/oxlint-plugin...',
        pnpmExecutable,
        ['--filter', '@foldkit/oxlint-plugin', 'build'],
        { inherit: true },
      )
    }

    withTempDir('create-foldkit-canary-manifest-', tempDir => {
      const releaseManifest = canaryReleaseManifest()
      const releaseManifestPath = join(tempDir, 'release.json')

      writeFileSync(
        releaseManifestPath,
        `${JSON.stringify(releaseManifest, null, 2)}\n`,
      )

      try {
        runRequired(
          'Building configured canary scaffold inputs...',
          'node',
          [join(PACKAGE_DIR, 'scripts/build-templates.mjs')],
          { env: { FOLDKIT_RELEASE_MANIFEST: releaseManifestPath } },
        )

        const canaryTarballPath = packPackage(
          'Packing canary create-foldkit-app tarball...',
          PACKAGE_DIR,
        )

        tarballPaths.push(canaryTarballPath)

        assertPackedCanaryManifest(canaryTarballPath, releaseManifest)
      } finally {
        runRequired('Restoring stable scaffold inputs...', 'node', [
          join(PACKAGE_DIR, 'scripts/build-templates.mjs'),
        ])
      }
    })

    const tarballPath = packPackage(
      'Packing create-foldkit-app tarball...',
      PACKAGE_DIR,
    )

    tarballPaths.push(tarballPath)

    assertPackedReleaseInputs(tarballPath)

    const pluginTarballPath = packPackage(
      'Packing @foldkit/oxlint-plugin tarball...',
      OXLINT_PLUGIN_DIR,
    )

    tarballPaths.push(pluginTarballPath)

    withTempDir('create-foldkit-smoke-', tempDir => {
      assertScaffoldLintWorks(tempDir, pluginTarballPath)
      installPackedCli(tempDir, tarballPath)
      assertSingleEffectInstall(tempDir)
      assertCliStarts(tempDir)
    })
  } finally {
    cleanupFiles(tarballPaths)
  }

  log('PASS')
}

try {
  main()
} catch (error) {
  const message =
    error instanceof SmokeError
      ? error.message
      : error instanceof Error
        ? (error.stack ?? error.message)
        : String(error)

  console.error(`[smoke] FAIL: ${message}`)
  process.exit(1)
}
