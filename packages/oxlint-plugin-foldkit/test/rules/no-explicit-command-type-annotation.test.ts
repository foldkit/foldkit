import * as Testing from 'effect-oxlint/testing'
import { describe, expect, it } from 'vitest'

import rule from '../../src/rules/no-explicit-command-type-annotation.ts'

/**
 * Build a `TSTypeReference` to `name` with optional `typeArguments`.
 *
 * `tsTypeRef` from Testing always sets `typeArguments: null`; this rule
 * specifically requires `typeArguments !== null`, so for the positive
 * case we need to override.
 */
const tsTypeRefWithArgs = (name: string): unknown => ({
  type: 'TSTypeReference',
  typeName: Testing.id(name),
  typeArguments: { type: 'TSTypeParameterInstantiation', params: [] },
})

describe('no-explicit-command-type-annotation', () => {
  it('flags `Command<...>` (TSTypeReference with typeArguments)', () => {
    const result = Testing.runRule(
      rule,
      'TSTypeReference',
      tsTypeRefWithArgs('Command'),
    )
    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('Command<...>')
  })

  it('does not flag bare `Command` (no type arguments)', () => {
    // Without `<...>` the annotation is just a re-export reference, not an
    // explicit Effect-shape constraint.
    const result = Testing.runRule(
      rule,
      'TSTypeReference',
      Testing.tsTypeRef('Command'),
    )
    expect(result).toHaveLength(0)
  })

  it('does not flag `Foo<...>` (different identifier)', () => {
    const result = Testing.runRule(
      rule,
      'TSTypeReference',
      tsTypeRefWithArgs('Foo'),
    )
    expect(result).toHaveLength(0)
  })

  it('does not flag a qualified type like `M.Command<...>`', () => {
    // typeName is a TSQualifiedName, not an Identifier.
    const result = Testing.runRule(rule, 'TSTypeReference', {
      type: 'TSTypeReference',
      typeName: {
        type: 'TSQualifiedName',
        left: Testing.id('M'),
        right: Testing.id('Command'),
      },
      typeArguments: { type: 'TSTypeParameterInstantiation', params: [] },
    })
    expect(result).toHaveLength(0)
  })
})
