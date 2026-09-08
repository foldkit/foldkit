import { mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { build as viteBuild } from 'vite'
import { afterEach, describe, expect, it } from 'vitest'

import { buildIdForCommand, resolveBuildId } from '../src/buildToken.ts'
import { foldkitSsr } from '../src/ssr.ts'

const FIXTURE_ROOT = resolve(import.meta.dirname, 'fixtures/ssr')
const temporaryDirectories: Array<string> = []

const readBuiltFiles = (directory: string): string => {
  const contents: Array<string> = []
  const readDirectory = (current: string): void => {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const path = join(current, entry.name)
      if (entry.isDirectory()) {
        readDirectory(path)
      } else {
        contents.push(readFileSync(path, 'utf8'))
      }
    }
  }
  readDirectory(directory)
  return contents.join('\n')
}

afterEach(() => {
  delete process.env['FOLDKIT_BUILD_ID']
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { force: true, recursive: true })
  }
})

describe('resolveBuildId', () => {
  it('uses the configured id', () => {
    expect(resolveBuildId('release-2026-08-17')).toBe('release-2026-08-17')
  })

  it('falls back to the environment variable', () => {
    process.env['FOLDKIT_BUILD_ID'] = 'from-environment'

    expect(resolveBuildId()).toBe('from-environment')
  })

  it('prefers the configured id over the environment variable', () => {
    process.env['FOLDKIT_BUILD_ID'] = 'from-environment'

    expect(resolveBuildId('configured')).toBe('configured')
  })

  it('treats an empty value as absent', () => {
    process.env['FOLDKIT_BUILD_ID'] = ''

    expect(resolveBuildId('')).toBeUndefined()
  })

  it('reports no id when the deployment supplied none', () => {
    // Nothing is derived from the project. A digest of whatever files sit under
    // the Vite root misses shared modules elsewhere in a monorepo, untracked
    // inputs, and environment-derived configuration, so two deployments that
    // render differently could share an id; it moves when one build reads the
    // output of the build before it, so one deployment could produce two; and
    // hashing whatever files happen to be there turns a value published in the
    // page into an oracle for the secrets among them. A hydratable render
    // refuses instead, naming what to supply.
    expect(resolveBuildId()).toBeUndefined()
  })
})

describe('buildIdForCommand', () => {
  it('gives development an id of its own', () => {
    // A hydratable render refuses to run without a build id, and the dev SSR
    // host renders exactly that way, so leaving development without one turns
    // every dev page request into a MissingBuildId failure. Development can
    // safely take a fixed value: the render and the client come from one module
    // graph in one process, so there is no second deployment to tell apart.
    expect(buildIdForCommand('serve')).toBe('development')
  })

  it('refuses to invent one for a build', () => {
    // A default here would be shared by every deployment that forgot to supply
    // an id, which is the case the id exists to catch. The render fails instead,
    // naming what to supply.
    expect(buildIdForCommand('build')).toBeUndefined()
  })

  it("prefers the deployment's id in both commands", () => {
    expect(buildIdForCommand('build', 'release-7')).toBe('release-7')
    expect(buildIdForCommand('serve', 'release-7')).toBe('release-7')
  })

  it('prefers the environment variable over the development id', () => {
    process.env['FOLDKIT_BUILD_ID'] = 'from-environment'

    expect(buildIdForCommand('serve')).toBe('from-environment')
  })
})

describe('standalone foldkitSsr builds', () => {
  it('compiles the configured id into client and externalized server builds', async () => {
    const outputRoot = mkdtempSync(join(tmpdir(), 'foldkit-ssr-build-token-'))
    temporaryDirectories.push(outputRoot)
    const buildId = 'standalone-production'
    const plugin = () =>
      foldkitSsr({
        serverEntry: '/entry.server.ts',
        buildId,
      })
    const clientOutput = join(outputRoot, 'client')
    const serverOutput = join(outputRoot, 'server')

    await viteBuild({
      root: FIXTURE_ROOT,
      configFile: false,
      logLevel: 'silent',
      plugins: [plugin()],
      build: { emptyOutDir: true, outDir: clientOutput },
    })
    await viteBuild({
      root: FIXTURE_ROOT,
      configFile: false,
      logLevel: 'silent',
      plugins: [plugin()],
      build: {
        emptyOutDir: true,
        outDir: serverOutput,
        ssr: resolve(FIXTURE_ROOT, 'entry.server.ts'),
      },
    })

    const client = readBuiltFiles(clientOutput)
    const server = readBuiltFiles(serverOutput)
    expect(client).toContain(buildId)
    expect(server).toContain(buildId)
    expect(client).not.toContain('development')
    expect(server).not.toContain('development')
  })
})
