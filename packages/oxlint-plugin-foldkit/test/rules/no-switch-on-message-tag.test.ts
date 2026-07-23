import * as Testing from 'effect-oxlint/testing'
import { describe, expect, it } from 'vitest'

import { noSwitchOnMessageTag } from '../../src/rules/no-switch-on-message-tag.ts'

const switchOn = (discriminant: unknown) => ({
  type: 'SwitchStatement',
  discriminant,
  cases: [],
})

const computedMember = (object: string, key: string) => ({
  type: 'MemberExpression',
  object: Testing.id(object),
  property: Testing.strLiteral(key),
  computed: true,
})

describe('no-switch-on-message-tag', () => {
  it('flags a switch on a dotted _tag discriminant', () => {
    const result = Testing.runRule(
      noSwitchOnMessageTag,
      'SwitchStatement',
      switchOn(Testing.memberExpr('message', '_tag')),
    )

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('M.tagsExhaustive')
  })

  it('flags a switch on a computed _tag discriminant', () => {
    const result = Testing.runRule(
      noSwitchOnMessageTag,
      'SwitchStatement',
      switchOn(computedMember('message', '_tag')),
    )

    expect(result).toHaveLength(1)
  })

  it('allows a switch on a non-_tag discriminant', () => {
    const result = Testing.runRule(
      noSwitchOnMessageTag,
      'SwitchStatement',
      switchOn(Testing.memberExpr('view', 'kind')),
    )

    expect(result).toHaveLength(0)
  })

  it('allows a switch on a bare identifier', () => {
    const result = Testing.runRule(
      noSwitchOnMessageTag,
      'SwitchStatement',
      switchOn(Testing.id('value')),
    )

    expect(result).toHaveLength(0)
  })
})
