import * as Testing from 'effect-oxlint/testing'
import { describe, expect, it } from 'vitest'

import rule from '../../src/rules/prefer-empty-over-empty-element.ts'

const arr = (elements: ReadonlyArray<unknown> = []) => ({
  type: 'ArrayExpression',
  elements: Array.from(elements),
})

const emptyArr = arr([])

describe('prefer-empty-over-empty-element', () => {
  // ── bare-identifier hyperscript helpers ─────────────────
  it.each(['span', 'div', 'p', 'section', 'article'])(
    'flags `%s([], [])`',
    elementName => {
      const result = Testing.runRule(
        rule,
        'CallExpression',
        Testing.callExpr(elementName, [emptyArr, emptyArr]),
      )
      expect(result).toHaveLength(1)
      expect(result[0]?.diagnostic.message).toContain(elementName)
      expect(result[0]?.diagnostic.message).toContain('`empty`')
    },
  )

  // ── member-style hyperscript helpers (`h.span([], [])`) ──
  it('flags `h.span([], [])` and recommends `h.empty`', () => {
    const result = Testing.runRule(
      rule,
      'CallExpression',
      Testing.callOfMember('h', 'span', [emptyArr, emptyArr]),
    )
    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('h.empty')
  })

  // ── allowed: non-empty children or attributes ───────────
  it('does not flag `span([], [text("hi")])`', () => {
    const result = Testing.runRule(
      rule,
      'CallExpression',
      Testing.callExpr('span', [
        emptyArr,
        arr([Testing.callExpr('text', [Testing.strLiteral('hi')])]),
      ]),
    )
    expect(result).toHaveLength(0)
  })

  it('does not flag `span([Class("a")], [])`', () => {
    const result = Testing.runRule(
      rule,
      'CallExpression',
      Testing.callExpr('span', [
        arr([Testing.callExpr('Class', [Testing.strLiteral('a')])]),
        emptyArr,
      ]),
    )
    expect(result).toHaveLength(0)
  })

  it('does not flag `span([])` (one arg, missing children)', () => {
    const result = Testing.runRule(
      rule,
      'CallExpression',
      Testing.callExpr('span', [emptyArr]),
    )
    expect(result).toHaveLength(0)
  })

  // ── non-target elements ─────────────────────────────────
  it('does not flag `button([], [])` (not in the empty-able list)', () => {
    const result = Testing.runRule(
      rule,
      'CallExpression',
      Testing.callExpr('button', [emptyArr, emptyArr]),
    )
    expect(result).toHaveLength(0)
  })

  it('does not flag `Foo([], [])` (PascalCase identifier, not a hyperscript helper)', () => {
    const result = Testing.runRule(
      rule,
      'CallExpression',
      Testing.callExpr('Foo', [emptyArr, emptyArr]),
    )
    expect(result).toHaveLength(0)
  })

  it('does not flag `obj.button([], [])` (member callee but not a known element)', () => {
    const result = Testing.runRule(
      rule,
      'CallExpression',
      Testing.callOfMember('h', 'button', [emptyArr, emptyArr]),
    )
    expect(result).toHaveLength(0)
  })
})
