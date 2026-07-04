import * as Testing from 'effect-oxlint/testing'
import { describe, expect, it } from 'vitest'

import { noExplicitCommandTypeAnnotation } from '../../src/rules/no-explicit-command-type-annotation.ts'

const typeArgumentList = { type: 'TSTypeParameterInstantiation', params: [] }

const typeReference = (typeName: unknown, typeArguments: unknown) => ({
  type: 'TSTypeReference',
  typeName,
  typeArguments,
})

const qualifiedName = (left: string, right: string) => ({
  type: 'TSQualifiedName',
  left: Testing.id(left),
  right: Testing.id(right),
})

const run = (node: unknown) =>
  Testing.runRule(noExplicitCommandTypeAnnotation, 'TSTypeReference', node)

describe('no-explicit-command-type-annotation', () => {
  it('flags Command with a type argument list', () => {
    const result = run(typeReference(Testing.id('Command'), typeArgumentList))

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('Command<...>')
  })

  it('allows a bare Command reference', () => {
    const result = run(Testing.tsTypeRef('Command'))

    expect(result).toHaveLength(0)
  })

  it('allows a different identifier with type arguments', () => {
    const result = run(typeReference(Testing.id('Foo'), typeArgumentList))

    expect(result).toHaveLength(0)
  })

  it('allows a qualified name with type arguments', () => {
    const result = run(
      typeReference(qualifiedName('M', 'Command'), typeArgumentList),
    )

    expect(result).toHaveLength(0)
  })

  it('allows the namespace-qualified Command.Command form', () => {
    const result = run(
      typeReference(qualifiedName('Command', 'Command'), typeArgumentList),
    )

    expect(result).toHaveLength(0)
  })
})
