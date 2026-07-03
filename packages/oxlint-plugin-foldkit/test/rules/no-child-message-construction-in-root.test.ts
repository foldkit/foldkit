import * as Testing from 'effect-oxlint/testing'
import { describe, expect, it } from 'vitest'

import rule from '../../src/rules/no-child-message-construction-in-root.ts'

const childMessageCall = (namespace: string, constructor: string) => ({
  type: 'CallExpression',
  callee: Testing.chainedMemberExpr(namespace, 'Message', constructor),
  arguments: [],
})

const callOf = (callee: unknown, args: ReadonlyArray<unknown> = []) => ({
  type: 'CallExpression',
  callee,
  arguments: Array.from(args),
})

describe('no-child-message-construction-in-root', () => {
  it('flags direct child Message constructor calls', () => {
    const result = Testing.runRule(
      rule,
      'CallExpression',
      childMessageCall('Chat', 'ClickedOpen'),
    )
    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('Chat.Message.ClickedOpen')
  })

  it('flags widget namespace Message constructor calls', () => {
    const result = Testing.runRule(
      rule,
      'CallExpression',
      childMessageCall('CommandPalette', 'OpenedCommandPalette'),
    )
    expect(result).toHaveLength(1)
  })

  it('does not flag the Message schema/type member itself', () => {
    const result = Testing.runRule(
      rule,
      'CallExpression',
      childMessageCall('Chat', 'Message'),
    )
    expect(result).toHaveLength(0)
  })

  it('does not flag member paths whose namespace is not PascalCase', () => {
    const result = Testing.runRule(
      rule,
      'CallExpression',
      childMessageCall('chat', 'ClickedOpen'),
    )
    expect(result).toHaveLength(0)
  })

  it('does not flag Message constructors used as values in guard arguments', () => {
    const node = callOf(
      Testing.callOfMember('S', 'is', [
        Testing.chainedMemberExpr(
          'CommandPalette',
          'Message',
          'OpenedCommandPalette',
        ),
      ]),
      [Testing.id('message')],
    )
    const result = Testing.runRule(rule, 'CallExpression', node)
    expect(result).toHaveLength(0)
  })

  it('does not flag shorter or longer member call paths', () => {
    const shortPath = Testing.callOfMember('Message', 'ClickedOpen')
    const longPath = callOf(
      Testing.chainedMemberExpr('Root', 'Chat', 'Message', 'ClickedOpen'),
    )
    expect(Testing.runRule(rule, 'CallExpression', shortPath)).toHaveLength(0)
    expect(Testing.runRule(rule, 'CallExpression', longPath)).toHaveLength(0)
  })

  it('does not flag non-Message member calls', () => {
    const result = Testing.runRule(
      rule,
      'CallExpression',
      callOf(Testing.chainedMemberExpr('Chat', 'Helpers', 'open')),
    )
    expect(result).toHaveLength(0)
  })
})
