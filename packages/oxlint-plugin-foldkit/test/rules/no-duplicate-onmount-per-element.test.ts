import * as Testing from 'effect-oxlint/testing'
import { describe, expect, it } from 'vitest'

import rule from '../../src/rules/no-duplicate-onmount-per-element.ts'

const array = (elements: ReadonlyArray<unknown>) => ({
  type: 'ArrayExpression',
  elements: Array.from(elements),
})

const onMount = (name: string) =>
  Testing.callExpr('OnMount', [Testing.id(name)])

const memberOnMount = (namespace: string, name: string) => ({
  type: 'CallExpression',
  callee: Testing.memberExpr(namespace, 'OnMount'),
  arguments: [Testing.id(name)],
})

const deepMemberOnMount = (name: string) => ({
  type: 'CallExpression',
  callee: Testing.chainedMemberExpr('Foldkit', 'Html', 'OnMount'),
  arguments: [Testing.id(name)],
})

const conditionalMount = () => ({
  type: 'ConditionalExpression',
  test: Testing.id('condition'),
  consequent: onMount('A'),
  alternate: onMount('B'),
})

describe('no-duplicate-onmount-per-element', () => {
  it('flags multiple bare OnMount calls in one attribute array', () => {
    const result = Testing.runRule(
      rule,
      'ArrayExpression',
      array([onMount('A'), onMount('B')]),
    )
    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('Only one `OnMount`')
  })

  it('flags mixed bare and member-form OnMount calls', () => {
    const result = Testing.runRule(
      rule,
      'ArrayExpression',
      array([onMount('A'), memberOnMount('h', 'B')]),
    )
    expect(result).toHaveLength(1)
  })

  it('flags member paths ending in OnMount', () => {
    const result = Testing.runRule(
      rule,
      'ArrayExpression',
      array([memberOnMount('h', 'A'), deepMemberOnMount('B')]),
    )
    expect(result).toHaveLength(1)
  })

  it('does not flag a single OnMount call', () => {
    const result = Testing.runRule(
      rule,
      'ArrayExpression',
      array([Testing.callExpr('Class'), onMount('A')]),
    )
    expect(result).toHaveLength(0)
  })

  it('does not flag conditional top-level OnMount alternatives', () => {
    const result = Testing.runRule(
      rule,
      'ArrayExpression',
      array([conditionalMount()]),
    )
    expect(result).toHaveLength(0)
  })

  it('does not count nested OnMount calls inside non-top-level expressions', () => {
    const result = Testing.runRule(
      rule,
      'ArrayExpression',
      array([Testing.callExpr('MaybeAttribute', [onMount('A')]), onMount('B')]),
    )
    expect(result).toHaveLength(0)
  })

  it('does not flag arrays with no OnMount calls', () => {
    const result = Testing.runRule(
      rule,
      'ArrayExpression',
      array([Testing.callExpr('Class'), Testing.callExpr('Id')]),
    )
    expect(result).toHaveLength(0)
  })

  it('ignores computed member calls', () => {
    const computed = {
      type: 'CallExpression',
      callee: Testing.computedMemberExpr('h', 'OnMount'),
      arguments: [Testing.id('A')],
    }
    const result = Testing.runRule(
      rule,
      'ArrayExpression',
      array([computed, onMount('B')]),
    )
    expect(result).toHaveLength(0)
  })
})
