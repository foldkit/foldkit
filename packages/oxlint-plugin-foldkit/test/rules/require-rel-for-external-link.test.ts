import * as Testing from 'effect-oxlint/testing'
import { describe, expect, it } from 'vitest'

import rule from '../../src/rules/require-rel-for-external-link.ts'

const arr = (elements: ReadonlyArray<unknown>) => ({
  type: 'ArrayExpression',
  elements: Array.from(elements),
})

const target = (value: string) =>
  Testing.callExpr('Target', [Testing.strLiteral(value)])

const rel = (value: string) =>
  Testing.callExpr('Rel', [Testing.strLiteral(value)])

describe('require-rel-for-external-link', () => {
  it('flags `[Target("_blank")]` with no `Rel(...)`', () => {
    const node = arr([target('_blank')])
    const result = Testing.runRule(rule, 'ArrayExpression', node)
    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('noopener noreferrer')
  })

  it('flags `[Class("link"), Target("_blank")]` (no `Rel`)', () => {
    const node = arr([
      Testing.callExpr('Class', [Testing.strLiteral('link')]),
      target('_blank'),
    ])
    const result = Testing.runRule(rule, 'ArrayExpression', node)
    expect(result).toHaveLength(1)
  })

  it('does not flag `[Target("_blank"), Rel("noopener noreferrer")]`', () => {
    const node = arr([target('_blank'), rel('noopener noreferrer')])
    const result = Testing.runRule(rule, 'ArrayExpression', node)
    expect(result).toHaveLength(0)
  })

  it('does not flag `[Rel("..."), Target("_blank")]` (any order)', () => {
    const node = arr([rel('noopener'), target('_blank')])
    const result = Testing.runRule(rule, 'ArrayExpression', node)
    expect(result).toHaveLength(0)
  })

  it('does not flag `[Target("_self")]` (not external)', () => {
    const node = arr([target('_self')])
    const result = Testing.runRule(rule, 'ArrayExpression', node)
    expect(result).toHaveLength(0)
  })

  it('does not flag a plain attribute array `[Class("link")]` (no Target)', () => {
    const node = arr([Testing.callExpr('Class', [Testing.strLiteral('link')])])
    const result = Testing.runRule(rule, 'ArrayExpression', node)
    expect(result).toHaveLength(0)
  })

  it('does not flag `[Target(someVar)]` (non-literal target)', () => {
    const node = arr([Testing.callExpr('Target', [Testing.id('someVar')])])
    const result = Testing.runRule(rule, 'ArrayExpression', node)
    expect(result).toHaveLength(0)
  })

  it('does not flag an empty array', () => {
    const result = Testing.runRule(rule, 'ArrayExpression', arr([]))
    expect(result).toHaveLength(0)
  })
})
