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
import { basename, dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { transform } from 'rolldown/experimental'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

const getTypeScriptParseErrors = async (source: string) =>
  (await transform('fixed.ts', source)).errors

import { buildPlugin } from './build-plugin.ts'
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
  await buildPlugin(bundlePath)
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

  it('reports sibling coordination through proven Binding writers and aliases', () => {
    const diagnostics = diagnosticsFor(
      'no-binding-write-coordination',
      'invalid',
    )
    expect(
      diagnostics.map(diagnostic => basename(diagnostic.filename)).sort(),
    ).toEqual([
      'aliases.ts',
      'direct.ts',
      'map-binding.ts',
      'map-namespace-destructured.ts',
      'map-namespace-direct.ts',
      'map-namespace-method-alias.ts',
      'map-namespace-owner-alias.ts',
      'map-namespace-owner-destructured.ts',
    ])
    expect(
      diagnostics.every(diagnostic =>
        diagnostic.message.includes('OutMessage'),
      ),
    ).toBe(true)
  })

  it('reports proven completed Block Models only in Schema inputs', () => {
    const diagnostics = diagnosticsFor(
      'no-completed-block-model-in-schema',
      'invalid',
    )
    const diagnosticsByFixture = new Map<string, number>()
    for (const diagnostic of diagnostics) {
      const fixture = basename(diagnostic.filename)
      diagnosticsByFixture.set(
        fixture,
        (diagnosticsByFixture.get(fixture) ?? 0) + 1,
      )
    }
    expect([...diagnosticsByFixture.entries()].sort()).toEqual([
      ['block-returning-methods.ts', 12],
      ['explicit-header.ts', 25],
      ['imports.ts', 4],
      ['inline.ts', 1],
      ['local.ts', 2],
      ['namespaces-and-literals.ts', 2],
      ['widened-header.ts', 16],
      ['wrapped.ts', 6],
    ])
    expect(
      countDiagnostics('no-completed-block-model-in-schema', 'valid'),
    ).toBe(0)
  })

  it('reports every direct decision-time operation in its invalid fixture', () => {
    expect(countDiagnostics('no-impure-call-at-decision-time', 'invalid')).toBe(
      31,
    )
  })

  it('follows named callbacks and aliased Stream imports', () => {
    expect(
      countDiagnostics('no-prevent-default-in-stream-operator', 'invalid'),
    ).toBe(5)
  })

  it('traces direct, named, and automatically routed child updates', () => {
    expect(countDiagnostics('no-direct-block-state-update', 'invalid')).toBe(28)
  })

  it('tracks HashMap child updates across direct, applied, and piped forms', () => {
    const invalid = diagnosticsFor(
      'no-direct-block-state-update',
      'invalid',
    ).filter(diagnostic => diagnostic.filename.endsWith('map-binding.ts'))
    const valid = diagnosticsFor(
      'no-direct-block-state-update',
      'valid',
    ).filter(diagnostic => diagnostic.filename.endsWith('map-binding.ts'))

    expect(invalid).toHaveLength(5)
    expect(valid).toEqual([])
  })

  it('tracks extracted map Binding policy selection without matching unrelated helpers', () => {
    const invalid = diagnosticsFor(
      'no-empty-to-parent-out-message',
      'invalid',
    ).filter(diagnostic => diagnostic.filename.endsWith('map-binding.ts'))
    const valid = diagnosticsFor(
      'no-empty-to-parent-out-message',
      'valid',
    ).filter(diagnostic => diagnostic.filename.endsWith('map-binding.ts'))

    expect(invalid).toHaveLength(4)
    expect(valid).toEqual([])
  })

  it('tracks provenance-backed child transform references', () => {
    const diagnostics = diagnosticsFor(
      'no-direct-block-state-update',
      'invalid',
    ).filter(diagnostic =>
      diagnostic.filename.endsWith('function-references.ts'),
    )

    expect(diagnostics).toHaveLength(6)
  })

  it('tracks registered child Bindings in Composition update callbacks', () => {
    const diagnostics = diagnosticsFor(
      'no-direct-block-state-update',
      'invalid',
    ).filter(diagnostic =>
      diagnostic.filename.endsWith('composition-update.ts'),
    )

    expect(diagnostics).toHaveLength(4)
  })

  it('reports disabled, missing, and manual child routing', () => {
    expect(countDiagnostics('no-manual-composition-routing', 'invalid')).toBe(
      18,
    )
  })

  it('recognizes root and subpath Program aliases', () => {
    expect(countDiagnostics('no-disabling-dev-guardrails', 'invalid')).toBe(4)
  })

  it('reports direct child Message construction and local constructor aliases', () => {
    const diagnostics = diagnosticsFor(
      'no-child-message-construction-in-root',
      'invalid',
    )

    expect(diagnostics.map(reportedCalleeLabel).sort()).toEqual(
      [
        'ApplicationComposition.Message.ClickedFromShadowedParameters',
        'Child.Message.ClickedAliasSave',
        'Child.Message.ClickedBarrelSave',
        'Child.Message.ClickedDirectBarrelSave',
        'Child.Message.ClickedFromElementCompletion',
        'Child.Message.ClickedFromImportedViewBuilder',
        'Child.Message.ClickedFromLocalViewBuilder',
        'Child.Message.ClickedFromRootCompletion',
        'Child.Message.ClickedFromRootViewHelper',
        'Child.Message.ClickedNestedSave',
        'Child.Message.ClickedNamespaceAliasSave',
        'Child.Message.ClickedImportedParentViewSave',
        'Child.Message.ClickedParentStepSave',
        'Child.Message.ClickedParentCommandsStepSave',
        'Child.Message.ClickedParentMapSave',
        'Child.Message.ClickedParentMapSave',
        'Child.Message.ClickedParentMapSave',
        'Child.Message.ClickedParentMapSave',
        'Child.Message.ClickedParentMapSave',
        'Child.Message.ClickedParentViewSave',
        'Child.Message.ClickedFromContextRecord',
        'Child.Message.ClickedFromDirectRecord',
        'Child.Message.ClickedFromUnrelatedContextRecord',
        'Child.Message.ClickedFromUnrelatedRecord',
        'Child.Message.ClickedTypedParentViewSave',
        'Child.Message.ClickedWorkspaceSave',
        'Child.Message.ClickedWorkspaceAliasSave',
        'Child.server.Message.ClickedServerChildSave',
        'CommandPalette.Message.OpenedCommandPalette',
        'DirectChild.Message.ClickedDirectChildSave',
        'Definition.Message.ClickedChildSave',
        'Definition.Message.ClickedEntrySave',
        'Definition.Message.ClickedEntryFromForeignBuilder',
        'Definition.Message.ClickedFromLocalDefinitionAlias',
        'Definition.Message.CompletedChildWork',
        'Definition.Message.GotChildMessage',
        'Definition.Message.UpdatedEntry',
        'Definition.Message.UpdatedAncestor',
        'Feature.Message.ClickedFeatureSave',
        'Profile.Message.ClickedProfileSave',
        'Search.Message.ClickedSearchResult',
        'picker.Message.SelectedValue',
      ].sort(),
    )
  })

  it('tracks Message ownership in Command-only Step callbacks without matching unrelated methods', () => {
    const invalid = diagnosticsFor(
      'no-child-message-construction-in-root',
      'invalid',
    ).filter(diagnostic => diagnostic.filename.endsWith('commands-step.ts'))
    const valid = diagnosticsFor(
      'no-child-message-construction-in-root',
      'valid',
    ).filter(diagnostic => diagnostic.filename.endsWith('commands-step.ts'))

    expect(invalid.map(reportedCalleeLabel)).toEqual([
      'Child.Message.ClickedParentCommandsStepSave',
    ])
    expect(valid).toEqual([])
  })

  it('resolves aliased constructors and helpers to their imported APIs', () => {
    expect(countDiagnostics('block-name-matches-variable', 'invalid')).toBe(14)
    expect(countDiagnostics('no-hardcoded-route-strings', 'invalid')).toBe(2)
    expect(countDiagnostics('keyed-required-for-mapped-rows', 'invalid')).toBe(
      3,
    )
    expect(countDiagnostics('no-noop-message', 'invalid')).toBe(2)
  })

  it('reports every offense for the five added convention rules', () => {
    expect(
      countDiagnostics('acquire-release-constructs-in-acquire-body', 'invalid'),
    ).toBe(7)
    expect(
      countDiagnostics('no-route-query-constructor-default', 'invalid'),
    ).toBe(2)
    expect(countDiagnostics('no-switch-on-message-tag', 'invalid')).toBe(2)
    expect(countDiagnostics('prefer-command-mapmessage', 'invalid')).toBe(7)
    expect(
      countDiagnostics('prefer-option-over-nullable-in-model', 'invalid'),
    ).toBe(7)
  })

  it('recognizes explicit and contextual HtmlBuilder parameters', () => {
    expect(countDiagnostics('no-empty-children-array', 'invalid')).toBe(8)
  })

  it('reports every invalid Mount handler', () => {
    expect(countDiagnostics('mount-factory-must-use-element', 'invalid')).toBe(
      9,
    )
  })

  it('tracks same-named tagged unions by binding', () => {
    expect(countDiagnostics('no-empty-object-tagged-call', 'invalid')).toBe(3)
  })

  it('resolves namespace and aliased Update subpath imports', () => {
    for (const rule of ['no-direct-block-state-update']) {
      const diagnostics = diagnosticsFor(rule, 'invalid').filter(diagnostic =>
        diagnostic.filename.endsWith('subpath-update.ts'),
      )

      expect(diagnostics).toHaveLength(2)
    }
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
    await expect(getTypeScriptParseErrors(fixedSource)).resolves.toEqual([])
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
    await expect(getTypeScriptParseErrors(fixedSource)).resolves.toEqual([])
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
    await expect(getTypeScriptParseErrors(safeSource)).resolves.toEqual([])

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
