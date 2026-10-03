import {
  cpSync,
  lstatSync,
  mkdirSync,
  realpathSync,
  writeFileSync,
} from 'node:fs'
import { join, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  pendingReleaseForMinimum,
  type ChangesetsReleasePlan,
} from './lib/changesets-release-plan.ts'
import {
  assertConsumer,
  fail,
  makePackedConsumerTools,
  messageFor,
  readJson,
  run,
} from './lib/packed-consumer.ts'

const REPO_ROOT = process.cwd()
const DEVTOOLS_DIR = 'packages/devtools'
const FOLDKIT_DIR = 'packages/foldkit'
const UI_DIR = 'packages/ui'
const VITE_PLUGIN_DIR = 'packages/vite-plugin-foldkit'
const CHANGESETS_BIN = fileURLToPath(
  import.meta.resolve('@changesets/cli/bin.js'),
)
const DEVTOOLS_FIXTURE = join(
  REPO_ROOT,
  'scripts/fixtures/packed-devtools-consumer/smoke.spec.mjs',
)

const isSkipBuild = process.argv.includes('--skip-build')

const { log, packPackage, runRequired, withTempDir } = makePackedConsumerTools({
  repoRoot: REPO_ROOT,
  logPrefix: 'packed-devtools',
})

type Manifest = Readonly<{
  name: string
  version: string
  scripts?: Readonly<Record<string, string>>
  dependencies?: Readonly<Record<string, string>>
  peerDependencies?: Readonly<Record<string, string>>
  devDependencies?: Readonly<Record<string, string>>
}>

type DependencyResolution = Readonly<{
  specifier: string
  expectedVersion: string
}>

const readMinimum = (manifest: Manifest, dependency: string): string => {
  const range = manifest.peerDependencies?.[dependency]
  assertConsumer(
    range !== undefined,
    `${manifest.name} has no ${dependency} peer dependency`,
  )
  const match = /^>=\s*(\d+\.\d+\.\d+)$/.exec(range)
  const [, minimum] = match ?? []
  assertConsumer(
    minimum !== undefined,
    `${manifest.name} must declare ${dependency} as an exact ">=" minimum, but found "${range}"`,
  )
  return minimum
}

const assertPendingMinimum = (
  manifest: Manifest,
  minimum: string,
  readPendingReleasePlan: () => ChangesetsReleasePlan,
): void => {
  if (manifest.version === minimum) {
    log(
      `${manifest.name}@${minimum} is not published yet. Using its packed release candidate explicitly.`,
    )
    return
  }

  const pendingRelease = pendingReleaseForMinimum(
    readPendingReleasePlan(),
    manifest.name,
    minimum,
  )
  log(
    `${manifest.name}@${minimum} is not published yet. Using the workspace package covered by the assembled pending ${pendingRelease.type} release.`,
  )
}

const repackWithVersion = (
  packageName: string,
  packageDir: string,
  version: string,
  tempDir: string,
  artifactsDir: string,
): string => {
  const sourceTarball = packPackage(
    `Packing the pending ${version} source...`,
    packageDir,
    artifactsDir,
  )
  const extractedDir = join(
    tempDir,
    'pending-packages',
    encodeURIComponent(packageName),
  )
  mkdirSync(extractedDir, { recursive: true })
  runRequired('Extracting the pending package...', 'tar', [
    '-xzf',
    sourceTarball,
    '-C',
    extractedDir,
  ])

  const packageRoot = join(extractedDir, 'package')
  const manifestPath = join(packageRoot, 'package.json')
  const manifest = readJson<Manifest>(manifestPath)
  writeFileSync(
    manifestPath,
    `${JSON.stringify({ ...manifest, version }, null, 2)}\n`,
  )
  return packPackage(
    `Packing the explicit ${manifest.name}@${version} release candidate...`,
    packageRoot,
    artifactsDir,
  )
}

const resolveMinimum = (
  packageName: string,
  packageDir: string,
  minimum: string,
  tempDir: string,
  artifactsDir: string,
  readPendingReleasePlan: () => ChangesetsReleasePlan,
): DependencyResolution => {
  const registryResult = run('npm', [
    'view',
    `${packageName}@${minimum}`,
    'version',
    '--json',
  ])
  if (registryResult.status === 0) {
    const publishedVersion = JSON.parse(registryResult.stdout)
    assertConsumer(
      publishedVersion === minimum,
      `npm returned ${String(publishedVersion)} for ${packageName}@${minimum}`,
    )
    log(
      `${packageName}@${minimum} is published. The compatibility check will install that registry release.`,
    )
    return { specifier: minimum, expectedVersion: minimum }
  }

  const registryOutput = `${registryResult.stdout}${registryResult.stderr}`
  if (!/\bE404\b/.test(registryOutput)) {
    fail(
      `Could not determine whether ${packageName}@${minimum} is published:\n${registryOutput.trim()}`,
    )
  }

  const workspaceManifest = readJson<Manifest>(
    join(REPO_ROOT, packageDir, 'package.json'),
  )
  assertPendingMinimum(workspaceManifest, minimum, readPendingReleasePlan)
  const tarball =
    workspaceManifest.version === minimum
      ? packPackage(
          `Packing the explicit ${packageName}@${minimum} release candidate...`,
          packageDir,
          artifactsDir,
        )
      : repackWithVersion(
          packageName,
          packageDir,
          minimum,
          tempDir,
          artifactsDir,
        )
  return { specifier: `file:${tarball}`, expectedVersion: minimum }
}

const makePendingReleasePlanReader = (
  tempDir: string,
): (() => ChangesetsReleasePlan) => {
  let releasePlan: ChangesetsReleasePlan | undefined

  return () => {
    if (releasePlan !== undefined) {
      return releasePlan
    }

    const releasePlanPath = join(tempDir, 'changesets-release-plan.json')
    runRequired(
      'Assembling the pending Changesets release plan...',
      process.execPath,
      [CHANGESETS_BIN, 'status', '--output', releasePlanPath],
      { cwd: REPO_ROOT },
    )
    releasePlan = readJson<ChangesetsReleasePlan>(releasePlanPath)
    return releasePlan
  }
}

const writeJson = (path: string, value: unknown): void => {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`)
}

const copyDevtoolsSource = (
  projectDir: string,
  manifest: Manifest,
  foldkitResolution: DependencyResolution,
  uiResolution: DependencyResolution,
  vitePluginTarball: string,
): void => {
  mkdirSync(projectDir, { recursive: true })
  for (const directory of ['src', 'scripts']) {
    cpSync(
      join(REPO_ROOT, DEVTOOLS_DIR, directory),
      join(projectDir, directory),
      { recursive: true },
    )
  }
  for (const fileName of [
    'tsconfig.base.json',
    'tsconfig.build.json',
    'tsconfig.json',
  ]) {
    cpSync(join(REPO_ROOT, DEVTOOLS_DIR, fileName), join(projectDir, fileName))
  }

  writeJson(join(projectDir, 'package.json'), {
    ...manifest,
    private: true,
    devDependencies: {
      ...manifest.devDependencies,
      '@foldkit/ui': uiResolution.specifier,
      '@foldkit/vite-plugin': `file:${vitePluginTarball}`,
      foldkit: foldkitResolution.specifier,
    },
  })
}

const assertInstalledPackage = (
  projectDir: string,
  packageName: string,
  expectedVersion: string,
): void => {
  const packageRoot = join(
    projectDir,
    'node_modules',
    ...packageName.split('/'),
  )
  assertConsumer(
    !lstatSync(packageRoot).isSymbolicLink(),
    `${packageName} resolved through a link instead of an isolated install`,
  )
  const installedRoot = realpathSync(packageRoot)
  const projectRoot = realpathSync(projectDir)
  assertConsumer(
    installedRoot.startsWith(`${projectRoot}${sep}`),
    `${packageName} resolved outside the isolated project: ${installedRoot}`,
  )
  const installedManifest = readJson<Manifest>(
    join(packageRoot, 'package.json'),
  )
  assertConsumer(
    installedManifest.version === expectedVersion,
    `${packageName} resolved to ${installedManifest.version}, expected ${expectedVersion}`,
  )
}

const install = (label: string, projectDir: string): void => {
  runRequired(
    label,
    'npm',
    [
      'install',
      '--no-audit',
      '--no-fund',
      '--legacy-peer-deps',
      '--package-lock=false',
    ],
    { cwd: projectDir },
  )
}

const main = async (): Promise<void> => {
  if (!isSkipBuild) {
    runRequired(
      'Building the packages reused by the isolated DevTools build...',
      'pnpm',
      [
        '--filter',
        'foldkit',
        '--filter',
        '@foldkit/ui',
        '--filter',
        '@foldkit/vite-plugin',
        'build',
      ],
      { inherit: true },
    )
  }

  const devtoolsManifest = readJson<Manifest>(
    join(REPO_ROOT, DEVTOOLS_DIR, 'package.json'),
  )
  const vitePluginManifest = readJson<Manifest>(
    join(REPO_ROOT, VITE_PLUGIN_DIR, 'package.json'),
  )
  const foldkitMinimum = readMinimum(devtoolsManifest, 'foldkit')
  const uiMinimum = readMinimum(devtoolsManifest, '@foldkit/ui')
  const effectVersion = devtoolsManifest.peerDependencies?.['effect']
  const platformBrowserVersion =
    devtoolsManifest.peerDependencies?.['@effect/platform-browser']
  const happyDomVersion = devtoolsManifest.devDependencies?.['happy-dom']
  const vitestVersion = devtoolsManifest.devDependencies?.['vitest']
  assertConsumer(
    effectVersion !== undefined &&
      platformBrowserVersion !== undefined &&
      happyDomVersion !== undefined &&
      vitestVersion !== undefined,
    'Could not read the DevTools peer and smoke-test dependency versions',
  )

  await withTempDir('foldkit-packed-devtools-', async tempDir => {
    const artifactsDir = join(tempDir, 'artifacts')
    mkdirSync(artifactsDir)
    const vitePluginTarball = packPackage(
      'Packing @foldkit/vite-plugin for the isolated build...',
      VITE_PLUGIN_DIR,
      artifactsDir,
    )
    const readPendingReleasePlan = makePendingReleasePlanReader(tempDir)
    const foldkitResolution = resolveMinimum(
      'foldkit',
      FOLDKIT_DIR,
      foldkitMinimum,
      tempDir,
      artifactsDir,
      readPendingReleasePlan,
    )
    const uiResolution = resolveMinimum(
      '@foldkit/ui',
      UI_DIR,
      uiMinimum,
      tempDir,
      artifactsDir,
      readPendingReleasePlan,
    )

    const buildProjectDir = join(tempDir, 'build', DEVTOOLS_DIR)
    mkdirSync(join(tempDir, 'build'), { recursive: true })
    cpSync(
      join(REPO_ROOT, 'tsconfig.base.json'),
      join(tempDir, 'build', 'tsconfig.base.json'),
    )
    copyDevtoolsSource(
      buildProjectDir,
      devtoolsManifest,
      foldkitResolution,
      uiResolution,
      vitePluginTarball,
    )
    install(
      `Installing DevTools with foldkit@${foldkitMinimum} outside the workspace...`,
      buildProjectDir,
    )
    assertInstalledPackage(
      buildProjectDir,
      'foldkit',
      foldkitResolution.expectedVersion,
    )
    assertInstalledPackage(
      buildProjectDir,
      '@foldkit/ui',
      uiResolution.expectedVersion,
    )
    assertInstalledPackage(
      buildProjectDir,
      '@foldkit/vite-plugin',
      vitePluginManifest.version,
    )

    runRequired(
      `Typechecking DevTools against foldkit@${foldkitMinimum}...`,
      'npm',
      ['run', 'typecheck'],
      { cwd: buildProjectDir },
    )
    runRequired(
      `Building DevTools against foldkit@${foldkitMinimum}...`,
      'npm',
      ['run', 'build'],
      { cwd: buildProjectDir },
    )
    const devtoolsTarball = packPackage(
      'Packing the independently built DevTools...',
      buildProjectDir,
      artifactsDir,
    )

    const consumerDir = join(tempDir, 'consumer')
    mkdirSync(consumerDir)
    writeJson(join(consumerDir, 'package.json'), {
      name: 'packed-devtools-consumer',
      private: true,
      version: '0.0.0',
      type: 'module',
      dependencies: {
        '@effect/platform-browser': platformBrowserVersion,
        '@foldkit/devtools': `file:${devtoolsTarball}`,
        '@foldkit/ui': uiResolution.specifier,
        effect: effectVersion,
        foldkit: foldkitResolution.specifier,
      },
      devDependencies: {
        'happy-dom': happyDomVersion,
        vitest: vitestVersion,
      },
    })
    cpSync(DEVTOOLS_FIXTURE, join(consumerDir, 'smoke.spec.mjs'))
    install('Installing the packed DevTools consumer...', consumerDir)
    assertInstalledPackage(
      consumerDir,
      '@foldkit/devtools',
      devtoolsManifest.version,
    )
    assertInstalledPackage(
      consumerDir,
      'foldkit',
      foldkitResolution.expectedVersion,
    )
    assertInstalledPackage(
      consumerDir,
      '@foldkit/ui',
      uiResolution.expectedVersion,
    )
    runRequired(
      'Starting the packed DevTools overlay...',
      'npm',
      [
        'exec',
        '--',
        'vitest',
        'run',
        'smoke.spec.mjs',
        '--environment=happy-dom',
      ],
      { cwd: consumerDir },
    )
  })

  log('PASS')
}

main().catch((error: unknown) => {
  console.error(`[packed-devtools] FAIL: ${messageFor(error)}`)
  process.exit(1)
})
