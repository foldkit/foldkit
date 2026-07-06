import { build } from 'esbuild'
import { execFileSync } from 'node:child_process'
import { existsSync, mkdtempSync, readdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { beforeAll, describe, expect, it } from 'vitest'

// Runs every rule through real oxlint against fixtures written in real
// Foldkit idioms. `invalid/` must produce at least one diagnostic and
// `valid/` must produce none. This is the check the off-by-default unit
// tests cannot give: it catches a rule that passes hand-built mock ASTs
// but misfires on the code people actually write.

const here = dirname(fileURLToPath(import.meta.url))
const pluginRoot = join(here, '..', '..')
const repoRoot = join(pluginRoot, '..', '..')
const fixturesRoot = join(here, 'fixtures')
const oxlintBin = join(repoRoot, 'node_modules', '.bin', 'oxlint')

let bundlePath: string
let workDir: string

beforeAll(async () => {
  workDir = mkdtempSync(join(tmpdir(), 'foldkit-oxlint-integration-'))
  bundlePath = join(workDir, 'plugin.js')
  await build({
    entryPoints: [join(pluginRoot, 'src', 'index.ts')],
    bundle: true,
    platform: 'node',
    format: 'esm',
    outfile: bundlePath,
  })
})

type FixtureKind = 'valid' | 'invalid'

const countDiagnostics = (rule: string, kind: FixtureKind): number => {
  const targetDir = join(fixturesRoot, rule, kind)
  const config = {
    plugins: ['typescript'],
    jsPlugins: [{ name: 'foldkit', specifier: bundlePath }],
    categories: { correctness: 'off' },
    rules: { [`foldkit/${rule}`]: 'error' },
  }
  const configPath = join(workDir, `${rule}.${kind}.oxlintrc.json`)
  writeFileSync(configPath, JSON.stringify(config))
  try {
    execFileSync(oxlintBin, ['--config', configPath, targetDir], {
      encoding: 'utf8',
    })
    return 0
  } catch (error) {
    const output = String((error as { stdout?: unknown }).stdout ?? '')
    const matches = output.match(new RegExp(`foldkit\\(${rule}\\)`, 'g'))
    return matches === null ? 0 : matches.length
  }
}

const ruleFixtures = readdirSync(fixturesRoot, { withFileTypes: true })
  .filter(entry => entry.isDirectory())
  .map(entry => entry.name)
  .sort()

describe('real-oxlint rule fixtures', () => {
  it('has a fixture directory for every registered rule', async () => {
    const plugin = await import(bundlePath)
    const registered: ReadonlyArray<string> = Object.keys(
      (plugin.default ?? plugin).rules,
    )
    const missing = registered.filter(rule => !ruleFixtures.includes(rule))
    expect(missing, `rules without a fixture directory: ${missing}`).toEqual([])
  })

  for (const rule of ruleFixtures) {
    it(`${rule} fires on invalid and stays quiet on valid`, () => {
      expect(existsSync(join(fixturesRoot, rule, 'invalid'))).toBe(true)
      expect(existsSync(join(fixturesRoot, rule, 'valid'))).toBe(true)
      expect(countDiagnostics(rule, 'invalid')).toBeGreaterThan(0)
      expect(countDiagnostics(rule, 'valid')).toBe(0)
    })
  }
})
