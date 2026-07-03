import * as Testing from 'effect-oxlint/testing'
import { describe, expect, it } from 'vitest'

import rule from '../../src/rules/no-raw-dom-event-attributes.ts'

const templateLiteral = (value: string) => ({
  type: 'TemplateLiteral',
  expressions: [],
  quasis: [
    {
      type: 'TemplateElement',
      value: { cooked: value, raw: value },
      tail: true,
    },
  ],
})

const dynamicTemplateLiteral = (head: string) => ({
  type: 'TemplateLiteral',
  expressions: [Testing.id('eventName')],
  quasis: [
    {
      type: 'TemplateElement',
      value: { cooked: head, raw: head },
      tail: false,
    },
    {
      type: 'TemplateElement',
      value: { cooked: '', raw: '' },
      tail: true,
    },
  ],
})

const memberCall = (
  object: string,
  property: string,
  args: ReadonlyArray<unknown>,
) => ({
  type: 'CallExpression',
  callee: Testing.memberExpr(object, property),
  arguments: Array.from(args),
})

const typeArguments = (params: ReadonlyArray<unknown>) => ({
  type: 'TSTypeParameterInstantiation',
  params: Array.from(params),
})

const htmlCall = (typeArgs?: unknown) => ({
  type: 'CallExpression',
  callee: Testing.id('html'),
  typeArguments: typeArgs,
  arguments: [],
})

const neverType = { type: 'TSNeverKeyword' }
const stringType = { type: 'TSStringKeyword' }

const sourceFile = { filename: '/repo/apps/ui/src/view.ts' }
const crashViewFile = { filename: '/repo/apps/ui/src/crash-view.ts' }

describe('no-raw-dom-event-attributes', () => {
  it('flags raw event Attribute calls outside crash-view.ts', () => {
    const result = Testing.runRule(
      rule,
      'CallExpression',
      Testing.callExpr('Attribute', [Testing.strLiteral('onclick')]),
      sourceFile,
    )
    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('onclick')
  })

  it('flags raw event Prop calls outside crash-view.ts', () => {
    const result = Testing.runRule(
      rule,
      'CallExpression',
      Testing.callExpr('Prop', [Testing.strLiteral('onInput')]),
      sourceFile,
    )
    expect(result).toHaveLength(1)
  })

  it('flags member-form h.Attribute and h.Prop calls', () => {
    const attribute = memberCall('h', 'Attribute', [
      Testing.strLiteral('onmouseover'),
    ])
    const prop = memberCall('h', 'Prop', [Testing.strLiteral('ONCLICK')])
    expect(
      Testing.runRule(rule, 'CallExpression', attribute, sourceFile),
    ).toHaveLength(1)
    expect(
      Testing.runRule(rule, 'CallExpression', prop, sourceFile),
    ).toHaveLength(1)
  })

  it('flags static template-literal event names', () => {
    const result = Testing.runRule(
      rule,
      'CallExpression',
      Testing.callExpr('Attribute', [templateLiteral('onkeyup')]),
      sourceFile,
    )
    expect(result).toHaveLength(1)
  })

  it('does not flag non-event attributes or dynamic event-name templates', () => {
    const classAttr = Testing.callExpr('Attribute', [
      Testing.strLiteral('class'),
    ])
    const dynamic = Testing.callExpr('Attribute', [
      dynamicTemplateLiteral('on'),
    ])
    expect(
      Testing.runRule(rule, 'CallExpression', classAttr, sourceFile),
    ).toHaveLength(0)
    expect(
      Testing.runRule(rule, 'CallExpression', dynamic, sourceFile),
    ).toHaveLength(0)
  })

  it('allows raw event attributes in crash-view.ts', () => {
    const result = Testing.runRule(
      rule,
      'CallExpression',
      Testing.callExpr('Attribute', [Testing.strLiteral('onclick')]),
      crashViewFile,
    )
    expect(result).toHaveLength(0)
  })

  it('requires crash-view.ts html calls to use a never Message type', () => {
    expect(
      Testing.runRule(rule, 'CallExpression', htmlCall(), crashViewFile),
    ).toHaveLength(1)
    expect(
      Testing.runRule(
        rule,
        'CallExpression',
        htmlCall(typeArguments([stringType])),
        crashViewFile,
      ),
    ).toHaveLength(1)
  })

  it('allows crash-view.ts html<never>() calls', () => {
    const result = Testing.runRule(
      rule,
      'CallExpression',
      htmlCall(typeArguments([neverType])),
      crashViewFile,
    )
    expect(result).toHaveLength(0)
  })

  it('flags crash-view.ts html calls with extra type parameters', () => {
    const result = Testing.runRule(
      rule,
      'CallExpression',
      htmlCall(typeArguments([neverType, stringType])),
      crashViewFile,
    )
    expect(result).toHaveLength(1)
  })
})
