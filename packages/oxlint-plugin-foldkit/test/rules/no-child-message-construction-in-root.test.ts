import * as Testing from 'effect-oxlint/testing'
import { describe, expect, it } from 'vitest'

import { noChildMessageConstructionInRoot } from '../../src/rules/no-child-message-construction-in-root.ts'

const callWithCallee = (
  callee: unknown,
  callArguments: ReadonlyArray<unknown> = [],
) => ({
  type: 'CallExpression',
  callee,
  arguments: callArguments,
})

describe('no-child-message-construction-in-root', () => {
  it('flags direct child Message construction', () => {
    const result = Testing.runRule(
      noChildMessageConstructionInRoot,
      'CallExpression',
      callWithCallee(
        Testing.chainedMemberExpr('Chat', 'Message', 'ClickedOpen'),
      ),
    )

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('Chat.Message.ClickedOpen')
  })

  it('flags widget-style namespaces', () => {
    const result = Testing.runRule(
      noChildMessageConstructionInRoot,
      'CallExpression',
      callWithCallee(
        Testing.chainedMemberExpr(
          'CommandPalette',
          'Message',
          'OpenedCommandPalette',
        ),
      ),
    )

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain(
      'CommandPalette.Message.OpenedCommandPalette',
    )
  })

  it('allows calling the child Message schema member itself', () => {
    const result = Testing.runRule(
      noChildMessageConstructionInRoot,
      'CallExpression',
      callWithCallee(Testing.chainedMemberExpr('Chat', 'Message', 'Message')),
    )

    expect(result).toHaveLength(0)
  })

  it('allows lowercase namespaces', () => {
    const result = Testing.runRule(
      noChildMessageConstructionInRoot,
      'CallExpression',
      callWithCallee(
        Testing.chainedMemberExpr('chat', 'Message', 'ClickedOpen'),
      ),
    )

    expect(result).toHaveLength(0)
  })

  it('allows child Message constructors referenced as values in guards', () => {
    const guardCall = Testing.callOfMember('S', 'is', [
      Testing.chainedMemberExpr(
        'CommandPalette',
        'Message',
        'OpenedCommandPalette',
      ),
    ])
    const appliedGuardCall = callWithCallee(guardCall, [Testing.id('message')])
    const result = Testing.runRuleMulti(noChildMessageConstructionInRoot, [
      ['CallExpression', appliedGuardCall],
      ['CallExpression', guardCall],
    ])

    expect(result).toHaveLength(0)
  })

  it('allows two-segment paths', () => {
    const result = Testing.runRule(
      noChildMessageConstructionInRoot,
      'CallExpression',
      callWithCallee(Testing.memberExpr('Message', 'ClickedOpen')),
    )

    expect(result).toHaveLength(0)
  })

  it('allows four-segment paths', () => {
    const result = Testing.runRule(
      noChildMessageConstructionInRoot,
      'CallExpression',
      callWithCallee(
        Testing.chainedMemberExpr('Root', 'Chat', 'Message', 'ClickedOpen'),
      ),
    )

    expect(result).toHaveLength(0)
  })

  it('allows middle segments other than Message', () => {
    const result = Testing.runRule(
      noChildMessageConstructionInRoot,
      'CallExpression',
      callWithCallee(Testing.chainedMemberExpr('Chat', 'Helpers', 'open')),
    )

    expect(result).toHaveLength(0)
  })

  it('ignores computed access in the chain', () => {
    const computedChain = {
      type: 'MemberExpression',
      computed: false,
      object: {
        type: 'MemberExpression',
        computed: true,
        object: Testing.id('Chat'),
        property: Testing.strLiteral('Message'),
      },
      property: Testing.id('ClickedOpen'),
    }
    const result = Testing.runRule(
      noChildMessageConstructionInRoot,
      'CallExpression',
      callWithCallee(computedChain),
    )

    expect(result).toHaveLength(0)
  })
})
