import * as Testing from 'effect-oxlint/testing'
import { describe, expect, it } from 'vitest'

import { noEmptyChildrenArray } from '../../src/rules/no-empty-children-array.ts'

const arrayExpr = (elements: ReadonlyArray<unknown> = []) => ({
  type: 'ArrayExpression',
  elements,
})

describe('no-empty-children-array', () => {
  it('flags an element builder call whose children argument is an empty array', () => {
    const result = Testing.runRule(
      noEmptyChildrenArray,
      'CallExpression',
      Testing.callOfMember('h', 'div', [
        arrayExpr([Testing.callOfMember('h', 'Class', [])]),
        arrayExpr(),
      ]),
    )

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('h.div([...])')
  })

  it('flags the inert builder the same way', () => {
    const result = Testing.runRule(
      noEmptyChildrenArray,
      'CallExpression',
      Testing.callOfMember('ih', 'span', [arrayExpr(), arrayExpr()]),
    )

    expect(result).toHaveLength(1)
  })

  it('does not flag an element that has children', () => {
    const result = Testing.runRule(
      noEmptyChildrenArray,
      'CallExpression',
      Testing.callOfMember('h', 'div', [
        arrayExpr(),
        arrayExpr([Testing.strLiteral('hello')]),
      ]),
    )

    expect(result).toHaveLength(0)
  })

  it('does not flag an element that already omits its children', () => {
    const result = Testing.runRule(
      noEmptyChildrenArray,
      'CallExpression',
      Testing.callOfMember('h', 'div', [arrayExpr()]),
    )

    expect(result).toHaveLength(0)
  })

  it('does not flag a children argument that is not an inline empty array', () => {
    const result = Testing.runRule(
      noEmptyChildrenArray,
      'CallExpression',
      Testing.callOfMember('h', 'div', [arrayExpr(), Testing.id('rows')]),
    )

    expect(result).toHaveLength(0)
  })

  it('flags the inert builder under its unaliased name', () => {
    const result = Testing.runRule(
      noEmptyChildrenArray,
      'CallExpression',
      Testing.callOfMember('inertHtml', 'div', [arrayExpr(), arrayExpr()]),
    )

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('inertHtml.div([...])')
  })

  it('does not flag a lowercase method that is not an element builder', () => {
    const result = Testing.runRule(
      noEmptyChildrenArray,
      'CallExpression',
      Testing.callOfMember('h', 'encode', [arrayExpr(), arrayExpr()]),
    )

    expect(result).toHaveLength(0)
  })

  it('does not flag a PascalCase attribute constructor on the builder', () => {
    const result = Testing.runRule(
      noEmptyChildrenArray,
      'CallExpression',
      Testing.callOfMember('h', 'Prop', [arrayExpr(), arrayExpr()]),
    )

    expect(result).toHaveLength(0)
  })

  it('does not flag a two-argument call on some other receiver', () => {
    const result = Testing.runRule(
      noEmptyChildrenArray,
      'CallExpression',
      Testing.callOfMember('Array', 'appendAll', [arrayExpr(), arrayExpr()]),
    )

    expect(result).toHaveLength(0)
  })

  it('flags a keyed application whose children argument is an empty array', () => {
    const result = Testing.runRule(noEmptyChildrenArray, 'CallExpression', {
      type: 'CallExpression',
      callee: Testing.callOfMember('h', 'keyed', [Testing.strLiteral('li')]),
      arguments: [Testing.strLiteral('row-1'), arrayExpr(), arrayExpr()],
    })

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('h.keyed(tag)(key, [...])')
  })

  it('does not flag a keyed application that has children', () => {
    const result = Testing.runRule(noEmptyChildrenArray, 'CallExpression', {
      type: 'CallExpression',
      callee: Testing.callOfMember('h', 'keyed', [Testing.strLiteral('li')]),
      arguments: [
        Testing.strLiteral('row-1'),
        arrayExpr(),
        arrayExpr([Testing.strLiteral('label')]),
      ],
    })

    expect(result).toHaveLength(0)
  })

  it('does not flag a keyed application that already omits its children', () => {
    const result = Testing.runRule(noEmptyChildrenArray, 'CallExpression', {
      type: 'CallExpression',
      callee: Testing.callOfMember('h', 'keyed', [Testing.strLiteral('li')]),
      arguments: [Testing.strLiteral('row-1'), arrayExpr()],
    })

    expect(result).toHaveLength(0)
  })

  it('does not flag a three-argument application of some other curried call', () => {
    const result = Testing.runRule(noEmptyChildrenArray, 'CallExpression', {
      type: 'CallExpression',
      callee: Testing.callOfMember('Route', 'mapTo', [Testing.id('Schema')]),
      arguments: [Testing.strLiteral('x'), arrayExpr(), arrayExpr()],
    })

    expect(result).toHaveLength(0)
  })
})
