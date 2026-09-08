import { existsSync, readFileSync } from 'node:fs'
import { dirname, extname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

import { canaryVersion } from '../../../scripts/lib/package-version.mjs'
import { EXAMPLE_FILE_EXTENSIONS, EXAMPLE_ROOT_FILES } from '../vite.config'
import {
  INCLUDED_EXTENSIONS,
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
// the file that has to reach both: without it the published command cannot run,
// and the build id contract it implements is invisible to a reader.
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

    it(`computes a build id in every ${slug} config it publishes`, () => {
      // The playground runs a config of its own, written against published
      // packages. A build id missing there is a playground whose pages refuse
      // to hydrate, with nothing in the example's own source to explain it.
      for (const fileName of ['vite.config.ts', 'vite.config.playground.ts']) {
        const config = exampleFile(slug, fileName)
        expect(config, fileName).toContain('FOLDKIT_BUILD_ID')
        expect(config, fileName).toContain(
          "process.env['FOLDKIT_BUILD_ID'] ||= randomUUID()",
        )
        expect(config, fileName).toContain('buildId,')
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
