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
import { join } from 'node:path'

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
  msgpackr-extract: false
`
const LINT_SMOKE_SOURCE = `const Command = {
  define: (name: string) => () => ({ name }),
}

const m = (tag: string, fields?: unknown) => ({ tag, fields })

const ClickedSave = m('ClickedSave')
const GotChildMessage = m('GotChildMessage', { message: {} })
const SaveUser = Command.define('SaveUser')()

console.log(ClickedSave, GotChildMessage, SaveUser)
`

type RunOptions = {
  readonly cwd?: string
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

type PrettierConfig = {
  readonly importOrder?: ReadonlyArray<string>
  readonly importOrderSortSpecifiers?: boolean
  readonly plugins?: ReadonlyArray<string>
}

type PackOutput = ReadonlyArray<{
  readonly filename?: string
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
  const tarballFilename = packOutput[0]?.filename
  assertSmoke(
    tarballFilename !== undefined,
    `${label} did not return a tarball filename`,
  )

  log(`Created ${tarballFilename}`)
  return join(process.cwd(), packageDir, tarballFilename)
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

  const prettierConfig = readJson<PrettierConfig>(
    join(TEMPLATE_DIR, '.prettierrc'),
  )
  const keepsImportSorting =
    prettierConfig.importOrder?.join('|') ===
      '<THIRD_PARTY_MODULES>|^@|^[./]' &&
    prettierConfig.importOrderSortSpecifiers === true &&
    prettierConfig.plugins?.includes(
      '@trivago/prettier-plugin-sort-imports',
    ) === true

  assertSmoke(
    keepsImportSorting,
    'template must keep the Prettier import sorting setup',
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
    'pnpm package manager template must deny msgpackr-extract builds through allowBuilds',
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
    runRequired(
      'Building create-foldkit-app...',
      'pnpm',
      ['--filter', 'create-foldkit-app', 'build'],
      { inherit: true },
    )
    runRequired(
      'Building @foldkit/oxlint-plugin...',
      'pnpm',
      ['--filter', '@foldkit/oxlint-plugin', 'build'],
      { inherit: true },
    )

    const tarballPath = packPackage(
      'Packing create-foldkit-app tarball...',
      PACKAGE_DIR,
    )
    tarballPaths.push(tarballPath)

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
