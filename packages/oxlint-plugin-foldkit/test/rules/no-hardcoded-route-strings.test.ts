import * as Testing from 'effect-oxlint/testing'
import { describe, expect, it } from 'vitest'

import { noHardcodedRouteStrings } from '../../src/rules/no-hardcoded-route-strings.ts'

const templateLiteral = (cookedHead: string | null) => ({
  type: 'TemplateLiteral',
  quasis: [
    {
      type: 'TemplateElement',
      value: { raw: cookedHead ?? '', cooked: cookedHead },
      tail: false,
    },
  ],
  expressions: [Testing.id('id')],
})

describe('no-hardcoded-route-strings', () => {
  it.each(['Href', 'pushUrl', 'replaceUrl'])(
    'flags a hardcoded path literal in %s',
    functionName => {
      const result = Testing.runRule(
        noHardcodedRouteStrings,
        'CallExpression',
        Testing.callExpr(functionName, [Testing.strLiteral('/path')]),
      )

      expect(result).toHaveLength(1)
      expect(result[0]?.diagnostic.message).toContain(functionName)
      expect(result[0]?.diagnostic.message).toContain('/path')
    },
  )

  it.each(['pushUrl', 'replaceUrl'])(
    'flags an absolute URL in internal navigation call %s',
    functionName => {
      const result = Testing.runRule(
        noHardcodedRouteStrings,
        'CallExpression',
        Testing.callExpr(functionName, [
          Testing.strLiteral('https://example.com'),
        ]),
      )

      expect(result).toHaveLength(1)
      expect(result[0]?.diagnostic.message).toContain(functionName)
      expect(result[0]?.diagnostic.message).toContain('https://example.com')
    },
  )

  it('flags an http URL in internal navigation', () => {
    const result = Testing.runRule(
      noHardcodedRouteStrings,
      'CallExpression',
      Testing.callExpr('pushUrl', [Testing.strLiteral('http://example.com')]),
    )

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('http://example.com')
  })

  it('allows an absolute URL in an Href', () => {
    const result = Testing.runRule(
      noHardcodedRouteStrings,
      'CallExpression',
      Testing.callExpr('Href', [Testing.strLiteral('https://example.com')]),
    )

    expect(result).toHaveLength(0)
  })

  it.each(['load', 'openUrl'])(
    'ignores %s entirely, since it targets server endpoints and new tabs',
    functionName => {
      const result = Testing.runRule(
        noHardcodedRouteStrings,
        'CallExpression',
        Testing.callExpr(functionName, [Testing.strLiteral('/path')]),
      )

      expect(result).toHaveLength(0)
    },
  )

  it('flags a hardcoded route template', () => {
    const result = Testing.runRule(
      noHardcodedRouteStrings,
      'CallExpression',
      Testing.callExpr('Href', [templateLiteral('/users/')]),
    )

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('template')
    expect(result[0]?.diagnostic.message).toContain('/users/...')
  })

  it('flags a protocol-relative URL as a path string', () => {
    const result = Testing.runRule(
      noHardcodedRouteStrings,
      'CallExpression',
      Testing.callExpr('Href', [Testing.strLiteral('//example.com')]),
    )

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('//example.com')
  })

  it('flags a member call whose final property is a routing function', () => {
    const hrefResult = Testing.runRule(
      noHardcodedRouteStrings,
      'CallExpression',
      Testing.callOfMember('h', 'Href', [Testing.strLiteral('/path')]),
    )
    const pushUrlResult = Testing.runRule(
      noHardcodedRouteStrings,
      'CallExpression',
      Testing.callOfMember('Navigation', 'pushUrl', [
        Testing.strLiteral('/docs'),
      ]),
    )

    expect(hrefResult).toHaveLength(1)
    expect(hrefResult[0]?.diagnostic.message).toContain('Href')
    expect(pushUrlResult).toHaveLength(1)
    expect(pushUrlResult[0]?.diagnostic.message).toContain('pushUrl')
  })

  it('allows the Router printer form', () => {
    const result = Testing.runRule(
      noHardcodedRouteStrings,
      'CallExpression',
      Testing.callExpr('Href', [Testing.callExpr('homeRouter')]),
    )

    expect(result).toHaveLength(0)
  })

  it('allows an identifier argument', () => {
    const result = Testing.runRule(
      noHardcodedRouteStrings,
      'CallExpression',
      Testing.callExpr('Href', [Testing.id('someVar')]),
    )

    expect(result).toHaveLength(0)
  })

  it('allows member calls whose property is not a routing function', () => {
    const result = Testing.runRule(
      noHardcodedRouteStrings,
      'CallExpression',
      Testing.callOfMember('console', 'log', [Testing.strLiteral('/path')]),
    )

    expect(result).toHaveLength(0)
  })

  it('allows computed member callees', () => {
    const result = Testing.runRule(noHardcodedRouteStrings, 'CallExpression', {
      type: 'CallExpression',
      callee: Testing.computedMemberExpr('h', 'Href'),
      arguments: [Testing.strLiteral('/path')],
    })

    expect(result).toHaveLength(0)
  })

  it('allows identifiers outside the routing-function set', () => {
    const result = Testing.runRule(
      noHardcodedRouteStrings,
      'CallExpression',
      Testing.callExpr('foo', [Testing.strLiteral('/path')]),
    )

    expect(result).toHaveLength(0)
  })

  it.each(['home', './docs', '#top', 'mailto:hello@example.com'])(
    'allows the non-route string %s',
    value => {
      const result = Testing.runRule(
        noHardcodedRouteStrings,
        'CallExpression',
        Testing.callExpr('Href', [Testing.strLiteral(value)]),
      )

      expect(result).toHaveLength(0)
    },
  )

  it('allows a template whose head is not a route prefix', () => {
    const result = Testing.runRule(
      noHardcodedRouteStrings,
      'CallExpression',
      Testing.callExpr('Href', [templateLiteral('api-')]),
    )

    expect(result).toHaveLength(0)
  })

  it('allows a template whose head has no cooked value', () => {
    const result = Testing.runRule(
      noHardcodedRouteStrings,
      'CallExpression',
      Testing.callExpr('Href', [templateLiteral(null)]),
    )

    expect(result).toHaveLength(0)
  })

  it('allows calls with no arguments', () => {
    const result = Testing.runRule(
      noHardcodedRouteStrings,
      'CallExpression',
      Testing.callExpr('Href'),
    )

    expect(result).toHaveLength(0)
  })

  it('ignores route strings after the first argument', () => {
    const result = Testing.runRule(
      noHardcodedRouteStrings,
      'CallExpression',
      Testing.callExpr('pushUrl', [
        Testing.id('someVar'),
        Testing.strLiteral('/path'),
      ]),
    )

    expect(result).toHaveLength(0)
  })
})
