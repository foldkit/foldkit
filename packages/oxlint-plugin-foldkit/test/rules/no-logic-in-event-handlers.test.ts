import * as Testing from 'effect-oxlint/testing'
import { describe, expect, it } from 'vitest'

import { noLogicInEventHandlers } from '../../src/rules/no-logic-in-event-handlers.ts'

const handler = (event: string, arg: unknown) =>
  Testing.callOfMember('h', event, [arg])

const conditional = () => ({
  type: 'ConditionalExpression' as const,
  test: Testing.binaryExpr('>', Testing.memberExpr('model', 'count'), Testing.numLiteral(5)),
  consequent: Testing.callExpr('ClickedReset', []),
  alternate: Testing.callExpr('ClickedIncrement', []),
})

const run = (node: unknown) =>
  Testing.runRule(noLogicInEventHandlers, 'CallExpression', node)

describe('no-logic-in-event-handlers', () => {
  it('flags a handler whose arrow body is a conditional', () => {
    const result = run(
      handler('OnClick', Testing.arrowFn(conditional())),
    )

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('update')
  })

  it('flags a handler whose arrow body is a block statement', () => {
    const result = run(
      handler('OnClick', Testing.arrowFn(Testing.blockStmt([]))),
    )

    expect(result).toHaveLength(1)
  })

  it('flags a handler whose arrow body is a logical expression', () => {
    const result = run(
      handler(
        'OnClick',
        Testing.arrowFn({
          type: 'LogicalExpression',
          operator: '&&',
          left: Testing.id('ready'),
          right: Testing.callExpr('ClickedSave', []),
        }),
      ),
    )

    expect(result).toHaveLength(1)
  })

  it('allows a bare Message constructor reference', () => {
    const result = run(handler('OnClick', Testing.id('ClickedIncrement')))

    expect(result).toHaveLength(0)
  })

  it('allows a single-constructor-call payload adapter', () => {
    const result = run(
      handler(
        'OnInput',
        Testing.arrowFn(
          Testing.callExpr('UpdatedEmail', [
            Testing.objectExpr([{ key: 'value' }]),
          ]),
          [Testing.id('event')],
        ),
      ),
    )

    expect(result).toHaveLength(0)
  })

  it('allows a direct constructor call argument', () => {
    const result = run(handler('OnClick', Testing.callExpr('ClickedCrash', [])))

    expect(result).toHaveLength(0)
  })

  it('ignores a non-event call with an arrow argument', () => {
    const result = run(
      Testing.callExpr('map', [Testing.arrowFn(conditional())]),
    )

    expect(result).toHaveLength(0)
  })
})
