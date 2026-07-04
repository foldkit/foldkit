import * as Testing from 'effect-oxlint/testing'
import { describe, expect, it } from 'vitest'

import { outlineNoneRequiresFocusVisible } from '../../src/rules/outline-none-requires-focus-visible.ts'

const classCall = (value: string) =>
  Testing.callOfMember('h', 'Class', [Testing.strLiteral(value)])

const run = (node: unknown) =>
  Testing.runRule(outlineNoneRequiresFocusVisible, 'CallExpression', node)

describe('outline-none-requires-focus-visible', () => {
  it('flags outline-none without a focus-visible token', () => {
    const result = run(classCall('outline-none px-3 py-2'))

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('focus-visible')
  })

  it('allows outline-none paired with focus-visible:', () => {
    const result = run(classCall('outline-none focus-visible:ring-2 px-3'))

    expect(result).toHaveLength(0)
  })

  it('allows a class without outline-none', () => {
    const result = run(classCall('px-3 py-2'))

    expect(result).toHaveLength(0)
  })

  it('flags the bare Class(...) form', () => {
    const result = run(
      Testing.callExpr('Class', [Testing.strLiteral('outline-none rounded')]),
    )

    expect(result).toHaveLength(1)
  })

  it('ignores a substring like group-outline-none-ish', () => {
    const result = run(classCall('group-outline-none-ish px-3'))

    expect(result).toHaveLength(0)
  })

  it('ignores non-Class calls', () => {
    const result = run(
      Testing.callOfMember('h', 'Role', [Testing.strLiteral('outline-none')]),
    )

    expect(result).toHaveLength(0)
  })

  it('ignores a Class call with a non-string argument', () => {
    const result = run(Testing.callOfMember('h', 'Class', [Testing.id('cls')]))

    expect(result).toHaveLength(0)
  })
})
