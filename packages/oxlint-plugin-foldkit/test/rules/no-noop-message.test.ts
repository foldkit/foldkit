import * as Testing from 'effect-oxlint/testing'
import { describe, expect, it } from 'vitest'

import { noNoopMessage } from '../../src/rules/no-noop-message.ts'

const message = (name: string, fields: unknown = Testing.objectExpr([])) => ({
  key: name,
  value: fields,
})

const defineMessageUnion = (
  ...cases: ReadonlyArray<ReturnType<typeof message>>
) => Testing.callExpr('defineMessageUnion', [Testing.objectExpr(cases)])

const foldkitMessageUnionProgram = (local = 'defineMessageUnion') =>
  Testing.program([
    Testing.importDeclWithSpecifiers('foldkit/message', [
      Testing.importSpecifier('defineMessageUnion', local),
    ]),
  ])

const runRule = (node: unknown, program = foldkitMessageUnionProgram()) =>
  Testing.runRuleMulti(noNoopMessage, [
    ['Program', program],
    ['CallExpression', node],
  ])

describe('no-noop-message', () => {
  it('flags generic NoOp Messages', () => {
    const result = runRule(defineMessageUnion(message('NoOp')))

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('avoid generic NoOp')
  })

  it('allows specific Message names', () => {
    const result = runRule(defineMessageUnion(message('ClickedSave')))

    expect(result).toHaveLength(0)
  })

  it('follows an aliased Foldkit defineMessageUnion import', () => {
    const result = runRule(
      Testing.callExpr('declareMessages', [
        Testing.objectExpr([message('NoOp')]),
      ]),
      foldkitMessageUnionProgram('declareMessages'),
    )

    expect(result).toHaveLength(1)
  })

  it('ignores an unrelated defineMessageUnion helper', () => {
    const result = runRule(
      defineMessageUnion(message('NoOp')),
      Testing.program(),
    )

    expect(result).toHaveLength(0)
  })

  it('recognizes a computed string variant name', () => {
    const result = runRule(
      Testing.callExpr('defineMessageUnion', [
        {
          type: 'ObjectExpression',
          properties: [
            {
              type: 'Property',
              computed: true,
              key: Testing.strLiteral('NoOp'),
              value: Testing.objectExpr([]),
            },
          ],
        },
      ]),
    )

    expect(result).toHaveLength(1)
  })
})
