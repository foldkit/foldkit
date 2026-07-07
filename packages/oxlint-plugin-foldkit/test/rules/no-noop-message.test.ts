import * as Testing from 'effect-oxlint/testing'
import { describe, expect, it } from 'vitest'

import { noNoopMessage } from '../../src/rules/no-noop-message.ts'

const m = (tag: string, fields?: unknown) =>
  Testing.callExpr(
    'm',
    fields === undefined
      ? [Testing.strLiteral(tag)]
      : [Testing.strLiteral(tag), fields],
  )

describe('no-noop-message', () => {
  it('flags generic NoOp Messages', () => {
    const result = Testing.runRule(noNoopMessage, 'CallExpression', m('NoOp'))

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('avoid generic NoOp')
  })

  it('allows specific Message names', () => {
    const result = Testing.runRule(
      noNoopMessage,
      'CallExpression',
      m('ClickedSave'),
    )

    expect(result).toHaveLength(0)
  })
})
