import * as Testing from 'effect-oxlint/testing'
import { describe, expect, it } from 'vitest'

import {
  commandBindingMatchesName,
  gotPrefixRequiresSubmodelPayload,
  gotSubmodelMessageName,
  messageBindingMatchesTag,
  noEmptyObjectTaggedCall,
  noNoopMessage,
  preferCallableMessageConstructor,
} from '../src/index.ts'

const m = (tag: string, fields?: unknown) =>
  Testing.callExpr(
    'm',
    fields === undefined
      ? [Testing.strLiteral(tag)]
      : [Testing.strLiteral(tag), fields],
  )

const variableDeclarator = (name: string, init: unknown) => ({
  type: 'VariableDeclarator',
  id: Testing.id(name),
  init,
})

const messageTypeAnnotation = {
  type: 'TSTypeAnnotation',
  typeAnnotation: {
    type: 'TSTypeReference',
    typeName: Testing.id('Message'),
  },
}

const typedMessageVariableDeclarator = (name: string, init: unknown) => ({
  type: 'VariableDeclarator',
  id: {
    ...Testing.id(name),
    typeAnnotation: messageTypeAnnotation,
  },
  init,
})

const commandDefineApplication = (name: string) => {
  const defineCall = Testing.callOfMember('Command', 'define', [
    Testing.strLiteral(name),
  ])
  return {
    type: 'CallExpression',
    callee: defineCall,
    arguments: [Testing.id('effectImplementation')],
  }
}

const tsAsExpression = (expression: unknown) => ({
  type: 'TSAsExpression',
  expression,
})

describe('@foldkit/oxlint-plugin', () => {
  it('flags generic NoOp Messages', () => {
    const result = Testing.runRule(noNoopMessage, 'CallExpression', m('NoOp'))

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('avoid generic NoOp')
  })

  it('allows specific Message names', () => {
    const result = Testing.runRule(
      noNoopMessage,
      'CallExpression',
      m('ClickedSave'),
    )

    expect(result).toHaveLength(0)
  })

  it('flags Message bindings that do not match their m() tag', () => {
    const result = Testing.runRule(
      messageBindingMatchesTag,
      'VariableDeclarator',
      variableDeclarator('ClickedSave', m('ClickedSubmit')),
    )

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('does not match')
  })

  it('allows Message bindings that match their m() tag', () => {
    const result = Testing.runRule(
      messageBindingMatchesTag,
      'VariableDeclarator',
      variableDeclarator('ClickedSave', m('ClickedSave')),
    )

    expect(result).toHaveLength(0)
  })

  it('requires Message payload wrappers to use Got*Message names', () => {
    const result = Testing.runRule(
      gotSubmodelMessageName,
      'CallExpression',
      m('ReceivedChild', Testing.objectExpr([{ key: 'message' }])),
    )

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('Got*Message')
  })

  it('allows Got*Message wrappers around Submodel Messages', () => {
    const result = Testing.runRule(
      gotSubmodelMessageName,
      'CallExpression',
      m(
        'GotChildMessage',
        Testing.objectExpr([
          { key: 'message', value: Testing.memberExpr('Child', 'Message') },
        ]),
      ),
    )

    expect(result).toHaveLength(0)
  })

  it('allows Got*Message wrappers whose Message schema is indirect', () => {
    const unknownPayload = Testing.runRule(
      gotPrefixRequiresSubmodelPayload,
      'CallExpression',
      m(
        'GotInspectorTabsMessage',
        Testing.objectExpr([
          { key: 'message', value: Testing.memberExpr('S', 'Unknown') },
        ]),
      ),
    )
    const suspendedPayload = Testing.runRule(
      gotPrefixRequiresSubmodelPayload,
      'CallExpression',
      m(
        'GotSliderMessage',
        Testing.objectExpr([
          {
            key: 'message',
            value: Testing.callOfMember('S', 'suspend', [
              Testing.arrowFn(Testing.memberExpr('Slider', 'Message')),
            ]),
          },
        ]),
      ),
    )

    expect(unknownPayload).toHaveLength(0)
    expect(suspendedPayload).toHaveLength(0)
  })

  it('reserves Got-prefixed Messages for Submodel wrappers', () => {
    const result = Testing.runRule(
      gotPrefixRequiresSubmodelPayload,
      'CallExpression',
      m('GotWeather', Testing.objectExpr([{ key: 'temperature' }])),
    )

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain(
      'reserved for Submodel wrappers',
    )
  })

  it('requires Got-prefixed Submodel wrappers to carry a Message payload', () => {
    const result = Testing.runRule(
      gotPrefixRequiresSubmodelPayload,
      'CallExpression',
      m('GotChildMessage', Testing.objectExpr([{ key: 'id' }])),
    )

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain(
      '{ message: Child.Message }',
    )
  })

  it('flags object literal casts that look like Message construction', () => {
    const result = Testing.runRule(
      preferCallableMessageConstructor,
      'TSAsExpression',
      tsAsExpression(
        Testing.objectExpr([
          { key: '_tag', value: Testing.strLiteral('ClickedSave') },
        ]),
      ),
    )

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('callable Schema')
  })

  it('flags typed object literals that look like Message construction', () => {
    const result = Testing.runRule(
      preferCallableMessageConstructor,
      'VariableDeclarator',
      typedMessageVariableDeclarator(
        'badMessage',
        Testing.objectExpr([
          { key: '_tag', value: Testing.strLiteral('ClickedSave') },
        ]),
      ),
    )

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('callable Schema')
  })

  it('allows typed Messages constructed with callable constructors', () => {
    const result = Testing.runRule(
      preferCallableMessageConstructor,
      'VariableDeclarator',
      typedMessageVariableDeclarator(
        'message',
        Testing.callExpr('ClickedSave'),
      ),
    )

    expect(result).toHaveLength(0)
  })

  it('flags command bindings that do not match Command.define names', () => {
    const result = Testing.runRule(
      commandBindingMatchesName,
      'VariableDeclarator',
      variableDeclarator('SaveUser', commandDefineApplication('FetchUser')),
    )

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('does not match')
  })

  it('allows Command bindings that match Command.define names', () => {
    const result = Testing.runRule(
      commandBindingMatchesName,
      'VariableDeclarator',
      variableDeclarator('FetchUser', commandDefineApplication('FetchUser')),
    )

    expect(result).toHaveLength(0)
  })

  it('flags empty object calls to tagged constructors', () => {
    const result = Testing.runRule(
      noEmptyObjectTaggedCall,
      'CallExpression',
      Testing.callExpr('ClickedSave', [Testing.objectExpr([])]),
    )

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('ClickedSave()')
  })

  it('does not flag member calls that happen to receive empty objects', () => {
    const result = Testing.runRule(
      noEmptyObjectTaggedCall,
      'CallExpression',
      Testing.callOfMember('S', 'Struct', [Testing.objectExpr([])]),
    )

    expect(result).toHaveLength(0)
  })
})
