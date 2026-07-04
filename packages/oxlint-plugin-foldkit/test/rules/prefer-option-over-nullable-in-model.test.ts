import * as Testing from 'effect-oxlint/testing'
import { describe, expect, it } from 'vitest'

import { preferOptionOverNullableInModel } from '../../src/rules/prefer-option-over-nullable-in-model.ts'

const struct = (
  schemaAlias: string,
  properties: ReadonlyArray<{ readonly key: string; readonly value?: unknown }>,
) => Testing.callOfMember(schemaAlias, 'Struct', [Testing.objectExpr(properties)])

const modelDecl = (init: unknown) => Testing.varDeclarator('Model', init)

const run = (node: unknown) =>
  Testing.runRule(preferOptionOverNullableInModel, 'VariableDeclarator', node)

describe('prefer-option-over-nullable-in-model', () => {
  it('flags Schema.NullOr in the Model struct', () => {
    const result = run(
      modelDecl(
        struct('Schema', [
          {
            key: 'selectedId',
            value: Testing.callOfMember('Schema', 'NullOr', [Testing.id('TodoId')]),
          },
        ]),
      ),
    )

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('Schema.Option')
  })

  it('flags Schema.Null in the Model struct', () => {
    const result = run(
      modelDecl(
        struct('Schema', [
          { key: 'selected', value: Testing.memberExpr('Schema', 'Null') },
        ]),
      ),
    )

    expect(result).toHaveLength(1)
  })

  it('flags Schema.optional in the Model struct', () => {
    const result = run(
      modelDecl(
        struct('Schema', [
          {
            key: 'note',
            value: Testing.callOfMember('Schema', 'optional', [
              Testing.id('TodoNote'),
            ]),
          },
        ]),
      ),
    )

    expect(result).toHaveLength(1)
  })

  it('handles the S. alias', () => {
    const result = run(
      modelDecl(
        struct('S', [
          {
            key: 'selectedId',
            value: Testing.callOfMember('S', 'NullOr', [Testing.id('TodoId')]),
          },
        ]),
      ),
    )

    expect(result).toHaveLength(1)
  })

  it('allows Schema.Option in the Model struct', () => {
    const result = run(
      modelDecl(
        struct('Schema', [
          {
            key: 'selectedId',
            value: Testing.callOfMember('Schema', 'Option', [Testing.id('TodoId')]),
          },
        ]),
      ),
    )

    expect(result).toHaveLength(0)
  })

  it('does not flag NullOr in a non-Model struct', () => {
    const result = run(
      Testing.varDeclarator(
        'ApiTodo',
        struct('Schema', [
          {
            key: 'note',
            value: Testing.callOfMember('Schema', 'NullOr', [
              Testing.memberExpr('Schema', 'String'),
            ]),
          },
        ]),
      ),
    )

    expect(result).toHaveLength(0)
  })
})
