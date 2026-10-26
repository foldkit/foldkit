import { existsSync, readFileSync } from 'node:fs'
import { dirname, extname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { canaryVersion } from '../../../scripts/lib/package-version.mjs'
import { previewUploadTag } from '../../../scripts/lib/preview-release.mjs'
import { EXAMPLE_FILE_EXTENSIONS, EXAMPLE_ROOT_FILES } from '../vite.config'
import {
  INCLUDED_EXTENSIONS,
  PLAYGROUND_DEPENDENCY_OVERRIDES,
  loadPlaygroundFiles,
  loadPlaygroundWorkspacePackageVersions,
} from './playgroundFilesPlugin'

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')

const SERVER_RENDERED_EXAMPLES = ['ssr', 'ssg']
const CANARY_COMMIT = '0123456789abcdef0123456789abcdef01234567'

afterEach(() => vi.unstubAllEnvs())

const previewManifest = () => {
  vi.stubEnv('VITE_FOLDKIT_CANARY_COMMIT', undefined)
  vi.stubEnv('VITE_FOLDKIT_PREVIEW_RELEASE', undefined)

  return {
    schemaVersion: 1,
    channel: 'canary',
    sourceCommit: CANARY_COMMIT,
    uploadTag: previewUploadTag(CANARY_COMMIT),
    packages: Object.fromEntries(
      Object.entries(stableWorkspacePackageVersions).map(([name, version]) => [
        name,
        canaryVersion(version, CANARY_COMMIT),
      ]),
    ),
  }
}

type PlaygroundFiles = Awaited<ReturnType<typeof loadPlaygroundFiles>>
type WorkspacePackageVersions = Awaited<
  ReturnType<typeof loadPlaygroundWorkspacePackageVersions>
>

let stablePlaygroundFiles: PlaygroundFiles
let stableWorkspacePackageVersions: WorkspacePackageVersions

const buildScriptOf = (slug: string): string => {
  const manifest: Readonly<{ scripts: Readonly<Record<string, string>> }> =
    JSON.parse(
      readFileSync(
        resolve(REPO_ROOT, 'examples', slug, 'package.json'),
        'utf8',
      ),
    )
  return manifest.scripts['build'] ?? ''
}

// The playground and the example source tabs both publish what an example is
// made of. `vite build` reads the config rather than a script, so the config is
// the file that has to reach both.
describe('server-rendered example build scripts', () => {
  beforeAll(async () => {
    const previousCanaryCommit = process.env['VITE_FOLDKIT_CANARY_COMMIT']
    const previousPreviewRelease = process.env['VITE_FOLDKIT_PREVIEW_RELEASE']
    delete process.env['VITE_FOLDKIT_CANARY_COMMIT']
    delete process.env['VITE_FOLDKIT_PREVIEW_RELEASE']

    try {
      const [playgroundFiles, workspacePackageVersions] = await Promise.all([
        loadPlaygroundFiles(),
        loadPlaygroundWorkspacePackageVersions(),
      ])

      stablePlaygroundFiles = playgroundFiles
      stableWorkspacePackageVersions = workspacePackageVersions
    } finally {
      if (previousCanaryCommit === undefined) {
        delete process.env['VITE_FOLDKIT_CANARY_COMMIT']
      } else {
        process.env['VITE_FOLDKIT_CANARY_COMMIT'] = previousCanaryCommit
      }

      if (previousPreviewRelease === undefined) {
        delete process.env['VITE_FOLDKIT_PREVIEW_RELEASE']
      } else {
        process.env['VITE_FOLDKIT_PREVIEW_RELEASE'] = previousPreviewRelease
      }
    }
  })

  for (const slug of SERVER_RENDERED_EXAMPLES) {
    it(`ships the config the ${slug} build command reads`, () => {
      expect(buildScriptOf(slug)).toBe('vite build')

      const configFileName = 'vite.config.ts'
      expect(
        existsSync(resolve(REPO_ROOT, 'examples', slug, configFileName)),
      ).toBe(true)
      expect(EXAMPLE_ROOT_FILES).toContain(configFileName)
      expect(EXAMPLE_FILE_EXTENSIONS.has(extname(configFileName))).toBe(true)
      expect(INCLUDED_EXTENSIONS.has(extname(configFileName))).toBe(true)
    })
  }

  it('retains the executable the transformed SSG build invokes', () => {
    const ssgEntry = Object.entries(stablePlaygroundFiles).find(
      ([slug]) => slug === 'ssg',
    )
    if (ssgEntry === undefined) {
      throw new Error('the transformed playground files omit ssg')
    }
    const [, ssg] = ssgEntry

    const packageJsonFile = Object.entries(ssg.files).find(
      ([path]) => path === 'package.json',
    )
    if (packageJsonFile === undefined) {
      throw new Error('the transformed SSG playground omits package.json')
    }
    const [, packageJson] = packageJsonFile

    const manifest: Readonly<{
      devDependencies?: Readonly<Record<string, string>>
    }> = JSON.parse(packageJson)
    expect(manifest.devDependencies).toHaveProperty('vite')
  })

  it('disables the MCP relay in every runnable playground', () => {
    expect(Object.keys(stablePlaygroundFiles)).not.toHaveLength(0)

    for (const [slug, { files }] of Object.entries(stablePlaygroundFiles)) {
      expect(files['vite.config.ts'], slug).toContain('devToolsMcpPort: false')
    }
  })

  it('pins every transformed workspace dependency to its exact version', () => {
    for (const [slug, { files }] of Object.entries(stablePlaygroundFiles)) {
      const source = files['package.json']
      if (source === undefined) {
        throw new Error(`the ${slug} playground omits package.json`)
      }
      const manifest: Readonly<{
        dependencies?: Readonly<Record<string, string>>
        devDependencies?: Readonly<Record<string, string>>
        optionalDependencies?: Readonly<Record<string, string>>
        peerDependencies?: Readonly<Record<string, string>>
      }> = JSON.parse(source)
      const dependencies = {
        ...(manifest.dependencies ?? {}),
        ...(manifest.devDependencies ?? {}),
        ...(manifest.optionalDependencies ?? {}),
        ...(manifest.peerDependencies ?? {}),
      }
      for (const [name, specifier] of Object.entries(dependencies)) {
        expect(specifier, `${slug}: ${name}`).not.toMatch(/^workspace:/)
      }
      for (const [name, version] of Object.entries(
        stableWorkspacePackageVersions,
      )) {
        if (dependencies[name] !== undefined) {
          expect(dependencies[name], `${slug}: ${name}`).toBe(version)
        }
      }
    }
  })

  it('pins WebContainer dependency overrides', () => {
    for (const [slug, { files }] of Object.entries(stablePlaygroundFiles)) {
      const source = files['package.json']
      if (source === undefined) {
        throw new Error(`the ${slug} playground omits package.json`)
      }
      const manifest: Readonly<{
        devDependencies?: Readonly<Record<string, string>>
        overrides?: Readonly<Record<string, string>>
      }> = JSON.parse(source)
      expect(
        manifest.devDependencies?.['@rolldown/binding-wasm32-wasi'],
        slug,
      ).toBe('1.2.6')
      expect(manifest.overrides, slug).toEqual(PLAYGROUND_DEPENDENCY_OVERRIDES)
      expect(manifest.overrides?.['@napi-rs/wasm-runtime'], slug).toBe('1.2.5')
    }
  })

  it('pins canary playground dependencies to the commit-addressed snapshot', async () => {
    const previousCanaryCommit = process.env['VITE_FOLDKIT_CANARY_COMMIT']
    delete process.env['VITE_FOLDKIT_CANARY_COMMIT']

    const stableVersions = await loadPlaygroundWorkspacePackageVersions()
    process.env['VITE_FOLDKIT_CANARY_COMMIT'] = CANARY_COMMIT

    try {
      const bySlug = await loadPlaygroundFiles()

      for (const [slug, { files }] of Object.entries(bySlug)) {
        const source = files['package.json']
        if (source === undefined) {
          throw new Error(`the ${slug} playground omits package.json`)
        }

        const manifest: Readonly<{
          dependencies?: Readonly<Record<string, string>>
          devDependencies?: Readonly<Record<string, string>>
          optionalDependencies?: Readonly<Record<string, string>>
          peerDependencies?: Readonly<Record<string, string>>
        }> = JSON.parse(source)
        const dependencies = {
          ...(manifest.dependencies ?? {}),
          ...(manifest.devDependencies ?? {}),
          ...(manifest.optionalDependencies ?? {}),
          ...(manifest.peerDependencies ?? {}),
        }

        for (const [name, specifier] of Object.entries(dependencies)) {
          expect(specifier, `${slug}: ${name}`).not.toMatch(/^workspace:/)
        }

        for (const [name, stableVersion] of Object.entries(stableVersions)) {
          if (dependencies[name] !== undefined) {
            expect(dependencies[name], `${slug}: ${name}`).toBe(
              canaryVersion(stableVersion, CANARY_COMMIT),
            )
          }
        }
      }
    } finally {
      if (previousCanaryCommit === undefined) {
        delete process.env['VITE_FOLDKIT_CANARY_COMMIT']
      } else {
        process.env['VITE_FOLDKIT_CANARY_COMMIT'] = previousCanaryCommit
      }
    }
  })

  it('pins preview playgrounds to the complete verified package manifest', async () => {
    const release = previewManifest()
    vi.stubEnv('VITE_FOLDKIT_PREVIEW_RELEASE', JSON.stringify(release))
    vi.stubEnv('FOLDKIT_BUILD_ID', CANARY_COMMIT)

    expect(await loadPlaygroundWorkspacePackageVersions()).toEqual(
      release.packages,
    )

    const bySlug = await loadPlaygroundFiles()

    for (const [slug, { files }] of Object.entries(bySlug)) {
      const source = files['package.json']

      if (source === undefined) {
        throw new Error(`the ${slug} playground omits package.json`)
      }

      const manifest: Readonly<{
        dependencies?: Readonly<Record<string, string>>
        devDependencies?: Readonly<Record<string, string>>
      }> = JSON.parse(source)
      const dependencies = {
        ...manifest.dependencies,
        ...manifest.devDependencies,
      }

      for (const [name, version] of Object.entries(release.packages)) {
        if (dependencies[name] !== undefined) {
          expect(dependencies[name], `${slug}: ${name}`).toBe(version)
        }
      }
    }
  })

  it('rejects preview package versions from another source commit', async () => {
    const release = previewManifest()
    vi.stubEnv('VITE_FOLDKIT_PREVIEW_RELEASE', JSON.stringify(release))
    vi.stubEnv('FOLDKIT_BUILD_ID', 'f'.repeat(40))

    await expect(loadPlaygroundWorkspacePackageVersions()).rejects.toThrow(
      /preview release manifest belongs to/,
    )
  })

  it('rejects incomplete or mixed preview package inputs', async () => {
    const release = previewManifest()
    vi.stubEnv('FOLDKIT_BUILD_ID', CANARY_COMMIT)
    vi.stubEnv(
      'VITE_FOLDKIT_PREVIEW_RELEASE',
      JSON.stringify({
        ...release,
        packages: { foldkit: release.packages['foldkit'] },
      }),
    )

    await expect(loadPlaygroundWorkspacePackageVersions()).rejects.toThrow(
      /preview release manifest has 1 packages/,
    )

    vi.stubEnv('VITE_FOLDKIT_PREVIEW_RELEASE', JSON.stringify(release))
    vi.stubEnv('VITE_FOLDKIT_CANARY_COMMIT', CANARY_COMMIT)

    await expect(loadPlaygroundWorkspacePackageVersions()).rejects.toThrow(
      /cannot be both canary and preview/,
    )
  })
})
