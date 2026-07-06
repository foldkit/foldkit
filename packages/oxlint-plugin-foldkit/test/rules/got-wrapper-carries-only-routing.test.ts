import * as Testing from 'effect-oxlint/testing'
import { describe, expect, it } from 'vitest'

import { gotWrapperCarriesOnlyRouting } from '../../src/rules/got-wrapper-carries-only-routing.ts'

const m = (tag: string, fields?: unknown) =>
  Testing.callExpr(
    'm',
    fields === undefined
      ? [Testing.strLiteral(tag)]
      : [Testing.strLiteral(tag), fields],
  )

describe('got-wrapper-carries-only-routing', () => {
  it('flags an extra field on a Got wrapper', () => {
    const result = Testing.runRule(
      gotWrapperCarriesOnlyRouting,
      'CallExpression',
      m(
        'GotChatMessage',
        Testing.objectExpr([{ key: 'message' }, { key: 'thought' }]),
      ),
    )

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('GotChatMessage')
    expect(result[0]?.diagnostic.message).toContain('thought')
  })

  it('flags an extra field declared with a string-literal key', () => {
    const fields = {
      type: 'ObjectExpression',
      properties: [
        {
          type: 'Property',
          key: Testing.id('message'),
          value: Testing.id('message'),
        },
        {
          type: 'Property',
          key: Testing.strLiteral('payload'),
          value: Testing.id('payload'),
        },
      ],
    }
    const result = Testing.runRule(
      gotWrapperCarriesOnlyRouting,
      'CallExpression',
      m('GotChatMessage', fields),
    )

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('payload')
  })

  it('flags exactly the extra field on a Got tag without the Message suffix', () => {
    const result = Testing.runRule(
      gotWrapperCarriesOnlyRouting,
      'CallExpression',
      m('GotChatUpdates', Testing.objectExpr([{ key: 'thought' }])),
    )

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('thought')
  })

  it('flags each extra field separately', () => {
    const result = Testing.runRule(
      gotWrapperCarriesOnlyRouting,
      'CallExpression',
      m(
        'GotChatMessage',
        Testing.objectExpr([
          { key: 'message' },
          { key: 'alpha' },
          { key: 'beta' },
        ]),
      ),
    )

    expect(result).toHaveLength(2)
    expect(result[0]?.diagnostic.message).toContain('alpha')
    expect(result[1]?.diagnostic.message).toContain('beta')
  })

  it('flags a key whose Id suffix is not capitalized exactly', () => {
    const result = Testing.runRule(
      gotWrapperCarriesOnlyRouting,
      'CallExpression',
      m(
        'GotChatMessage',
        Testing.objectExpr([{ key: 'message' }, { key: 'sessionID' }]),
      ),
    )

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('sessionID')
  })

  it('allows the canonical message-only wrapper', () => {
    const result = Testing.runRule(
      gotWrapperCarriesOnlyRouting,
      'CallExpression',
      m('GotChatMessage', Testing.objectExpr([{ key: 'message' }])),
    )

    expect(result).toHaveLength(0)
  })

  it('allows id and Id-suffixed routing fields', () => {
    const result = Testing.runRule(
      gotWrapperCarriesOnlyRouting,
      'CallExpression',
      m(
        'GotPiRuntimeModelComboboxMessage',
        Testing.objectExpr([
          { key: 'message' },
          { key: 'id' },
          { key: 'sessionId' },
        ]),
      ),
    )

    expect(result).toHaveLength(0)
  })

  it('ignores a wrapper without a fields argument', () => {
    const result = Testing.runRule(
      gotWrapperCarriesOnlyRouting,
      'CallExpression',
      m('GotChatMessage'),
    )

    expect(result).toHaveLength(0)
  })

  it('ignores a fields object missing the message property', () => {
    const result = Testing.runRule(
      gotWrapperCarriesOnlyRouting,
      'CallExpression',
      m('GotChatMessage', Testing.objectExpr([{ key: 'id' }])),
    )

    expect(result).toHaveLength(0)
  })

  it('allows a Got tag without the Message suffix when the fields are clean', () => {
    const result = Testing.runRule(
      gotWrapperCarriesOnlyRouting,
      'CallExpression',
      m('GotChatUpdates', Testing.objectExpr([{ key: 'message' }])),
    )

    expect(result).toHaveLength(0)
  })

  it('ignores a non-object fields argument', () => {
    const result = Testing.runRule(
      gotWrapperCarriesOnlyRouting,
      'CallExpression',
      m('GotChatMessage', Testing.id('Fields')),
    )

    expect(result).toHaveLength(0)
  })

  it('skips spread entries and computed keys', () => {
    const fields = {
      type: 'ObjectExpression',
      properties: [
        {
          type: 'Property',
          key: Testing.id('message'),
          value: Testing.id('message'),
        },
        { type: 'SpreadElement', argument: Testing.id('extras') },
        {
          type: 'Property',
          key: Testing.id('dynamic'),
          value: Testing.id('value'),
          computed: true,
        },
      ],
    }
    const result = Testing.runRule(
      gotWrapperCarriesOnlyRouting,
      'CallExpression',
      m('GotChatMessage', fields),
    )

    expect(result).toHaveLength(0)
  })

  it('ignores tags that do not match the Got wrapper pattern', () => {
    const result = Testing.runRule(
      gotWrapperCarriesOnlyRouting,
      'CallExpression',
      m('GotoSettings', Testing.objectExpr([{ key: 'thought' }])),
    )

    expect(result).toHaveLength(0)
  })

  it('ignores member calls named m', () => {
    const result = Testing.runRule(
      gotWrapperCarriesOnlyRouting,
      'CallExpression',
      Testing.callOfMember('Foo', 'm', [
        Testing.strLiteral('GotChatMessage'),
        Testing.objectExpr([{ key: 'thought' }]),
      ]),
    )

    expect(result).toHaveLength(0)
  })
})
