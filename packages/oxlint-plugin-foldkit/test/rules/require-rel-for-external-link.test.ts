import * as Testing from 'effect-oxlint/testing'
import { describe, expect, it } from 'vitest'

import { requireRelForExternalLink } from '../../src/rules/require-rel-for-external-link.ts'

const callExpression = (
  callee: unknown,
  callArguments: ReadonlyArray<unknown> = [],
) => ({
  type: 'CallExpression',
  callee,
  arguments: callArguments,
})

const arrayExpression = (elements: ReadonlyArray<unknown>) => ({
  type: 'ArrayExpression',
  elements,
})

const templateLiteral = (cooked: string) => ({
  type: 'TemplateLiteral',
  quasis: [
    { type: 'TemplateElement', value: { raw: cooked, cooked }, tail: true },
  ],
  expressions: [],
})

const targetBlank = () =>
  Testing.callExpr('Target', [Testing.strLiteral('_blank')])

const rel = (value: string) =>
  Testing.callExpr('Rel', [Testing.strLiteral(value)])

const runRule = (elements: ReadonlyArray<unknown>) =>
  Testing.runRule(
    requireRelForExternalLink,
    'ArrayExpression',
    arrayExpression(elements),
  )

describe('require-rel-for-external-link', () => {
  it('flags Target alone', () => {
    const targetElement = targetBlank()

    const result = runRule([targetElement])

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('noopener noreferrer')
    expect(result[0]?.diagnostic.node).toBe(targetElement)
  })

  it('flags Target among unrelated attributes', () => {
    const result = runRule([
      Testing.callExpr('Class', [Testing.strLiteral('link')]),
      targetBlank(),
    ])

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('noopener noreferrer')
  })

  it('flags an unprotective rel value on the Rel node', () => {
    const relElement = rel('nofollow')

    const result = runRule([targetBlank(), relElement])

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('nofollow')
    expect(result[0]?.diagnostic.message).toContain('noopener noreferrer')
    expect(result[0]?.diagnostic.node).toBe(relElement)
  })

  it('flags a member-form Target without Rel', () => {
    const result = runRule([
      Testing.callOfMember('h', 'Target', [Testing.strLiteral('_blank')]),
    ])

    expect(result).toHaveLength(1)
  })

  it('flags an unprotective static template Rel value', () => {
    const result = runRule([
      targetBlank(),
      Testing.callExpr('Rel', [templateLiteral('nofollow')]),
    ])

    expect(result).toHaveLength(1)
  })

  it('skips array holes while still flagging Target', () => {
    const result = runRule([null, targetBlank()])

    expect(result).toHaveLength(1)
  })

  it('allows the full protective pair', () => {
    const result = runRule([targetBlank(), rel('noopener noreferrer')])

    expect(result).toHaveLength(0)
  })

  it('allows a spread that may carry the protective rel', () => {
    const result = runRule([
      targetBlank(),
      { type: 'SpreadElement', argument: Testing.id('externalLinkAttributes') },
    ])

    expect(result).toHaveLength(0)
  })

  it('allows Rel first with a partial but protective value', () => {
    const result = runRule([rel('noopener'), targetBlank()])

    expect(result).toHaveLength(0)
  })

  it('allows the member-form pair', () => {
    const result = runRule([
      Testing.callOfMember('h', 'Target', [Testing.strLiteral('_blank')]),
      Testing.callOfMember('h', 'Rel', [
        Testing.strLiteral('noopener noreferrer'),
      ]),
    ])

    expect(result).toHaveLength(0)
  })

  it('allows a protective static template Rel value', () => {
    const result = runRule([
      targetBlank(),
      Testing.callExpr('Rel', [templateLiteral('noreferrer')]),
    ])

    expect(result).toHaveLength(0)
  })

  it('allows a dynamic rel value', () => {
    const result = runRule([
      targetBlank(),
      Testing.callExpr('Rel', [Testing.id('relValue')]),
    ])

    expect(result).toHaveLength(0)
  })

  it('allows a Rel call with no arguments', () => {
    const result = runRule([targetBlank(), Testing.callExpr('Rel')])

    expect(result).toHaveLength(0)
  })

  it('allows a mix of unprotective static and dynamic Rel values', () => {
    const result = runRule([
      targetBlank(),
      rel('nofollow'),
      Testing.callExpr('Rel', [Testing.id('relValue')]),
    ])

    expect(result).toHaveLength(0)
  })

  it('ignores non-external targets', () => {
    const result = runRule([
      Testing.callExpr('Target', [Testing.strLiteral('_self')]),
    ])

    expect(result).toHaveLength(0)
  })

  it('ignores arrays with no Target', () => {
    const result = runRule([
      Testing.callExpr('Class', [Testing.strLiteral('link')]),
    ])

    expect(result).toHaveLength(0)
  })

  it('ignores non-literal Target arguments', () => {
    const result = runRule([
      Testing.callExpr('Target', [Testing.id('someVar')]),
    ])

    expect(result).toHaveLength(0)
  })

  it('ignores template literal Target arguments', () => {
    const result = runRule([
      Testing.callExpr('Target', [templateLiteral('_blank')]),
    ])

    expect(result).toHaveLength(0)
  })

  it('ignores Target calls with no arguments', () => {
    const result = runRule([Testing.callExpr('Target')])

    expect(result).toHaveLength(0)
  })

  it('ignores empty arrays', () => {
    const result = runRule([])

    expect(result).toHaveLength(0)
  })

  it('ignores computed callee access', () => {
    const result = runRule([
      callExpression(Testing.computedMemberExpr('h', 'Target'), [
        Testing.strLiteral('_blank'),
      ]),
    ])

    expect(result).toHaveLength(0)
  })
})
