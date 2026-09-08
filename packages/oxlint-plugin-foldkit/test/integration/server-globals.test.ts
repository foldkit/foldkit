import { build } from 'esbuild'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { type LintDiagnostic, runOxlint } from './run-oxlint.ts'

const here = dirname(fileURLToPath(import.meta.url))
const pluginRoot = join(here, '..', '..')
const repoRoot = join(pluginRoot, '..', '..')
const oxlintBin = join(repoRoot, 'node_modules', 'oxlint', 'bin', 'oxlint')
const workDir = mkdtempSync(join(tmpdir(), 'foldkit-server-globals-'))
const bundlePath = join(workDir, 'plugin.mjs')
const presetPath = join(workDir, 'recommended.json')
const configPath = join(workDir, '.oxlintrc.json')

const customRuleCode = 'foldkit(no-nonportable-server-globals)'
const consumerRuleCode = 'eslint(no-restricted-globals)'

const patternFixtures: Record<string, string> = {
  'patterns/src/entry.server.ts': `
export const title = document.title
export const renderedAt = Date.now()
`,
  'patterns/src/entry.server.tsx': `
export const hasWindow = typeof window !== 'undefined'
`,
  'patterns/server/main.ts': `
export const title = globalThis.document.title
export const generatedAt = Date.now()
`,
  'patterns/server/view.tsx': `
export const view = <div>{globalThis?.['navigator'].language}</div>
`,
  'patterns/scripts/prerender.ts': `
const { localStorage: storage } = globalThis
export const theme = storage.getItem('theme')
`,
  'patterns/scripts/prerender.tsx': `
export const page = <div>{document.title}{Date.now()}</div>
`,
}

const validFixtures: Record<string, string> = {
  'valid/server/type-only.ts': `
export type BrowserDocument = typeof document
export type BrowserGlobalDocument = typeof globalThis.document
`,
  'valid/server/local-shadows.ts': `
const document = { title: 'server document' }
const globalThis = { document }
const context = { document }

export const localTitle = document.title
export const globalTitle = globalThis.document.title
export const contextTitle = context.document.title
export const parameterTitle = (window: { title: string }) => window.title
`,
  'valid/server/portable.ts': `
export const fetchPage = async (request: Request): Promise<Response> => {
  const url = new URL(request.url)
  const upstream = await fetch(url)
  const headers = new Headers({ 'content-type': 'text/html' })

  return new Response(await upstream.text(), { headers })
}
`,
  'valid/src/entry.client.ts': `
export const title = document.title + globalThis.document.title
export const startedAt = performance.now()
`,
}

const compositionFixtures: Record<string, string> = {
  'composition/server/policy.ts': `
export const title = (): string => {
  console.log('reading title')
  return document.title
}
`,
  'composition/src/entry.client.ts': `
console.log(document.title)
`,
  'composition/server/policy.test.ts': `
console.log(document.title, Math.random())
`,
  'composition/server/policy.spec.tsx': `
console.log(<div>{document.title}</div>)
`,
}

const writeFixtures = (fixtures: Record<string, string>): void => {
  for (const [path, source] of Object.entries(fixtures)) {
    const fullPath = join(workDir, path)
    mkdirSync(dirname(fullPath), { recursive: true })
    writeFileSync(fullPath, source)
  }
}

const lint = (target: string): ReadonlyArray<LintDiagnostic> => {
  return runOxlint({
    oxlintBin,
    cwd: workDir,
    configPath,
    target,
  })
}

const codesFor = (
  diagnostics: ReadonlyArray<LintDiagnostic>,
  filename: string,
): ReadonlyArray<string> => {
  const codes = diagnostics
    .filter(diagnostic => diagnostic.filename === filename)
    .map(diagnostic => diagnostic.code)

  return codes.sort()
}

beforeAll(async () => {
  await build({
    entryPoints: [join(pluginRoot, 'src', 'index.ts')],
    bundle: true,
    platform: 'node',
    format: 'esm',
    outfile: bundlePath,
  })

  const { default: plugin } = await import(pathToFileURL(bundlePath).href)
  writeFileSync(
    presetPath,
    JSON.stringify({
      ...plugin.configs.recommended,
      jsPlugins: [
        { name: 'foldkit', specifier: pathToFileURL(bundlePath).href },
      ],
      categories: { correctness: 'off' },
    }),
  )
  writeFileSync(
    configPath,
    JSON.stringify({
      extends: ['./recommended.json'],
      rules: {
        'no-restricted-globals': ['error', 'console'],
      },
    }),
  )

  writeFixtures(patternFixtures)
  writeFixtures(validFixtures)
  writeFixtures(compositionFixtures)
})

afterAll(() => {
  rmSync(workDir, { recursive: true, force: true })
})

describe('recommended preset server portability rule', () => {
  it('matches every recognized server file pattern', () => {
    const diagnostics = lint('patterns')

    expect(diagnostics).toHaveLength(Object.keys(patternFixtures).length)
    for (const filename of Object.keys(patternFixtures)) {
      expect(codesFor(diagnostics, filename)).toEqual([customRuleCode])
    }
  })

  it('allows type-only uses, local bindings, host APIs, and client code', () => {
    expect(lint('valid')).toEqual([])
  })

  it('composes with consumer policy and excludes test files', () => {
    const diagnostics = lint('composition')

    expect(diagnostics).toHaveLength(5)
    expect(codesFor(diagnostics, 'composition/server/policy.ts')).toEqual(
      [customRuleCode, consumerRuleCode].sort(),
    )
    expect(codesFor(diagnostics, 'composition/src/entry.client.ts')).toEqual([
      consumerRuleCode,
    ])
    expect(codesFor(diagnostics, 'composition/server/policy.test.ts')).toEqual([
      consumerRuleCode,
    ])
    expect(codesFor(diagnostics, 'composition/server/policy.spec.tsx')).toEqual(
      [consumerRuleCode],
    )
  })
})
