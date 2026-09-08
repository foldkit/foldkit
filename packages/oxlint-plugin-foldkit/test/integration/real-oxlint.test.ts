import { build, transform } from 'esbuild'
import {
  copyFileSync,
  existsSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { type LintDiagnostic, runOxlint } from './run-oxlint.ts'

// Runs every rule through real oxlint against fixtures written in real
// Foldkit idioms. `invalid/` must produce at least one diagnostic and
// `valid/` must produce none. This is the check the off-by-default unit
// tests cannot give: it catches a rule that passes hand-built mock ASTs
// but misfires on the code people actually write.

const here = dirname(fileURLToPath(import.meta.url))
const pluginRoot = join(here, '..', '..')
const repoRoot = join(pluginRoot, '..', '..')
const fixturesRoot = join(here, 'fixtures')
const oxlintBin = join(repoRoot, 'node_modules', 'oxlint', 'bin', 'oxlint')
const workDir = mkdtempSync(join(tmpdir(), 'foldkit-oxlint-integration-'))
const bundlePath = join(workDir, 'plugin.mjs')

beforeAll(async () => {
  await build({
    entryPoints: [join(pluginRoot, 'src', 'index.ts')],
    bundle: true,
    platform: 'node',
    format: 'esm',
    outfile: bundlePath,
  })
})

afterAll(() => {
  rmSync(workDir, { recursive: true, force: true })
})

type FixtureKind = 'valid' | 'invalid'

const diagnosticsFor = (
  rule: string,
  kind: FixtureKind,
): ReadonlyArray<LintDiagnostic> => {
  const targetDir = join(fixturesRoot, rule, kind)
  const config = {
    plugins: ['typescript'],
    jsPlugins: [{ name: 'foldkit', specifier: pathToFileURL(bundlePath).href }],
    categories: { correctness: 'off' },
    rules: { [`foldkit/${rule}`]: 'error' },
  }
  const configPath = join(workDir, `${rule}.${kind}.oxlintrc.json`)
  writeFileSync(configPath, JSON.stringify(config))
  const diagnostics = runOxlint({
    oxlintBin,
    cwd: workDir,
    configPath,
    target: targetDir,
  })
  const expectedCode = `foldkit(${rule})`

  for (const diagnostic of diagnostics) {
    if (diagnostic.code !== expectedCode) {
      throw new Error(
        `Expected ${expectedCode}, received ${diagnostic.code} in ${diagnostic.filename}`,
      )
    }
  }
  return diagnostics
}

const countDiagnostics = (rule: string, kind: FixtureKind): number =>
  diagnosticsFor(rule, kind).length

const reportedCalleeLabel = (diagnostic: LintDiagnostic): string => {
  const match = diagnostic.message.match(/`([^`]+)\(\.\.\.\)`/)
  if (match === null) {
    throw new Error(
      `Diagnostic does not contain a callee label: ${diagnostic.message}`,
    )
  }

  const [, label] = match
  if (label === undefined) {
    throw new Error(
      `Diagnostic has an empty callee label: ${diagnostic.message}`,
    )
  }

  return label
}

const ruleFixtures = readdirSync(fixturesRoot, { withFileTypes: true })
  .filter(entry => entry.isDirectory())
  .map(entry => entry.name)
  .sort()

describe('real-oxlint rule fixtures', () => {
  it('has a fixture directory for every registered rule', async () => {
    const plugin = await import(pathToFileURL(bundlePath).href)
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

  it('reports every direct decision-time operation in its invalid fixture', () => {
    expect(countDiagnostics('no-impure-call-at-decision-time', 'invalid')).toBe(
      23,
    )
  })

  it('reports every direct child Message import form', () => {
    const diagnostics = diagnosticsFor(
      'no-child-message-construction-in-root',
      'invalid',
    )

    expect(diagnostics.map(reportedCalleeLabel).sort()).toEqual(
      [
        'Child.Message.ClickedBarrelSave',
        'Child.Message.ClickedDirectBarrelSave',
        'Child.Message.ClickedNestedSave',
        'Child.Message.ClickedParentViewSave',
        'Child.Message.ClickedWorkspaceSave',
        'Child.server.Message.ClickedServerChildSave',
        'CommandPalette.Message.OpenedCommandPalette',
        'DirectChild.Message.ClickedDirectChildSave',
        'Feature.Message.ClickedFeatureSave',
        'Profile.Message.ClickedProfileSave',
        'Search.Message.ClickedSearchResult',
      ].sort(),
    )
  })

  it('resolves aliased constructors and helpers to their imported APIs', () => {
    expect(countDiagnostics('no-hardcoded-route-strings', 'invalid')).toBe(2)
    expect(countDiagnostics('keyed-required-for-mapped-rows', 'invalid')).toBe(
      3,
    )
    expect(
      countDiagnostics('got-prefix-requires-submodel-payload', 'invalid'),
    ).toBe(3)
    expect(
      countDiagnostics('wrap-child-output-in-got-message', 'invalid'),
    ).toBe(2)
    expect(
      countDiagnostics('got-wrapper-carries-only-routing', 'invalid'),
    ).toBe(2)
    expect(countDiagnostics('no-noop-message', 'invalid')).toBe(2)
  })

  it('recognizes explicit and contextual HtmlBuilder parameters', () => {
    expect(countDiagnostics('no-empty-children-array', 'invalid')).toBe(6)
  })

  it('tracks same-named tagged unions by binding', () => {
    expect(countDiagnostics('no-empty-object-tagged-call', 'invalid')).toBe(3)
  })

  it('fixes only structurally safe empty commands properties', async () => {
    const rule = 'no-empty-commands-array'
    const sourcePath = join(fixturesRoot, rule, 'invalid', 'update.ts')
    const targetPath = join(workDir, `${rule}.fix.ts`)
    const configPath = join(workDir, `${rule}.fix.oxlintrc.json`)
    copyFileSync(sourcePath, targetPath)
    writeFileSync(
      configPath,
      JSON.stringify({
        plugins: ['typescript'],
        jsPlugins: [
          { name: 'foldkit', specifier: pathToFileURL(bundlePath).href },
        ],
        categories: { correctness: 'off' },
        rules: { [`foldkit/${rule}`]: 'error' },
      }),
    )

    const diagnostics = runOxlint({
      oxlintBin,
      cwd: workDir,
      configPath,
      target: targetPath,
      fix: true,
    })
    const fixedSource = readFileSync(targetPath, 'utf8')

    expect(diagnostics).toHaveLength(2)
    expect(fixedSource.match(/commands: \[\]/g)).toHaveLength(1)
    expect(fixedSource).toContain('// A comment does not make this a Command.')
    expect(fixedSource).toContain('[propertyName]: dynamicCommands')
    await expect(
      transform(fixedSource, { loader: 'ts' }),
    ).resolves.toBeDefined()
  })

  it('fixes only structurally safe empty parent OutMessage mappers', async () => {
    const rule = 'no-empty-to-parent-out-message'
    const sourcePath = join(fixturesRoot, rule, 'invalid', 'update.ts')
    const targetPath = join(workDir, `${rule}.fix.ts`)
    const configPath = join(workDir, `${rule}.fix.oxlintrc.json`)
    copyFileSync(sourcePath, targetPath)
    writeFileSync(
      configPath,
      JSON.stringify({
        plugins: ['typescript'],
        jsPlugins: [
          { name: 'foldkit', specifier: pathToFileURL(bundlePath).href },
        ],
        categories: { correctness: 'off' },
        rules: { [`foldkit/${rule}`]: 'error' },
      }),
    )

    const diagnostics = runOxlint({
      oxlintBin,
      cwd: workDir,
      configPath,
      target: targetPath,
      fix: true,
    })
    const fixedSource = readFileSync(targetPath, 'utf8')

    expect(diagnostics).toHaveLength(2)
    expect(fixedSource.match(/toParentOutMessage/g)).toHaveLength(2)
    expect(fixedSource).toContain(
      '// This comment must survive an autofix pass.',
    )
    await expect(
      transform(fixedSource, { loader: 'ts' }),
    ).resolves.toBeDefined()
  })

  it('renames an Effect module only when the exported name is unbound', async () => {
    const rule = 'prefer-effect-module-names'
    const configPath = join(workDir, `${rule}.fix.oxlintrc.json`)
    writeFileSync(
      configPath,
      JSON.stringify({
        plugins: ['typescript'],
        jsPlugins: [
          { name: 'foldkit', specifier: pathToFileURL(bundlePath).href },
        ],
        categories: { correctness: 'off' },
        rules: { [`foldkit/${rule}`]: 'error' },
      }),
    )

    const safeSourcePath = join(fixturesRoot, rule, 'invalid', 'imports.ts')
    const safeTargetPath = join(workDir, `${rule}.safe-fix.ts`)
    copyFileSync(safeSourcePath, safeTargetPath)
    const safeDiagnostics = runOxlint({
      oxlintBin,
      cwd: workDir,
      configPath,
      target: safeTargetPath,
      fix: true,
    })
    const safeSource = readFileSync(safeTargetPath, 'utf8')

    expect(safeDiagnostics).toHaveLength(0)
    expect(safeSource).not.toContain('Match as M')
    expect(safeSource).not.toContain('Schema as S')
    expect(safeSource).not.toContain('String as String_')
    expect(safeSource).toContain('const Model = Schema.Struct')
    expect(safeSource).toContain('const render = Match.value')
    expect(safeSource).toContain('String.isNonEmpty')
    await expect(transform(safeSource, { loader: 'ts' })).resolves.toBeDefined()

    const collisionSourcePath = join(
      fixturesRoot,
      rule,
      'invalid',
      'global-collision.ts',
    )
    const collisionTargetPath = join(workDir, `${rule}.collision-fix.ts`)
    copyFileSync(collisionSourcePath, collisionTargetPath)
    const collisionDiagnostics = runOxlint({
      oxlintBin,
      cwd: workDir,
      configPath,
      target: collisionTargetPath,
      fix: true,
    })
    const collisionSource = readFileSync(collisionTargetPath, 'utf8')

    expect(collisionDiagnostics).toHaveLength(1)
    expect(collisionSource).toContain('String as String_')
    expect(collisionSource).toContain('String(42)')

    for (const unsafeFixFixture of [
      { name: 'shorthand-property', diagnosticCount: 1 },
      { name: 'reexport', diagnosticCount: 1 },
      { name: 'nested-shadow', diagnosticCount: 1 },
      { name: 'commented-specifier', diagnosticCount: 1 },
      { name: 'duplicate-target-same-import', diagnosticCount: 1 },
      { name: 'duplicate-target-across-imports', diagnosticCount: 2 },
    ]) {
      const sourcePath = join(
        fixturesRoot,
        rule,
        'invalid',
        `${unsafeFixFixture.name}.ts`,
      )
      const targetPath = join(
        workDir,
        `${rule}.${unsafeFixFixture.name}-fix.ts`,
      )
      const originalSource = readFileSync(sourcePath, 'utf8')
      copyFileSync(sourcePath, targetPath)
      const diagnostics = runOxlint({
        oxlintBin,
        cwd: workDir,
        configPath,
        target: targetPath,
        fix: true,
      })
      const source = readFileSync(targetPath, 'utf8')

      expect(diagnostics).toHaveLength(unsafeFixFixture.diagnosticCount)
      expect(source).toBe(originalSource)
    }
  })
})
