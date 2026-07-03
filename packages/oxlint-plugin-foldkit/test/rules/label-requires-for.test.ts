import * as Testing from 'effect-oxlint/testing'
import { describe, expect, it } from 'vitest'

import rule from '../../src/rules/label-requires-for.ts'

const arr = (elements: ReadonlyArray<unknown>) => ({
  type: 'ArrayExpression',
  elements: Array.from(elements),
})

const labelCall = (attrs: unknown, children: unknown) =>
  Testing.callExpr('label', [attrs, children])

const For = (value: string) =>
  Testing.callExpr('For', [Testing.strLiteral(value)])

const Class = (value: string) =>
  Testing.callExpr('Class', [Testing.strLiteral(value)])

describe('label-requires-for', () => {
  it('flags `label([], [...])`', () => {
    const node = labelCall(arr([]), arr([Testing.strLiteral('Email')]))
    const result = Testing.runRule(rule, 'CallExpression', node)
    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('For(id)')
  })

  it('flags `label([Class("...")], [...])` (no For)', () => {
    const node = labelCall(
      arr([Class('block')]),
      arr([Testing.strLiteral('Email')]),
    )
    const result = Testing.runRule(rule, 'CallExpression', node)
    expect(result).toHaveLength(1)
  })

  it('does not flag `label([For("id"), ...], [...])`', () => {
    const node = labelCall(
      arr([For('email-input'), Class('block')]),
      arr([Testing.strLiteral('Email')]),
    )
    const result = Testing.runRule(rule, 'CallExpression', node)
    expect(result).toHaveLength(0)
  })

  it('does not flag `label([Class("..."), For("id")], [...])` (any order)', () => {
    const node = labelCall(
      arr([Class('block'), For('email-input')]),
      arr([Testing.strLiteral('Email')]),
    )
    const result = Testing.runRule(rule, 'CallExpression', node)
    expect(result).toHaveLength(0)
  })

  it('does not flag non-label calls', () => {
    const node = Testing.callExpr('span', [arr([]), arr([])])
    const result = Testing.runRule(rule, 'CallExpression', node)
    expect(result).toHaveLength(0)
  })

  it('does not flag `label(spread)` without an ArrayExpression first arg', () => {
    const node = Testing.callExpr('label', [Testing.id('sharedAttrs'), arr([])])
    const result = Testing.runRule(rule, 'CallExpression', node)
    expect(result).toHaveLength(0)
  })

  it('does not flag a label with no arguments', () => {
    const node = Testing.callExpr('label', [])
    const result = Testing.runRule(rule, 'CallExpression', node)
    expect(result).toHaveLength(0)
  })
})
