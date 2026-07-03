import * as Testing from 'effect-oxlint/testing'
import { describe, expect, it } from 'vitest'

import rule from '../../src/rules/got-wrapper-carries-only-routing.ts'

const prop = (key: string, value: unknown = Testing.id('Value')) => ({
  type: 'Property',
  kind: 'init',
  computed: false,
  method: false,
  shorthand: false,
  key: Testing.id(key),
  value,
})

const stringKeyProp = (key: string, value: unknown = Testing.id('Value')) => ({
  type: 'Property',
  kind: 'init',
  computed: false,
  method: false,
  shorthand: false,
  key: Testing.strLiteral(key),
  value,
})

const computedProp = (key: string, value: unknown = Testing.id('Value')) => ({
  type: 'Property',
  kind: 'init',
  computed: true,
  method: false,
  shorthand: false,
  key: Testing.id(key),
  value,
})

const spread = (name: string) => ({
  type: 'SpreadElement',
  argument: Testing.id(name),
})

const objectExpr = (properties: ReadonlyArray<unknown>) => ({
  type: 'ObjectExpression',
  properties: Array.from(properties),
})

const m = (tag: string, fields?: unknown) =>
  Testing.callExpr(
    'm',
    fields === undefined
      ? [Testing.strLiteral(tag)]
      : [Testing.strLiteral(tag), fields],
  )

describe('got-wrapper-carries-only-routing', () => {
  it('allows canonical Got wrappers with only `message`', () => {
    const result = Testing.runRule(
      rule,
      'CallExpression',
      m('GotChatMessage', objectExpr([prop('message')])),
    )
    expect(result).toHaveLength(0)
  })

  it('allows `id` and `*Id` routing fields', () => {
    const result = Testing.runRule(
      rule,
      'CallExpression',
      m(
        'GotPiRuntimeModelComboboxMessage',
        objectExpr([prop('message'), prop('id'), prop('sessionId')]),
      ),
    )
    expect(result).toHaveLength(0)
  })

  it('flags Got wrapper tags that do not end with Message', () => {
    const result = Testing.runRule(
      rule,
      'CallExpression',
      m('GotChatUpdates', objectExpr([prop('message')])),
    )
    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('Got*Message')
    expect(result[0]?.diagnostic.suggest).toHaveLength(1)
  })

  it('flags missing fields argument', () => {
    const result = Testing.runRule(rule, 'CallExpression', m('GotChatMessage'))
    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('must declare fields')
  })

  it('flags object fields missing `message`', () => {
    const result = Testing.runRule(
      rule,
      'CallExpression',
      m('GotChatMessage', objectExpr([prop('id')])),
    )
    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('must include a `message`')
  })

  it('flags extra non-routing fields', () => {
    const result = Testing.runRule(
      rule,
      'CallExpression',
      m('GotChatMessage', objectExpr([prop('message'), prop('thought')])),
    )
    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('extra field `thought`')
  })

  it('flags string-literal extra field keys', () => {
    const result = Testing.runRule(
      rule,
      'CallExpression',
      m(
        'GotChatMessage',
        objectExpr([prop('message'), stringKeyProp('payload')]),
      ),
    )
    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('extra field `payload`')
  })

  it('skips non-object fields arguments', () => {
    const result = Testing.runRule(
      rule,
      'CallExpression',
      m('GotChatMessage', Testing.id('Fields')),
    )
    expect(result).toHaveLength(0)
  })

  it('skips spread and computed fields when checking extras', () => {
    const result = Testing.runRule(
      rule,
      'CallExpression',
      m(
        'GotChatMessage',
        objectExpr([
          prop('message'),
          spread('extras'),
          computedProp('dynamic'),
        ]),
      ),
    )
    expect(result).toHaveLength(0)
  })

  it('does not classify `Goto*` tags as Got wrappers', () => {
    const result = Testing.runRule(
      rule,
      'CallExpression',
      m('GotoSettings', objectExpr([prop('thought')])),
    )
    expect(result).toHaveLength(0)
  })

  it('can report name and field diagnostics on the same wrapper', () => {
    const result = Testing.runRule(
      rule,
      'CallExpression',
      m('GotChatUpdates', objectExpr([prop('thought')])),
    )
    expect(result).toHaveLength(3)
  })
})
