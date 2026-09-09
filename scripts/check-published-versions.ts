import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

// NOTE: Every Foldkit version the website is about to reference is on npm,
// and npm can resolve the package lines on either side of a coordinated peer
// floor change without an override or a legacy peer mode.
//
// A WebContainer installs the exact versions in the playground manifests when
// a visitor opens one. This gate runs after publication and before deployment,
// so it can check the registry artifacts themselves rather than source
// manifests or workspace links. `--wait` allows for registry propagation after
// Changesets has completed the publish.

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

const PLAYGROUND_PACKAGE_PATHS: ReadonlyArray<string> = [
  'packages/foldkit/package.json',
  'packages/ui/package.json',
  'packages/devtools/package.json',
  'packages/markdown/package.json',
  'packages/vite-plugin-foldkit/package.json',
]

const REGISTRY = 'https://registry.npmjs.org'
const WAIT_ATTEMPTS = 30
const WAIT_DELAY_MILLISECONDS = 10_000
const INSTALL_TIMEOUT_MILLISECONDS = 180_000
const isWaiting = process.argv.slice(2).includes('--wait')

class PublishedVersionError extends Error {}

const log = (message: string): void => {
  console.log(`[published-versions] ${message}`)
}

const fail = (message: string): never => {
  throw new PublishedVersionError(message)
}

type Manifest = Readonly<{
  name: string
  version: string
}>

type CompatibilityInstall = Readonly<{
  label: string
  foldkit: string
  plugin: string
}>

const readManifest = (relativePath: string): Manifest => {
  const raw = readFileSync(join(REPO_ROOT, relativePath), 'utf8')
  const parsed: unknown = JSON.parse(raw)
  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    !('name' in parsed) ||
    !('version' in parsed) ||
    typeof parsed.name !== 'string' ||
    typeof parsed.version !== 'string'
  ) {
    return fail(`${relativePath} has no name and version`)
  }
  return { name: parsed.name, version: parsed.version }
}

const isPublished = async (manifest: Manifest): Promise<boolean> => {
  const response = await fetch(
    `${REGISTRY}/${encodeURIComponent(manifest.name)}/${manifest.version}`,
    {
      headers: {
        accept: 'application/json',
        'cache-control': 'no-cache',
      },
    },
  )
  if (response.status === 404) {
    return false
  }
  if (!response.ok) {
    return fail(
      `the registry answered ${String(response.status)} for ` +
        `${manifest.name}@${manifest.version}`,
    )
  }
  return true
}

const manifestNamed = (
  manifests: ReadonlyArray<Manifest>,
  name: string,
): Manifest => {
  const manifest = manifests.find(candidate => candidate.name === name)
  if (manifest === undefined) {
    return fail(`the playground package list does not include ${name}`)
  }
  return manifest
}

const releaseLine = (version: string): string =>
  version.split('.').slice(0, 2).join('.')

const readInstalledVersion = (projectDir: string, name: string): string => {
  const manifestPath = join(projectDir, 'node_modules', name, 'package.json')
  const parsed: unknown = JSON.parse(readFileSync(manifestPath, 'utf8'))
  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    !('version' in parsed) ||
    typeof parsed.version !== 'string'
  ) {
    return fail(`npm installed ${name} without a readable version`)
  }
  return parsed.version
}

const installCompatibilityPair = ({
  label,
  foldkit,
  plugin,
}: CompatibilityInstall): void => {
  const projectDir = mkdtempSync(join(tmpdir(), 'foldkit-npm-resolution-'))
  try {
    writeFileSync(
      join(projectDir, 'package.json'),
      JSON.stringify(
        {
          name: 'foldkit-peer-resolution-check',
          private: true,
          version: '0.0.0',
          dependencies: {
            '@foldkit/vite-plugin': plugin,
            foldkit,
          },
        },
        null,
        2,
      ) + '\n',
    )

    const install = spawnSync(
      'npm',
      [
        'install',
        '--no-audit',
        '--no-fund',
        '--cache',
        join(projectDir, '.npm-cache'),
      ],
      {
        cwd: projectDir,
        encoding: 'utf8',
        timeout: INSTALL_TIMEOUT_MILLISECONDS,
      },
    )
    if (install.status !== 0) {
      const detail = `${install.stdout}\n${install.stderr}`.trim()
      return fail(
        `${label} does not resolve through a normal npm install ` +
          `(foldkit ${foldkit}, @foldkit/vite-plugin ${plugin}):\n${detail}`,
      )
    }

    const installedFoldkit = readInstalledVersion(projectDir, 'foldkit')
    const installedPlugin = readInstalledVersion(
      projectDir,
      '@foldkit/vite-plugin',
    )
    if (!installedFoldkit.startsWith(`${releaseLine(foldkit.slice(1))}.`)) {
      return fail(
        `${label} selected foldkit@${installedFoldkit} outside ${foldkit}`,
      )
    }
    if (!installedPlugin.startsWith(`${releaseLine(plugin.slice(1))}.`)) {
      return fail(
        `${label} selected @foldkit/vite-plugin@${installedPlugin} outside ${plugin}`,
      )
    }

    log(
      `${label}: foldkit@${installedFoldkit} with ` +
        `@foldkit/vite-plugin@${installedPlugin}`,
    )
  } finally {
    rmSync(projectDir, { recursive: true, force: true })
  }
}

const checkCompatibilityInstalls = (
  manifests: ReadonlyArray<Manifest>,
): void => {
  const foldkit = manifestNamed(manifests, 'foldkit')
  const plugin = manifestNamed(manifests, '@foldkit/vite-plugin')
  const checks: ReadonlyArray<CompatibilityInstall> = [
    {
      label: 'previous compatible release lines',
      foldkit: '^0.147.0',
      plugin: '^0.15.0',
    },
    {
      label: 'versions named by this website',
      foldkit: `^${foldkit.version}`,
      plugin: `^${plugin.version}`,
    },
  ]
  const installed = new Set<string>()
  for (const check of checks) {
    const key = `${check.foldkit}\u0000${check.plugin}`
    if (installed.has(key)) {
      continue
    }
    installCompatibilityPair(check)
    installed.add(key)
  }
}

const checkPublishedArtifacts = async (
  manifests: ReadonlyArray<Manifest>,
): Promise<void> => {
  const missing: Array<string> = []
  for (const manifest of manifests) {
    const published = await isPublished(manifest)
    log(
      `${manifest.name}@${manifest.version}: ${published ? 'on npm' : 'NOT ON NPM'}`,
    )
    if (!published) {
      missing.push(`${manifest.name}@${manifest.version}`)
    }
  }
  if (missing.length > 0) {
    return fail(
      `the website would reference versions npm does not have: ` +
        `${missing.join(', ')}. Publish the release first, then deploy the ` +
        'website from the same commit. See RELEASING.md.',
    )
  }
  checkCompatibilityInstalls(manifests)
}

const wait = (): Promise<void> =>
  new Promise(resolve => setTimeout(resolve, WAIT_DELAY_MILLISECONDS))

const messageFor = (error: unknown): string =>
  error instanceof Error ? error.message : String(error)

const main = async (): Promise<void> => {
  const manifests = PLAYGROUND_PACKAGE_PATHS.map(readManifest)
  const attempts = isWaiting ? WAIT_ATTEMPTS : 1

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      await checkPublishedArtifacts(manifests)
      log('PASS')
      return
    } catch (error) {
      if (attempt === attempts) {
        throw error
      }
      log(
        `attempt ${String(attempt)} of ${String(attempts)} failed: ` +
          `${messageFor(error)}. Waiting for registry propagation.`,
      )
      await wait()
    }
  }
}

main().catch((error: unknown) => {
  console.error(`[published-versions] FAIL ${messageFor(error)}`)
  process.exitCode = 1
})
