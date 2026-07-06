import * as Testing from 'effect-oxlint/testing'
import { describe, expect, it } from 'vitest'

import { messageBindingMatchesTag } from '../../src/rules/message-binding-matches-tag.ts'

const m = (tag: string, fields?: unknown) =>
  Testing.callExpr(
    'm',
    fields === undefined
      ? [Testing.strLiteral(tag)]
      : [Testing.strLiteral(tag), fields],
  )

const variableDeclarator = (name: string, init: unknown) => ({
  type: 'VariableDeclarator',
  id: Testing.id(name),
  init,
})

describe('message-binding-matches-tag', () => {
  it('flags Message bindings that do not match their m() tag', () => {
    const result = Testing.runRule(
      messageBindingMatchesTag,
      'VariableDeclarator',
      variableDeclarator('ClickedSave', m('ClickedSubmit')),
    )

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('does not match')
  })

  it('allows Message bindings that match their m() tag', () => {
    const result = Testing.runRule(
      messageBindingMatchesTag,
      'VariableDeclarator',
      variableDeclarator('ClickedSave', m('ClickedSave')),
    )

    expect(result).toHaveLength(0)
  })
})
