import * as Testing from 'effect-oxlint/testing'
import { describe, expect, it } from 'vitest'

import { gotSubmodelMessageName } from '../../src/rules/got-submodel-message-name.ts'

const message = (name: string, fields: unknown = Testing.objectExpr([])) => ({
  key: name,
  value: fields,
})

const defineMessageUnion = (
  ...cases: ReadonlyArray<ReturnType<typeof message>>
) => Testing.callExpr('defineMessageUnion', [Testing.objectExpr(cases)])

const runRule = (node: unknown) =>
  Testing.runRuleMulti(gotSubmodelMessageName, [
    [
      'Program',
      Testing.program([
        Testing.importDeclWithSpecifiers('foldkit/message', [
          Testing.importSpecifier('defineMessageUnion'),
        ]),
      ]),
    ],
    ['CallExpression', node],
  ])

describe('got-submodel-message-name', () => {
  it('requires Message payload wrappers to use Got*Message names', () => {
    const result = runRule(
      defineMessageUnion(
        message('ReceivedChild', Testing.objectExpr([{ key: 'message' }])),
      ),
    )

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('Got*Message')
  })

  it('allows Got*Message wrappers around Submodel Messages', () => {
    const result = runRule(
      defineMessageUnion(
        message(
          'GotChildMessage',
          Testing.objectExpr([
            { key: 'message', value: Testing.memberExpr('Child', 'Message') },
          ]),
        ),
      ),
    )

    expect(result).toHaveLength(0)
  })
})
