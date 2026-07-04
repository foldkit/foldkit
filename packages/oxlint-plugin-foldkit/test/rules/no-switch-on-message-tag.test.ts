import * as Testing from 'effect-oxlint/testing'
import { describe, expect, it } from 'vitest'

import { noSwitchOnMessageTag } from '../../src/rules/no-switch-on-message-tag.ts'

const switchOn = (discriminant: unknown) => ({
  type: 'SwitchStatement' as const,
  discriminant,
  cases: [],
})

const computedTag = (object: string) => ({
  type: 'MemberExpression' as const,
  object: Testing.id(object),
  property: Testing.strLiteral('_tag'),
  computed: true,
  optional: false,
})

const run = (node: unknown) =>
  Testing.runRule(noSwitchOnMessageTag, 'SwitchStatement', node)

describe('no-switch-on-message-tag', () => {
  it('flags a switch on message._tag', () => {
    const result = run(switchOn(Testing.memberExpr('message', '_tag')))

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('M.tagsExhaustive')
    expect(result[0]?.diagnostic.message).toContain('exhaustiveness')
  })

  it('flags a switch on a differently-named tag holder', () => {
    const result = run(switchOn(Testing.memberExpr('state', '_tag')))

    expect(result).toHaveLength(1)
  })

  it('flags the computed member form switch (x["_tag"])', () => {
    const result = run(switchOn(computedTag('message')))

    expect(result).toHaveLength(1)
  })

  it('ignores a switch on a non-tag member', () => {
    const result = run(switchOn(Testing.memberExpr('message', 'kind')))

    expect(result).toHaveLength(0)
  })

  it('ignores a switch on a plain identifier', () => {
    const result = run(switchOn(Testing.id('value')))

    expect(result).toHaveLength(0)
  })

  it('ignores a computed member with a non-tag key', () => {
    const result = run(
      switchOn({
        type: 'MemberExpression',
        object: Testing.id('message'),
        property: Testing.strLiteral('kind'),
        computed: true,
        optional: false,
      }),
    )

    expect(result).toHaveLength(0)
  })
})
