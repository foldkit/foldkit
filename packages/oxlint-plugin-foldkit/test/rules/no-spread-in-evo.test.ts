import * as Testing from 'effect-oxlint/testing'
import { describe, expect, it } from 'vitest'

import rule from '../../src/rules/no-spread-in-evo.ts'

/** Build `evo(model, updates)` where `updates` is the supplied object expression. */
const evoCall = (updates: unknown) =>
  Testing.callExpr('evo', [Testing.id('model'), updates])

/**
 * `{ field: () => <body> }` — the wrapping update for one field.
 * Tests pass an arrow body to validate spread detection in expression-bodied
 * and block-bodied updaters.
 */
const updaterField = (field: string, arrowBody: unknown) =>
  Testing.objectExpr([
    {
      key: field,
      value: Testing.arrowFn(arrowBody),
    },
  ])

describe('no-spread-in-evo', () => {
  it('flags `evo(m, { f: () => ({ ...m.f, x: 1 }) })` (expression-body spread)', () => {
    const innerObj = Testing.objectExprWithSpread(
      Testing.memberExpr('model', 'f'),
    )
    const result = Testing.runRule(
      rule,
      'CallExpression',
      evoCall(updaterField('f', innerObj)),
    )
    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('field `f`')
    expect(result[0]?.diagnostic.message).toContain('nested `evo`')
  })

  it('flags spread inside a block-body updater', () => {
    const innerObj = Testing.objectExprWithSpread(
      Testing.memberExpr('model', 'f'),
    )
    const blockBody = Testing.blockStmt([Testing.returnStmt(innerObj)])
    const result = Testing.runRule(
      rule,
      'CallExpression',
      evoCall(updaterField('f', blockBody)),
    )
    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('field `f`')
  })

  it('flags spreads in multiple fields independently', () => {
    const spreadObj = Testing.objectExprWithSpread(
      Testing.memberExpr('model', 'a'),
    )
    const updates = Testing.objectExpr([
      { key: 'a', value: Testing.arrowFn(spreadObj) },
      { key: 'b', value: Testing.arrowFn(spreadObj) },
    ])
    const result = Testing.runRule(rule, 'CallExpression', evoCall(updates))
    expect(result).toHaveLength(2)
  })

  it('does not flag a clean `evo(m, { f: () => evo(m.f, { x: 1 }) })`', () => {
    const nestedEvo = Testing.callExpr('evo', [
      Testing.memberExpr('model', 'f'),
      Testing.objectExpr([{ key: 'x', value: Testing.numLiteral(1) }]),
    ])
    const result = Testing.runRule(
      rule,
      'CallExpression',
      evoCall(updaterField('f', nestedEvo)),
    )
    expect(result).toHaveLength(0)
  })

  it('does not flag `evo(m, { f: () => ({ x: 1 }) })` (object literal without spread)', () => {
    const cleanObj = Testing.objectExpr([
      { key: 'x', value: Testing.numLiteral(1) },
    ])
    const result = Testing.runRule(
      rule,
      'CallExpression',
      evoCall(updaterField('f', cleanObj)),
    )
    expect(result).toHaveLength(0)
  })

  it('does not flag spread combined with a computed key (dynamic record update)', () => {
    // `expanded: (x) => ({ ...x, [slug]: !v })` — a computed-key update that a
    // static nested `evo` cannot express, so the spread is legitimate.
    const spreadPlusComputed = {
      type: 'ObjectExpression',
      properties: [
        {
          type: 'SpreadElement',
          argument: Testing.id('x'),
        },
        {
          type: 'Property',
          key: Testing.id('slug'),
          value: Testing.unaryExpr('!', Testing.id('v')),
          computed: true,
        },
      ],
    }
    const result = Testing.runRule(
      rule,
      'CallExpression',
      evoCall(updaterField('expanded', spreadPlusComputed)),
    )
    expect(result).toHaveLength(0)
  })

  it('still flags spread combined with only static keys', () => {
    const spreadPlusStatic = {
      type: 'ObjectExpression',
      properties: [
        {
          type: 'SpreadElement',
          argument: Testing.memberExpr('model', 'f'),
        },
        {
          type: 'Property',
          key: Testing.id('y'),
          value: Testing.numLiteral(1),
          computed: false,
        },
      ],
    }
    const result = Testing.runRule(
      rule,
      'CallExpression',
      evoCall(updaterField('f', spreadPlusStatic)),
    )
    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('field `f`')
  })

  it('does not flag a non-`evo` call with the same shape', () => {
    const innerObj = Testing.objectExprWithSpread(
      Testing.memberExpr('model', 'f'),
    )
    const result = Testing.runRule(
      rule,
      'CallExpression',
      Testing.callExpr('foo', [
        Testing.id('model'),
        updaterField('f', innerObj),
      ]),
    )
    expect(result).toHaveLength(0)
  })

  it('does not flag `evo(m, x)` (second arg not an object literal)', () => {
    const result = Testing.runRule(
      rule,
      'CallExpression',
      Testing.callExpr('evo', [Testing.id('model'), Testing.id('x')]),
    )
    expect(result).toHaveLength(0)
  })
})
