import { existsSync, readFileSync } from 'node:fs'
import { dirname, extname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

import { canaryVersion } from '../../../scripts/lib/package-version.mjs'
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

const exampleFile = (slug: string, fileName: string): string =>
  readFileSync(resolve(REPO_ROOT, 'examples', slug, fileName), 'utf8')

// The playground and the example source tabs both publish what an example is
// made of. `vite build` reads the config rather than a script, so the config is
// the file that has to reach both.
describe('server-rendered example build scripts', () => {
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

    it(`leaves build identity generation to Foldkit in every ${slug} config`, () => {
      for (const fileName of ['vite.config.ts', 'vite.config.playground.ts']) {
        const config = exampleFile(slug, fileName)
        expect(config, fileName).toContain(
          "serverEntry: '/src/entry.server.ts'",
        )
        expect(config, fileName).toMatch(/build: (?:true|\{ prerender:)/)
        expect(config, fileName).not.toContain('FOLDKIT_BUILD_ID')
        expect(config, fileName).not.toContain('randomUUID')
        expect(config, fileName).not.toContain('buildId')
      }
    })
  }

  it('retains the executable the transformed SSG build invokes', async () => {
    const bySlug = await loadPlaygroundFiles()
    const ssgEntry = Object.entries(bySlug).find(([slug]) => slug === 'ssg')
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

  it('uses the LiveStore Vite config in its playground', async () => {
    const bySlug = await loadPlaygroundFiles()
    const liveStoreEntry = Object.entries(bySlug).find(
      ([slug]) => slug === 'livestore',
    )
    if (liveStoreEntry === undefined) {
      throw new Error('the transformed playground files omit livestore')
    }
    const [, liveStore] = liveStoreEntry

    const viteConfigFile = Object.entries(liveStore.files).find(
      ([path]) => path === 'vite.config.ts',
    )
    if (viteConfigFile === undefined) {
      throw new Error(
        'the transformed livestore playground omits vite.config.ts',
      )
    }
    const [, viteConfig] = viteConfigFile

    expect(viteConfig).toBe(
      exampleFile('livestore', 'vite.config.playground.ts'),
    )
  })

  it('pins every transformed workspace dependency to its exact version', async () => {
    const [bySlug, versions] = await Promise.all([
      loadPlaygroundFiles(),
      loadPlaygroundWorkspacePackageVersions(),
    ])

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
        ...(manifest.dependencies ?? {}),
        ...(manifest.devDependencies ?? {}),
      }
      for (const [name, version] of Object.entries(versions)) {
        if (dependencies[name] !== undefined) {
          expect(dependencies[name], `${slug}: ${name}`).toBe(version)
        }
      }
    }
  })

  it('pins WebContainer dependency overrides', async () => {
    const bySlug = await loadPlaygroundFiles()

    for (const [slug, { files }] of Object.entries(bySlug)) {
      const source = files['package.json']
      if (source === undefined) {
        throw new Error(`the ${slug} playground omits package.json`)
      }
      const manifest: Readonly<{
        overrides?: Readonly<Record<string, string>>
      }> = JSON.parse(source)
      expect(manifest.overrides, slug).toEqual(PLAYGROUND_DEPENDENCY_OVERRIDES)
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
        }> = JSON.parse(source)
        const dependencies = {
          ...(manifest.dependencies ?? {}),
          ...(manifest.devDependencies ?? {}),
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
})
