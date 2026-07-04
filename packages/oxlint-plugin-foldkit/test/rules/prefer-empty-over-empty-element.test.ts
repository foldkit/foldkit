import * as Testing from 'effect-oxlint/testing'
import { describe, expect, it } from 'vitest'

import { preferEmptyOverEmptyElement } from '../../src/rules/prefer-empty-over-empty-element.ts'

const arrayExpression = (elements: ReadonlyArray<unknown> = []) => ({
  type: 'ArrayExpression',
  elements,
})

const emptyElementCall = (elementName: string) =>
  Testing.callExpr(elementName, [arrayExpression(), arrayExpression()])

describe('prefer-empty-over-empty-element', () => {
  it.each(['span', 'div', 'p', 'section', 'article'])(
    'flags an empty %s call and recommends empty',
    elementName => {
      const result = Testing.runRule(
        preferEmptyOverEmptyElement,
        'CallExpression',
        emptyElementCall(elementName),
      )

      expect(result).toHaveLength(1)
      expect(result[0]?.diagnostic.message).toContain(
        `\`${elementName}([], [])\``,
      )
      expect(result[0]?.diagnostic.message).toContain('`empty`')
    },
  )

  it('flags an empty member-style call and recommends the member empty', () => {
    const result = Testing.runRule(
      preferEmptyOverEmptyElement,
      'CallExpression',
      Testing.callOfMember('h', 'span', [arrayExpression(), arrayExpression()]),
    )

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('`h.span([], [])`')
    expect(result[0]?.diagnostic.message).toContain('`h.empty`')
  })

  it('recommends the actual receiver name, not a hardcoded h', () => {
    const result = Testing.runRule(
      preferEmptyOverEmptyElement,
      'CallExpression',
      Testing.callOfMember('myHtml', 'div', [
        arrayExpression(),
        arrayExpression(),
      ]),
    )

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('`myHtml.div([], [])`')
    expect(result[0]?.diagnostic.message).toContain('`myHtml.empty`')
  })

  it('allows non-empty children', () => {
    const result = Testing.runRule(
      preferEmptyOverEmptyElement,
      'CallExpression',
      Testing.callExpr('span', [
        arrayExpression(),
        arrayExpression([Testing.callExpr('text', [Testing.strLiteral('hi')])]),
      ]),
    )

    expect(result).toHaveLength(0)
  })

  it('allows non-empty attributes', () => {
    const result = Testing.runRule(
      preferEmptyOverEmptyElement,
      'CallExpression',
      Testing.callExpr('span', [
        arrayExpression([Testing.callExpr('Class', [Testing.strLiteral('a')])]),
        arrayExpression(),
      ]),
    )

    expect(result).toHaveLength(0)
  })

  it('allows a single-argument call', () => {
    const result = Testing.runRule(
      preferEmptyOverEmptyElement,
      'CallExpression',
      Testing.callExpr('span', [arrayExpression()]),
    )

    expect(result).toHaveLength(0)
  })

  it('allows a call with more than two arguments', () => {
    const result = Testing.runRule(
      preferEmptyOverEmptyElement,
      'CallExpression',
      Testing.callExpr('span', [
        arrayExpression(),
        arrayExpression(),
        Testing.id('extra'),
      ]),
    )

    expect(result).toHaveLength(0)
  })

  it('allows arguments that are not literal empty arrays', () => {
    const result = Testing.runRule(
      preferEmptyOverEmptyElement,
      'CallExpression',
      Testing.callExpr('span', [Testing.id('attributes'), arrayExpression()]),
    )

    expect(result).toHaveLength(0)
  })

  it('allows elements outside the empty-able set', () => {
    const result = Testing.runRule(
      preferEmptyOverEmptyElement,
      'CallExpression',
      Testing.callExpr('button', [arrayExpression(), arrayExpression()]),
    )

    expect(result).toHaveLength(0)
  })

  it('allows identifiers that are not hyperscript helpers', () => {
    const result = Testing.runRule(
      preferEmptyOverEmptyElement,
      'CallExpression',
      Testing.callExpr('Foo', [arrayExpression(), arrayExpression()]),
    )

    expect(result).toHaveLength(0)
  })

  it('allows member callees whose property is not a known element', () => {
    const result = Testing.runRule(
      preferEmptyOverEmptyElement,
      'CallExpression',
      Testing.callOfMember('h', 'button', [
        arrayExpression(),
        arrayExpression(),
      ]),
    )

    expect(result).toHaveLength(0)
  })

  it('allows computed member access', () => {
    const result = Testing.runRule(
      preferEmptyOverEmptyElement,
      'CallExpression',
      {
        type: 'CallExpression',
        callee: Testing.computedMemberExpr('h', 'span'),
        arguments: [arrayExpression(), arrayExpression()],
      },
    )

    expect(result).toHaveLength(0)
  })

  it('allows member callees whose object is not a plain identifier', () => {
    const result = Testing.runRule(
      preferEmptyOverEmptyElement,
      'CallExpression',
      {
        type: 'CallExpression',
        callee: Testing.chainedMemberExpr('a', 'b', 'span'),
        arguments: [arrayExpression(), arrayExpression()],
      },
    )

    expect(result).toHaveLength(0)
  })
})
