import * as Testing from 'effect-oxlint/testing'
import { describe, expect, it } from 'vitest'

import { preferEffectModuleNames } from '../../src/rules/prefer-effect-module-names.ts'

const run = (
  source: string,
  specifiers: ReadonlyArray<ReturnType<typeof Testing.importSpecifier>>,
  importKind = 'value',
) =>
  Testing.runRule(
    preferEffectModuleNames,
    'ImportDeclaration',
    Testing.importDeclWithSpecifiers(source, specifiers, importKind),
  )

describe('prefer-effect-module-names', () => {
  it('flags aliased Effect modules', () => {
    const result = run('effect', [
      Testing.importSpecifier('Match', 'M'),
      Testing.importSpecifier('Schema', 'S'),
      Testing.importSpecifier('String', 'String_'),
    ])

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('`Match` instead of `M`')
    expect(result[0]?.diagnostic.message).toContain('`Schema` instead of `S`')
    expect(result[0]?.diagnostic.message).toContain(
      'Qualify same-named globals through `globalThis`.',
    )
  })

  it('allows unaliased Effect modules', () => {
    const result = run('effect', [
      Testing.importSpecifier('Match'),
      Testing.importSpecifier('Schema'),
      Testing.importSpecifier('String'),
    ])

    expect(result).toHaveLength(0)
  })

  it('allows aliases for lowercase functions', () => {
    const result = run('effect', [
      Testing.importSpecifier('pipe', 'effectPipe'),
    ])

    expect(result).toHaveLength(0)
  })

  it('allows semantic aliases for local name conflicts', () => {
    const result = run('effect', [
      Testing.importSpecifier('Order', 'EffectOrder'),
    ])

    expect(result).toHaveLength(0)
  })

  it('allows type-only aliases', () => {
    const declaration = run(
      'effect',
      [Testing.importSpecifier('Schema', 'SchemaType')],
      'type',
    )
    const specifier = run('effect', [
      Testing.importSpecifier('Schema', 'SchemaType', 'type'),
    ])

    expect(declaration).toHaveLength(0)
    expect(specifier).toHaveLength(0)
  })

  it('ignores imports from other modules', () => {
    const result = run('foldkit/schema', [
      Testing.importSpecifier('Schema', 'S'),
    ])

    expect(result).toHaveLength(0)
  })
})
