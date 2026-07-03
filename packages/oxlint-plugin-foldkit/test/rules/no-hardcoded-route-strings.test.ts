import * as Testing from 'effect-oxlint/testing'
import { describe, expect, it } from 'vitest'

import rule from '../../src/rules/no-hardcoded-route-strings.ts'

const tplLit = (head: string): unknown => ({
  type: 'TemplateLiteral',
  quasis: [{ type: 'TemplateElement', value: { cooked: head, raw: head } }],
  expressions: [],
})

describe('no-hardcoded-route-strings', () => {
  // ── literal-string forms ────────────────────────────────
  it.each(['Href', 'navigateInternal', 'loadExternalUrl'])(
    'flags `%s("/path")`',
    fn => {
      const result = Testing.runRule(
        rule,
        'CallExpression',
        Testing.callExpr(fn, [Testing.strLiteral('/path')]),
      )
      expect(result).toHaveLength(1)
      expect(result[0]?.diagnostic.message).toContain(fn)
      expect(result[0]?.diagnostic.message).toContain('/path')
    },
  )

  it('flags `Href("https://example.com")`', () => {
    const result = Testing.runRule(
      rule,
      'CallExpression',
      Testing.callExpr('Href', [Testing.strLiteral('https://example.com')]),
    )
    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('https://example.com')
  })

  it('flags `Href("http://example.com")`', () => {
    const result = Testing.runRule(
      rule,
      'CallExpression',
      Testing.callExpr('Href', [Testing.strLiteral('http://example.com')]),
    )
    expect(result).toHaveLength(1)
  })

  // ── template-literal forms ──────────────────────────────
  it('flags `Href(`/users/${id}`)` (template-literal route)', () => {
    const result = Testing.runRule(
      rule,
      'CallExpression',
      Testing.callExpr('Href', [tplLit('/users/')]),
    )
    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('template')
  })

  // ── allowed: bidirectional router calls ─────────────────
  it('does not flag `Href(homeRouter())`', () => {
    const result = Testing.runRule(
      rule,
      'CallExpression',
      Testing.callExpr('Href', [Testing.callExpr('homeRouter', [])]),
    )
    expect(result).toHaveLength(0)
  })

  it('does not flag `Href(someVar)` (non-literal arg)', () => {
    const result = Testing.runRule(
      rule,
      'CallExpression',
      Testing.callExpr('Href', [Testing.id('someVar')]),
    )
    expect(result).toHaveLength(0)
  })

  // ── non-routing functions ───────────────────────────────
  it('does not flag `console.log("/path")` (not a routing function)', () => {
    const result = Testing.runRule(
      rule,
      'CallExpression',
      Testing.callOfMember('console', 'log', [Testing.strLiteral('/path')]),
    )
    expect(result).toHaveLength(0)
  })

  it('does not flag `foo("/path")` (not a routing function)', () => {
    const result = Testing.runRule(
      rule,
      'CallExpression',
      Testing.callExpr('foo', [Testing.strLiteral('/path')]),
    )
    expect(result).toHaveLength(0)
  })

  // ── strings that don't look like routes ─────────────────
  it('does not flag `Href("home")` (not starting with `/` or `http(s)://`)', () => {
    const result = Testing.runRule(
      rule,
      'CallExpression',
      Testing.callExpr('Href', [Testing.strLiteral('home')]),
    )
    expect(result).toHaveLength(0)
  })

  it('does not flag `Href(`api-${endpoint}`)` (template not starting with route prefix)', () => {
    const result = Testing.runRule(
      rule,
      'CallExpression',
      Testing.callExpr('Href', [tplLit('api-')]),
    )
    expect(result).toHaveLength(0)
  })
})
