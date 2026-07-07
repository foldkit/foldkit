import * as Testing from 'effect-oxlint/testing'
import { describe, expect, it } from 'vitest'

import { noHandRolledCommandStruct } from '../../src/rules/no-hand-rolled-command-struct.ts'

const property = (key: string, value: unknown) => ({
  type: 'Property',
  key: Testing.id(key),
  value,
})

const computedProperty = (key: unknown, value: unknown) => ({
  type: 'Property',
  key,
  value,
  computed: true,
})

const spreadObject = (
  spreadName: string,
  properties: ReadonlyArray<unknown>,
) => ({
  type: 'ObjectExpression',
  properties: [
    { type: 'SpreadElement', argument: Testing.id(spreadName) },
    ...properties,
  ],
})

const run = (node: unknown) =>
  Testing.runRule(noHandRolledCommandStruct, 'ObjectExpression', node)

describe('no-hand-rolled-command-struct', () => {
  it('flags the two-key Command shape', () => {
    const result = run(
      Testing.objectExpr([
        { key: 'name', value: Testing.strLiteral('SaveDraft') },
        { key: 'effect', value: Testing.id('effect') },
      ]),
    )

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('Command.define')
  })

  it('flags the three-key Command shape', () => {
    const result = run(
      Testing.objectExpr([
        { key: 'name', value: Testing.strLiteral('SaveDraft') },
        { key: 'args', value: Testing.objectExpr([]) },
        { key: 'effect', value: Testing.id('effect') },
      ]),
    )

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('{ name, args, effect }')
  })

  it('flags the Command shape written with string literal keys', () => {
    const result = run(
      Testing.objectExprLiteralKeys([
        { key: 'name', value: Testing.strLiteral('SaveDraft') },
        { key: 'effect', value: Testing.id('effect') },
      ]),
    )

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('Command.define')
  })

  it('flags a spread rebuild that overrides effect', () => {
    const result = run(
      spreadObject('command', [property('effect', Testing.id('nextEffect'))]),
    )

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('Command.mapEffect')
  })

  it('reports the spread diagnostic when both triggers match', () => {
    const result = run(
      spreadObject('command', [
        property('name', Testing.strLiteral('SaveDraft')),
        property('effect', Testing.id('nextEffect')),
      ]),
    )

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('Command.mapEffect')
  })

  it('allows an object with an extra non-Command key', () => {
    const result = run(
      Testing.objectExpr([
        { key: 'name', value: Testing.strLiteral('SaveDraft') },
        { key: 'effect', value: Testing.id('effect') },
        { key: 'metadata', value: Testing.objectExpr([]) },
      ]),
    )

    expect(result).toHaveLength(0)
  })

  it('allows a config object that merely has effect', () => {
    const result = run(
      Testing.objectExpr([
        { key: 'effect', value: Testing.id('effect') },
        { key: 'policy', value: Testing.strLiteral('retry') },
      ]),
    )

    expect(result).toHaveLength(0)
  })

  it('allows a spread without a static effect key', () => {
    const result = run(
      spreadObject('command', [property('args', Testing.objectExpr([]))]),
    )

    expect(result).toHaveLength(0)
  })

  it('allows a spread with a computed identifier key', () => {
    const result = run(
      spreadObject('command', [
        computedProperty(Testing.id('effectKey'), Testing.id('nextEffect')),
      ]),
    )

    expect(result).toHaveLength(0)
  })

  it('allows a spread with a computed string literal effect key', () => {
    const result = run(
      spreadObject('command', [
        computedProperty(
          Testing.strLiteral('effect'),
          Testing.id('nextEffect'),
        ),
      ]),
    )

    expect(result).toHaveLength(0)
  })

  it('allows an object with only a spread', () => {
    const result = run(Testing.objectExprWithSpread(Testing.id('command')))

    expect(result).toHaveLength(0)
  })

  it('allows an empty object', () => {
    const result = run(Testing.objectExpr([]))

    expect(result).toHaveLength(0)
  })
})
