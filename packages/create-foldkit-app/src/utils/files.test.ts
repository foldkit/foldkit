import { readFileSync, readdirSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect } from 'vitest'

import { describe, it } from '@effect/vitest'

import { applyPackageManager } from './files.js'

const templatePath = (relativePath: string): string =>
  fileURLToPath(new URL(`../../templates/${relativePath}`, import.meta.url))

const readTemplateFile = (relativePath: string): string =>
  readFileSync(templatePath(relativePath), 'utf8')

const listTemplateFiles = (
  relativeDirectory: string,
): ReadonlyArray<string> => {
  const root = templatePath(relativeDirectory)
  return readdirSync(root, { recursive: true, withFileTypes: true })
    .filter(entry => entry.isFile())
    .map(entry =>
      relative(root, join(entry.parentPath, entry.name)).split(sep).join('/'),
    )
    .sort()
}

type TemplatePackageJson = Readonly<{
  name: string
  scripts: Readonly<Record<string, string>>
}>

const readTemplatePackageJson = (relativePath: string): TemplatePackageJson =>
  JSON.parse(readTemplateFile(relativePath))

type TemplateTsconfig = Readonly<{
  compilerOptions: Readonly<Record<string, unknown>>
  include: ReadonlyArray<string>
}>

const readTemplateTsconfig = (relativePath: string): TemplateTsconfig =>
  JSON.parse(readTemplateFile(relativePath))

const templateReadme = readTemplateFile('base/README.md')

describe('applyPackageManager', () => {
  it('substitutes the README command placeholders for the selected manager', () => {
    const bun = applyPackageManager(templateReadme, 'bun')
    expect(bun).toContain('bun install')
    expect(bun).toContain('bun dev')
    expect(bun).not.toContain('{{')

    const npm = applyPackageManager(templateReadme, 'npm')
    expect(npm).toContain('npm install')
    expect(npm).toContain('npm run dev')
    expect(npm).not.toContain('{{')

    const pnpm = applyPackageManager(templateReadme, 'pnpm')
    expect(pnpm).toContain('pnpm install')
    expect(pnpm).toContain('pnpm dev')
    expect(pnpm).not.toContain('{{')
  })
})

describe('rendering templates', () => {
  it('ssg overlays the base with a server entry and a generating build', () => {
    expect(listTemplateFiles('rendering/ssg')).toEqual([
      'README.md',
      'package.json',
      'src/entry.server.ts',
      'src/entry.ts',
      'src/main.ts',
      'src/route.ts',
      'src/scene.test.ts',
      'src/vite-env.d.ts',
      'tsconfig.json',
      'vite.config.ts',
    ])

    const packageJson = readTemplatePackageJson('rendering/ssg/package.json')
    expect(packageJson.scripts['build']).toBe('vite build')
    expect(packageJson.scripts['preview']).toBe(
      'vite preview --outDir dist/client',
    )

    const ssgViteConfig = readTemplateFile('rendering/ssg/vite.config.ts')
    expect(ssgViteConfig).toContain("serverEntry: '/src/entry.server.ts'")
    expect(ssgViteConfig).toContain('build: { prerender: true }')
    expect(readTemplateFile('rendering/ssg/src/entry.server.ts')).toContain(
      'export const prerenderPaths',
    )
    expect(readTemplateFile('rendering/ssg/src/entry.ts')).toContain(
      'Runtime.hydrate(application, { buildId: import.meta.env.FOLDKIT_BUILD_ID })',
    )
  })

  it('ssr overlays the base with a server entry, fetch handler, and start script', () => {
    expect(listTemplateFiles('rendering/ssr')).toEqual([
      'README.md',
      'package.json',
      'scripts/serve.mjs',
      'src/cookie.ts',
      'src/entry.server.ts',
      'src/entry.ts',
      'src/main.ts',
      'src/scene.test.ts',
      'src/vite-env.d.ts',
      'tsconfig.json',
      'vite.config.ts',
    ])

    const packageJson = readTemplatePackageJson('rendering/ssr/package.json')
    expect(packageJson.scripts['build']).toBe('vite build')
    expect(packageJson.scripts['start']).toBe('node scripts/serve.mjs')

    const ssrViteConfig = readTemplateFile('rendering/ssr/vite.config.ts')
    expect(ssrViteConfig).toContain("serverEntry: '/src/entry.server.ts'")
    expect(ssrViteConfig).toContain('build: true')
    expect(readTemplateFile('rendering/ssr/src/entry.server.ts')).toContain(
      'flags: flagsForRequest(',
    )
    expect(readTemplateFile('rendering/ssr/src/entry.ts')).toContain(
      'Runtime.hydrate(application, { buildId: import.meta.env.FOLDKIT_BUILD_ID })',
    )
    expect(readTemplateFile('rendering/ssr/scripts/serve.mjs')).toContain(
      'app.fetch',
    )
  })

  it('rendering overlays keep the base name placeholder, shared scripts, and compiler options', () => {
    const basePackageJson = readTemplatePackageJson('base/package.json')
    const baseTsconfig = readTemplateTsconfig('base/tsconfig.json')
    const baseViteConfig = readTemplateFile('base/vite.config.ts')

    for (const rendering of ['ssg', 'ssr']) {
      const packageJson = readTemplatePackageJson(
        `rendering/${rendering}/package.json`,
      )
      expect(packageJson.name).toBe('{{name}}')
      expect(packageJson.scripts['dev']).toBe(basePackageJson.scripts['dev'])
      expect(packageJson.scripts['typecheck']).toBe(
        basePackageJson.scripts['typecheck'],
      )
      expect(packageJson.scripts['format']).toBe(
        basePackageJson.scripts['format'],
      )
      expect(packageJson.scripts['test']).toBe(basePackageJson.scripts['test'])

      const tsconfig = readTemplateTsconfig(
        `rendering/${rendering}/tsconfig.json`,
      )
      expect(tsconfig.compilerOptions).toEqual(baseTsconfig.compilerOptions)

      const viteConfig = readTemplateFile(
        `rendering/${rendering}/vite.config.ts`,
      )
      expect(viteConfig).toContain('devToolsMcpPort: 9988')
      expect(baseViteConfig).toContain('devToolsMcpPort: 9988')
    }

    expect(readTemplateTsconfig('rendering/ssg/tsconfig.json').include).toEqual(
      ['src/**/*'],
    )
    expect(readTemplateTsconfig('rendering/ssr/tsconfig.json').include).toEqual(
      ['src/**/*'],
    )
  })

  it('gives every environment of one build the same generated build id', () => {
    // A generated project must reach a working hydratable build through its own
    // documented build command. `renderToString` refuses a hydratable render
    // with no build id, and hydration rebuilds a page whose id is not the
    // client's, so the browser build and the server build of one run have to be
    // handed the same value without the author knowing the requirement exists.
    // One `vite build` evaluates the config once, so the id it computes there
    // reaches every environment that build produces.
    for (const rendering of ['ssg', 'ssr']) {
      const packageJson = readTemplatePackageJson(
        `rendering/${rendering}/package.json`,
      )
      expect(packageJson.scripts['build']).toBe('vite build')

      const viteConfig = readTemplateFile(
        `rendering/${rendering}/vite.config.ts`,
      )
      expect(viteConfig).toContain('randomUUID()')
      expect(viteConfig).toContain('buildId,')
    }
  })

  it('takes a build id supplied by the deployment over a generated one', () => {
    for (const rendering of ['ssg', 'ssr']) {
      const viteConfig = readTemplateFile(
        `rendering/${rendering}/vite.config.ts`,
      )
      const generated = viteConfig.indexOf('randomUUID()')
      const supplied = viteConfig.indexOf("process.env['FOLDKIT_BUILD_ID']")
      expect(supplied).toBeGreaterThanOrEqual(0)
      expect(supplied).toBeLessThan(generated)
    }
  })

  it('never falls back to a build id two deployments could share', () => {
    // A constant fallback (`dev`, the project name, a version that only moves on
    // release) is worse than no id at all: hydration would read two deployments
    // as one and adopt a stale page's DOM for a client that no longer means the
    // same thing by it.
    for (const rendering of ['ssg', 'ssr']) {
      const code = readTemplateFile(`rendering/${rendering}/vite.config.ts`)
        .split('\n')
        .filter(line => !line.trimStart().startsWith('//'))
        .join('\n')

      expect(code).not.toMatch(/FOLDKIT_BUILD_ID[^\n]*\|\|\s*['"`]/)
      expect(code).not.toMatch(/\?\?\s*['"`]/)
      expect(code).not.toMatch(/:\s*['"`][^'"`]+['"`]\s*$/m)
    }
  })

  it('treats an empty FOLDKIT_BUILD_ID as unset and resolves one id per process', () => {
    // The plugin reads an empty string as no id at all, so taking it as a value
    // here would suppress the generated one and leave the build with none,
    // failing later at the render rather than here. `||=` covers that and the
    // second requirement at once: Vite reads this file once per environment it
    // builds, so the generated fallback has to be stored where the next read
    // finds it. A fresh id per read gives the browser bundle and the server
    // bundle different ids, and hydration then refuses every page of the
    // deployment that just shipped.
    for (const rendering of ['ssg', 'ssr']) {
      const viteConfig = readTemplateFile(
        `rendering/${rendering}/vite.config.ts`,
      )
      expect(viteConfig).toContain(
        "process.env['FOLDKIT_BUILD_ID'] ||= randomUUID()",
      )
    }
  })

  it('documents the build id contract in the generated README', () => {
    // The id is a deployment's, not Foldkit's, so a generated project has to say
    // what it is before its author has to ask.
    for (const rendering of ['ssg', 'ssr']) {
      const readme = applyPackageManager(
        readTemplateFile(`rendering/${rendering}/README.md`),
        'pnpm',
      )
      expect(readme).not.toContain('{{')
      expect(readme).toContain('pnpm build')
      expect(readme).toContain('FOLDKIT_BUILD_ID')
      expect(readme).toMatch(/never contain\s+a secret/)
      expect(readme).toMatch(/two deployments\s+must/)
    }
  })
})
