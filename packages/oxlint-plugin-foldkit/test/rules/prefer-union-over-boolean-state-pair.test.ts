import * as Testing from 'effect-oxlint/testing'
import { describe, expect, it } from 'vitest'

import { preferUnionOverBooleanStatePair } from '../../src/rules/prefer-union-over-boolean-state-pair.ts'

const boolean = (alias: string) => Testing.memberExpr(alias, 'Boolean')

const struct = (
  schemaAlias: string,
  properties: ReadonlyArray<{ readonly key: string; readonly value?: unknown }>,
) => Testing.callOfMember(schemaAlias, 'Struct', [Testing.objectExpr(properties)])

const modelDecl = (init: unknown) => Testing.varDeclarator('Model', init)

const run = (node: unknown) =>
  Testing.runRule(preferUnionOverBooleanStatePair, 'VariableDeclarator', node)

describe('prefer-union-over-boolean-state-pair', () => {
  it('flags two is*-boolean fields in the Model struct', () => {
    const result = run(
      modelDecl(
        struct('Schema', [
          { key: 'isLoading', value: boolean('Schema') },
          { key: 'isError', value: boolean('Schema') },
          {
            key: 'data',
            value: Testing.callOfMember('Schema', 'Option', [Testing.id('Data')]),
          },
        ]),
      ),
    )

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('Schema.Union')
  })

  it('flags three is/has-boolean fields', () => {
    const result = run(
      modelDecl(
        struct('S', [
          { key: 'isLoading', value: boolean('S') },
          { key: 'isError', value: boolean('S') },
          { key: 'hasData', value: boolean('S') },
        ]),
      ),
    )

    expect(result).toHaveLength(1)
  })

  it('does not flag a single is*-boolean field', () => {
    const result = run(
      modelDecl(
        struct('Schema', [
          { key: 'isLoading', value: boolean('Schema') },
          { key: 'count', value: Testing.memberExpr('Schema', 'Number') },
        ]),
      ),
    )

    expect(result).toHaveLength(0)
  })

  it('does not flag two booleans lacking the is/has prefix', () => {
    const result = run(
      modelDecl(
        struct('Schema', [
          { key: 'loading', value: boolean('Schema') },
          { key: 'error', value: boolean('Schema') },
        ]),
      ),
    )

    expect(result).toHaveLength(0)
  })

  it('ignores non-Model structs', () => {
    const result = run(
      Testing.varDeclarator(
        'Widget',
        struct('Schema', [
          { key: 'isLoading', value: boolean('Schema') },
          { key: 'isError', value: boolean('Schema') },
        ]),
      ),
    )

    expect(result).toHaveLength(0)
  })
})
