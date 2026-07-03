import * as Testing from 'effect-oxlint/testing'
import { describe, expect, it } from 'vitest'

import rule from '../../src/rules/no-hand-rolled-command-struct.ts'

const spread = (argument: unknown) => ({
  type: 'SpreadElement',
  argument,
})

const computedProperty = (key: unknown, value: unknown) => ({
  type: 'Property',
  kind: 'init',
  computed: true,
  method: false,
  shorthand: false,
  key,
  value,
})

const objectWithProperties = (properties: ReadonlyArray<unknown>) => ({
  type: 'ObjectExpression',
  properties: Array.from(properties),
})

describe('no-hand-rolled-command-struct', () => {
  it('flags `{ name, effect }` Command-shaped object literals', () => {
    const result = Testing.runRule(
      rule,
      'ObjectExpression',
      Testing.objectExpr([
        { key: 'name', value: Testing.strLiteral('SaveDraft') },
        { key: 'effect', value: Testing.id('effect') },
      ]),
    )
    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('Command.define')
  })

  it('flags `{ name, args, effect }` Command-shaped object literals', () => {
    const result = Testing.runRule(
      rule,
      'ObjectExpression',
      Testing.objectExpr([
        { key: 'name', value: Testing.strLiteral('SaveDraft') },
        { key: 'args', value: Testing.objectExpr([]) },
        { key: 'effect', value: Testing.id('effect') },
      ]),
    )
    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('name, args, effect')
  })

  it('flags string-literal keys with the same command struct shape', () => {
    const result = Testing.runRule(
      rule,
      'ObjectExpression',
      Testing.objectExprLiteralKeys([
        { key: 'name', value: Testing.strLiteral('SaveDraft') },
        { key: 'effect', value: Testing.id('effect') },
      ]),
    )
    expect(result).toHaveLength(1)
  })

  it('flags object spread plus explicit `effect` rebuilds', () => {
    const result = Testing.runRule(
      rule,
      'ObjectExpression',
      objectWithProperties([
        spread(Testing.id('command')),
        {
          type: 'Property',
          kind: 'init',
          computed: false,
          method: false,
          shorthand: false,
          key: Testing.id('effect'),
          value: Testing.id('nextEffect'),
        },
      ]),
    )
    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('Command.mapEffect')
  })

  it('does not flag object literals with extra non-command keys', () => {
    const result = Testing.runRule(
      rule,
      'ObjectExpression',
      Testing.objectExpr([
        { key: 'name', value: Testing.strLiteral('SaveDraft') },
        { key: 'effect', value: Testing.id('effect') },
        { key: 'metadata', value: Testing.objectExpr([]) },
      ]),
    )
    expect(result).toHaveLength(0)
  })

  it('does not flag config objects that only happen to have `effect`', () => {
    const result = Testing.runRule(
      rule,
      'ObjectExpression',
      Testing.objectExpr([
        { key: 'effect', value: Testing.id('effect') },
        { key: 'policy', value: Testing.strLiteral('retry') },
      ]),
    )
    expect(result).toHaveLength(0)
  })

  it('does not flag spreads without an explicit `effect` property', () => {
    const result = Testing.runRule(
      rule,
      'ObjectExpression',
      objectWithProperties([
        spread(Testing.id('command')),
        {
          type: 'Property',
          kind: 'init',
          computed: false,
          method: false,
          shorthand: false,
          key: Testing.id('args'),
          value: Testing.objectExpr([]),
        },
      ]),
    )
    expect(result).toHaveLength(0)
  })

  it('does not treat computed `effect` keys as explicit command rebuilds', () => {
    const result = Testing.runRule(
      rule,
      'ObjectExpression',
      objectWithProperties([
        spread(Testing.id('command')),
        computedProperty(Testing.id('effectKey'), Testing.id('nextEffect')),
      ]),
    )
    expect(result).toHaveLength(0)
  })
})
