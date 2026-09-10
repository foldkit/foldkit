import * as Testing from 'effect-oxlint/testing'
import { describe, expect, it } from 'vitest'

import { gotWrapperCarriesOnlyRouting } from '../../src/rules/got-wrapper-carries-only-routing.ts'

const message = (name: string, fields: unknown = Testing.objectExpr([])) => ({
  key: name,
  value: fields,
})

const defineMessageUnion = (
  ...cases: ReadonlyArray<ReturnType<typeof message>>
) => Testing.callExpr('defineMessageUnion', [Testing.objectExpr(cases)])

const runRule = (node: unknown) =>
  Testing.runRuleMulti(gotWrapperCarriesOnlyRouting, [
    [
      'Program',
      Testing.program([
        Testing.importDeclWithSpecifiers('foldkit/message', [
          Testing.importSpecifier('defineMessageUnion'),
        ]),
      ]),
    ],
    ['CallExpression', node],
  ])

describe('got-wrapper-carries-only-routing', () => {
  it('flags an extra field on a Got wrapper', () => {
    const result = runRule(
      defineMessageUnion(
        message(
          'GotChatMessage',
          Testing.objectExpr([{ key: 'message' }, { key: 'thought' }]),
        ),
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
    const result = runRule(
      defineMessageUnion(message('GotChatMessage', fields)),
    )

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('payload')
  })

  it('flags exactly the extra field on a Got tag without the Message suffix', () => {
    const result = runRule(
      defineMessageUnion(
        message('GotChatUpdates', Testing.objectExpr([{ key: 'thought' }])),
      ),
    )

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('thought')
  })

  it('flags each extra field separately', () => {
    const result = runRule(
      defineMessageUnion(
        message(
          'GotChatMessage',
          Testing.objectExpr([
            { key: 'message' },
            { key: 'alpha' },
            { key: 'beta' },
          ]),
        ),
      ),
    )

    expect(result).toHaveLength(2)
    expect(result[0]?.diagnostic.message).toContain('alpha')
    expect(result[1]?.diagnostic.message).toContain('beta')
  })

  it('flags a key whose Id suffix is not capitalized exactly', () => {
    const result = runRule(
      defineMessageUnion(
        message(
          'GotChatMessage',
          Testing.objectExpr([{ key: 'message' }, { key: 'sessionID' }]),
        ),
      ),
    )

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('sessionID')
  })

  it('allows the canonical message-only wrapper', () => {
    const result = runRule(
      defineMessageUnion(
        message('GotChatMessage', Testing.objectExpr([{ key: 'message' }])),
      ),
    )

    expect(result).toHaveLength(0)
  })

  it('allows id and Id-suffixed routing fields', () => {
    const result = runRule(
      defineMessageUnion(
        message(
          'GotPiRuntimeModelComboboxMessage',
          Testing.objectExpr([
            { key: 'message' },
            { key: 'id' },
            { key: 'sessionId' },
          ]),
        ),
      ),
    )

    expect(result).toHaveLength(0)
  })

  it('ignores a wrapper without a fields argument', () => {
    const result = runRule(defineMessageUnion(message('GotChatMessage')))

    expect(result).toHaveLength(0)
  })

  it('ignores a fields object missing the message property', () => {
    const result = runRule(
      defineMessageUnion(
        message('GotChatMessage', Testing.objectExpr([{ key: 'id' }])),
      ),
    )

    expect(result).toHaveLength(0)
  })

  it('allows a Got tag without the Message suffix when the fields are clean', () => {
    const result = runRule(
      defineMessageUnion(
        message('GotChatUpdates', Testing.objectExpr([{ key: 'message' }])),
      ),
    )

    expect(result).toHaveLength(0)
  })

  it('ignores a non-object fields argument', () => {
    const result = runRule(
      defineMessageUnion(message('GotChatMessage', Testing.id('Fields'))),
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
    const result = runRule(
      defineMessageUnion(message('GotChatMessage', fields)),
    )

    expect(result).toHaveLength(0)
  })

  it('ignores tags that do not match the Got wrapper pattern', () => {
    const result = runRule(
      defineMessageUnion(
        message('GotoSettings', Testing.objectExpr([{ key: 'thought' }])),
      ),
    )

    expect(result).toHaveLength(0)
  })

  it('ignores member calls named defineMessageUnion', () => {
    const result = runRule(
      Testing.callOfMember('Foo', 'defineMessageUnion', [
        Testing.objectExpr([
          message('GotChatMessage', Testing.objectExpr([{ key: 'thought' }])),
        ]),
      ]),
    )

    expect(result).toHaveLength(0)
  })
})
