import * as Testing from 'effect-oxlint/testing'
import { describe, expect, it } from 'vitest'

import { labelRequiresFor } from '../../src/rules/label-requires-for.ts'

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

const runRule = (node: unknown) =>
  Testing.runRule(labelRequiresFor, 'CallExpression', node)

describe('label-requires-for', () => {
  it('flags a label with an empty attribute array', () => {
    const labelCall = Testing.callExpr('label', [
      arrayExpression([]),
      arrayExpression([Testing.strLiteral('Email')]),
    ])

    const result = runRule(labelCall)

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('For(id)')
    expect(result[0]?.diagnostic.node).toBe(labelCall)
  })

  it('flags a label with attributes but no For', () => {
    const labelCall = Testing.callExpr('label', [
      arrayExpression([
        Testing.callExpr('Class', [Testing.strLiteral('block')]),
      ]),
      arrayExpression([Testing.strLiteral('Email')]),
    ])

    const result = runRule(labelCall)

    expect(result).toHaveLength(1)
  })

  it('flags a member-form label without For', () => {
    const labelCall = Testing.callOfMember('h', 'label', [
      arrayExpression([
        Testing.callOfMember('h', 'Class', [Testing.strLiteral('block')]),
      ]),
      arrayExpression([Testing.strLiteral('Email')]),
    ])

    const result = runRule(labelCall)

    expect(result).toHaveLength(1)
  })

  it('allows a label whose attribute array starts with For', () => {
    const labelCall = Testing.callExpr('label', [
      arrayExpression([
        Testing.callExpr('For', [Testing.strLiteral('email-input')]),
        Testing.callExpr('Class', [Testing.strLiteral('block')]),
      ]),
      arrayExpression([Testing.strLiteral('Email')]),
    ])

    const result = runRule(labelCall)

    expect(result).toHaveLength(0)
  })

  it('allows a label whose attribute array ends with For', () => {
    const labelCall = Testing.callExpr('label', [
      arrayExpression([
        Testing.callExpr('Class', [Testing.strLiteral('block')]),
        Testing.callExpr('For', [Testing.strLiteral('email-input')]),
      ]),
      arrayExpression([Testing.strLiteral('Email')]),
    ])

    const result = runRule(labelCall)

    expect(result).toHaveLength(0)
  })

  it('allows a member-form For', () => {
    const labelCall = Testing.callOfMember('h', 'label', [
      arrayExpression([
        Testing.callOfMember('h', 'For', [Testing.strLiteral('email-input')]),
      ]),
      arrayExpression([Testing.strLiteral('Email')]),
    ])

    const result = runRule(labelCall)

    expect(result).toHaveLength(0)
  })

  it('allows a For call with zero arguments', () => {
    const labelCall = Testing.callExpr('label', [
      arrayExpression([Testing.callExpr('For')]),
      arrayExpression([]),
    ])

    const result = runRule(labelCall)

    expect(result).toHaveLength(0)
  })

  it('allows a label nesting a control as a direct child', () => {
    const labelCall = Testing.callExpr('label', [
      arrayExpression([]),
      arrayExpression([
        Testing.callExpr('input', [
          arrayExpression([
            Testing.callExpr('Type', [Testing.strLiteral('email')]),
          ]),
        ]),
      ]),
    ])

    const result = runRule(labelCall)

    expect(result).toHaveLength(0)
  })

  it('allows a label nesting a member-form control deeply', () => {
    const labelCall = Testing.callOfMember('h', 'label', [
      arrayExpression([]),
      arrayExpression([
        Testing.callOfMember('h', 'div', [
          arrayExpression([]),
          arrayExpression([
            Testing.callOfMember('h', 'textarea', [
              arrayExpression([]),
              arrayExpression([]),
            ]),
          ]),
        ]),
      ]),
    ])

    const result = runRule(labelCall)

    expect(result).toHaveLength(0)
  })

  it('ignores other elements', () => {
    const spanCall = Testing.callExpr('span', [
      arrayExpression([]),
      arrayExpression([]),
    ])

    const result = runRule(spanCall)

    expect(result).toHaveLength(0)
  })

  it('ignores labels whose first argument is not an array literal', () => {
    const labelCall = Testing.callExpr('label', [
      Testing.id('sharedAttributes'),
      arrayExpression([]),
    ])

    const result = runRule(labelCall)

    expect(result).toHaveLength(0)
  })

  it('ignores labels with no arguments', () => {
    const result = runRule(Testing.callExpr('label'))

    expect(result).toHaveLength(0)
  })

  it('ignores computed callee access', () => {
    const labelCall = callExpression(Testing.computedMemberExpr('h', 'label'), [
      arrayExpression([]),
      arrayExpression([]),
    ])

    const result = runRule(labelCall)

    expect(result).toHaveLength(0)
  })
})
