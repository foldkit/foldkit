import * as Testing from 'effect-oxlint/testing'
import { describe, expect, it } from 'vitest'

import rule from '../../src/rules/no-hand-rolled-form-controls.ts'

const arr = (elements: ReadonlyArray<unknown>) => ({
  type: 'ArrayExpression',
  elements: Array.from(elements),
})

const spread = (object: string, property: string) => ({
  type: 'SpreadElement',
  argument: {
    type: 'MemberExpression',
    object: Testing.id(object),
    property: Testing.id(property),
    computed: false,
  },
})

describe('no-hand-rolled-form-controls', () => {
  it('flags bare `input([...], [])`', () => {
    const node = Testing.callExpr('input', [arr([]), arr([])])
    const result = Testing.runRule(rule, 'CallExpression', node)
    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('Ui.Input.view')
  })

  it('flags bare `textarea([...], [])`', () => {
    const node = Testing.callExpr('textarea', [arr([]), arr([])])
    const result = Testing.runRule(rule, 'CallExpression', node)
    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('Ui.Textarea.view')
  })

  it('flags bare `button([...], [...])`', () => {
    const node = Testing.callExpr('button', [
      arr([]),
      arr([Testing.strLiteral('Submit')]),
    ])
    const result = Testing.runRule(rule, 'CallExpression', node)
    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('Ui.Button')
  })

  it('does not flag `button([...attributes.button, ...], [...])` (Ui.Button toView callback)', () => {
    const node = Testing.callExpr('button', [
      arr([
        spread('attributes', 'button'),
        Testing.callExpr('Class', [Testing.strLiteral('custom')]),
      ]),
      arr([Testing.id('label')]),
    ])
    const result = Testing.runRule(rule, 'CallExpression', node)
    expect(result).toHaveLength(0)
  })

  it('does not flag `input([...attributes.input], [])` (Ui.Input toView callback)', () => {
    const node = Testing.callExpr('input', [
      arr([spread('attributes', 'input')]),
      arr([]),
    ])
    const result = Testing.runRule(rule, 'CallExpression', node)
    expect(result).toHaveLength(0)
  })

  it('does not flag unrelated calls', () => {
    const node = Testing.callExpr('span', [arr([]), arr([])])
    const result = Testing.runRule(rule, 'CallExpression', node)
    expect(result).toHaveLength(0)
  })

  it('does not flag calls whose callee is not `input`/`textarea`/`button`', () => {
    const node = Testing.callExpr('viewSomething', [arr([])])
    const result = Testing.runRule(rule, 'CallExpression', node)
    expect(result).toHaveLength(0)
  })

  it('does not flag spreads of other identifiers (e.g. `...inputAttrs`)', () => {
    const node = Testing.callExpr('input', [
      arr([
        {
          type: 'SpreadElement',
          argument: Testing.id('inputAttrs'),
        },
      ]),
      arr([]),
    ])
    const result = Testing.runRule(rule, 'CallExpression', node)
    expect(result).toHaveLength(1)
  })

  it('flags `input()` with no arguments at all', () => {
    const node = Testing.callExpr('input', [])
    const result = Testing.runRule(rule, 'CallExpression', node)
    expect(result).toHaveLength(1)
  })
})
