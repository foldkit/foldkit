import * as Testing from 'effect-oxlint/testing'
import { describe, expect, it } from 'vitest'

import { noRawDomEventAttributes } from '../../src/rules/no-raw-dom-event-attributes.ts'

const callExpression = (
  callee: unknown,
  callArguments: ReadonlyArray<unknown> = [],
) => ({
  type: 'CallExpression',
  callee,
  arguments: callArguments,
})

const templateLiteral = (
  cooked: string,
  expressions: ReadonlyArray<unknown> = [],
) => ({
  type: 'TemplateLiteral',
  quasis: [
    { type: 'TemplateElement', value: { raw: cooked, cooked }, tail: true },
  ],
  expressions,
})

const runRule = (node: unknown, filename?: string) =>
  Testing.runRule(
    noRawDomEventAttributes,
    'CallExpression',
    node,
    filename === undefined ? undefined : { filename },
  )

describe('no-raw-dom-event-attributes', () => {
  it('flags a bare Attribute with a lowercase event name', () => {
    const attributeCall = Testing.callExpr('Attribute', [
      Testing.strLiteral('onclick'),
    ])

    const result = runRule(attributeCall)

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('onclick')
    expect(result[0]?.diagnostic.node).toBe(attributeCall)
  })

  it('flags a member-form Attribute', () => {
    const result = runRule(
      Testing.callOfMember('h', 'Attribute', [
        Testing.strLiteral('onmouseover'),
      ]),
    )

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('onmouseover')
  })

  it('flags a static template literal event name', () => {
    const result = runRule(
      Testing.callExpr('Attribute', [templateLiteral('onkeyup')]),
    )

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('onkeyup')
  })

  it('flags an object-form Prop with a mixed-case event key', () => {
    const result = runRule(
      Testing.callExpr('Prop', [
        Testing.objectExpr([
          { key: 'key', value: Testing.strLiteral('onInput') },
          { key: 'value', value: Testing.id('handler') },
        ]),
      ]),
    )

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('onInput')
  })

  it('flags a member-form object Prop with an uppercase event key', () => {
    const result = runRule(
      Testing.callOfMember('Html', 'Prop', [
        Testing.objectExpr([
          { key: 'key', value: Testing.strLiteral('ONCLICK') },
          { key: 'value', value: Testing.id('x') },
        ]),
      ]),
    )

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('ONCLICK')
  })

  it('flags an object Prop with a string literal key property', () => {
    const result = runRule(
      Testing.callExpr('Prop', [
        Testing.objectExprLiteralKeys([
          { key: 'key', value: Testing.strLiteral('onclick') },
        ]),
      ]),
    )

    expect(result).toHaveLength(1)
  })

  it('flags raw event attributes inside crash-view files too', () => {
    const result = runRule(
      Testing.callExpr('Attribute', [Testing.strLiteral('onclick')]),
      '/repo/apps/ui/src/crash-view.ts',
    )

    expect(result).toHaveLength(1)
  })

  it('allows non-event attributes', () => {
    const classAttribute = runRule(
      Testing.callExpr('Attribute', [Testing.strLiteral('class')]),
    )
    const dataAttribute = runRule(
      Testing.callExpr('Attribute', [Testing.strLiteral('data-testid')]),
    )

    expect(classAttribute).toHaveLength(0)
    expect(dataAttribute).toHaveLength(0)
  })

  it('allows dynamic attribute names', () => {
    const identifierName = runRule(
      Testing.callExpr('Attribute', [Testing.id('someName')]),
    )
    const dynamicTemplateName = runRule(
      Testing.callExpr('Attribute', [
        templateLiteral('on', [Testing.id('eventName')]),
      ]),
    )

    expect(identifierName).toHaveLength(0)
    expect(dynamicTemplateName).toHaveLength(0)
  })

  it('allows names failing the event pattern despite the on prefix', () => {
    const bareOn = runRule(
      Testing.callExpr('Attribute', [Testing.strLiteral('on')]),
    )
    const digitName = runRule(
      Testing.callExpr('Attribute', [Testing.strLiteral('on2x')]),
    )

    expect(bareOn).toHaveLength(0)
    expect(digitName).toHaveLength(0)
  })

  it('allows on-prefixed names that are not DOM event handlers', () => {
    const onlineAttribute = runRule(
      Testing.callExpr('Attribute', [Testing.strLiteral('online')]),
    )
    const onLineProp = runRule(
      Testing.callExpr('Prop', [
        Testing.objectExpr([
          { key: 'key', value: Testing.strLiteral('onLine') },
          { key: 'value', value: Testing.boolLiteral(true) },
        ]),
      ]),
    )

    expect(onlineAttribute).toHaveLength(0)
    expect(onLineProp).toHaveLength(0)
  })

  it('allows positional Prop calls', () => {
    const barePositional = runRule(
      Testing.callExpr('Prop', [Testing.strLiteral('onInput')]),
    )
    const memberPositional = runRule(
      Testing.callOfMember('h', 'Prop', [Testing.strLiteral('ONCLICK')]),
    )

    expect(barePositional).toHaveLength(0)
    expect(memberPositional).toHaveLength(0)
  })

  it('allows object Props without a key property', () => {
    const result = runRule(
      Testing.callExpr('Prop', [
        Testing.objectExpr([
          { key: 'name', value: Testing.strLiteral('onclick') },
        ]),
      ]),
    )

    expect(result).toHaveLength(0)
  })

  it('allows object Props with a dynamic key value', () => {
    const result = runRule(
      Testing.callExpr('Prop', [
        Testing.objectExpr([
          { key: 'key', value: Testing.id('eventName') },
          { key: 'value', value: Testing.id('value') },
        ]),
      ]),
    )

    expect(result).toHaveLength(0)
  })

  it('allows object Props with a non-event key', () => {
    const result = runRule(
      Testing.callExpr('Prop', [
        Testing.objectExpr([
          { key: 'key', value: Testing.strLiteral('checked') },
          { key: 'value', value: Testing.boolLiteral(true) },
        ]),
      ]),
    )

    expect(result).toHaveLength(0)
  })

  it('allows object Props whose key property is computed', () => {
    const result = runRule(
      Testing.callExpr('Prop', [
        {
          type: 'ObjectExpression',
          properties: [
            {
              type: 'Property',
              key: Testing.strLiteral('key'),
              value: Testing.strLiteral('onclick'),
              computed: true,
            },
          ],
        },
      ]),
    )

    expect(result).toHaveLength(0)
  })

  it('allows calls with no arguments', () => {
    const result = runRule(Testing.callExpr('Attribute'))

    expect(result).toHaveLength(0)
  })

  it('ignores computed callee access', () => {
    const result = runRule(
      callExpression(Testing.computedMemberExpr('h', 'Attribute'), [
        Testing.strLiteral('onclick'),
      ]),
    )

    expect(result).toHaveLength(0)
  })
})
