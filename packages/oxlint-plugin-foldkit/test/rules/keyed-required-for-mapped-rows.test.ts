import * as Testing from 'effect-oxlint/testing'
import { describe, expect, it } from 'vitest'

import { keyedRequiredForMappedRows } from '../../src/rules/keyed-required-for-mapped-rows.ts'

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

const idBearingRow = (tagName: string) =>
  Testing.callExpr(tagName, [
    arrayExpression([]),
    arrayExpression([Testing.memberExpr('item', 'id')]),
  ])

const methodMapCall = (callback: unknown) =>
  Testing.callOfMember('items', 'map', [callback])

const runRule = (mapCall: unknown) =>
  Testing.runRule(keyedRequiredForMappedRows, 'CallExpression', mapCall)

describe('keyed-required-for-mapped-rows', () => {
  it('flags a simple id-bearing row', () => {
    const rowCall = idBearingRow('li')
    const mapCall = methodMapCall(
      Testing.arrowFn(rowCall, [Testing.id('item')]),
    )

    const result = runRule(mapCall)

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('keyed')
    expect(result[0]?.diagnostic.message).toContain(
      'foldkit/keyed-required-for-mapped-rows',
    )
    expect(result[0]?.diagnostic.node).toBe(rowCall)
  })

  it('flags a row whose id is referenced only inside an attribute payload', () => {
    const attributeCall = Testing.callExpr('OnClick', [
      Testing.callExpr('ClickedDelete', [
        Testing.objectExpr([
          { key: 'id', value: Testing.memberExpr('item', 'id') },
        ]),
      ]),
    ])
    const rowCall = Testing.callExpr('li', [
      arrayExpression([attributeCall]),
      arrayExpression([]),
    ])
    const mapCall = methodMapCall(
      Testing.arrowFn(rowCall, [Testing.id('item')]),
    )

    const result = runRule(mapCall)

    expect(result).toHaveLength(1)
  })

  it('flags the data-first module form with the callback at position 1', () => {
    const mapCall = Testing.callOfMember('Array', 'map', [
      Testing.id('items'),
      Testing.arrowFn(idBearingRow('div'), [Testing.id('item')]),
    ])

    const result = runRule(mapCall)

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('div')
  })

  it('flags each remaining row tag', () => {
    const remainingRowTags = ['tr', 'article', 'section']
    for (const tagName of remainingRowTags) {
      const mapCall = methodMapCall(
        Testing.arrowFn(idBearingRow(tagName), [Testing.id('item')]),
      )

      const result = runRule(mapCall)

      expect(result).toHaveLength(1)
      expect(result[0]?.diagnostic.message).toContain(tagName)
    }
  })

  it('flags a first parameter that destructures id', () => {
    const rowCall = Testing.callExpr('li', [
      arrayExpression([]),
      arrayExpression([]),
    ])
    const mapCall = methodMapCall(
      Testing.arrowFn(rowCall, [
        {
          type: 'ObjectPattern',
          properties: [{ type: 'Property', key: Testing.id('id') }],
        },
      ]),
    )

    const result = runRule(mapCall)

    expect(result).toHaveLength(1)
  })

  it('allows a first parameter that destructures only display fields', () => {
    const rowCall = Testing.callExpr('li', [
      arrayExpression([]),
      arrayExpression([Testing.id('title')]),
    ])
    const mapCall = methodMapCall(
      Testing.arrowFn(rowCall, [
        {
          type: 'ObjectPattern',
          properties: [{ type: 'Property', key: Testing.id('title') }],
        },
      ]),
    )

    const result = runRule(mapCall)

    expect(result).toHaveLength(0)
  })

  it('flags a block-bodied arrow with an explicit return', () => {
    const mapCall = methodMapCall(
      Testing.arrowFn(
        Testing.blockStmt([Testing.returnStmt(idBearingRow('li'))]),
        [Testing.id('item')],
      ),
    )

    const result = runRule(mapCall)

    expect(result).toHaveLength(1)
  })

  it('flags a member-form row helper', () => {
    const rowCall = Testing.callOfMember('h', 'li', [
      arrayExpression([]),
      arrayExpression([Testing.memberExpr('item', 'id')]),
    ])
    const mapCall = methodMapCall(
      Testing.arrowFn(rowCall, [Testing.id('item')]),
    )

    const result = runRule(mapCall)

    expect(result).toHaveLength(1)
  })

  it('flags the data-last pipe form with the callback at position 0', () => {
    const mapCall = Testing.callOfMember('Array', 'map', [
      Testing.arrowFn(idBearingRow('li'), [Testing.id('item')]),
    ])

    const result = runRule(mapCall)

    expect(result).toHaveLength(1)
  })

  it('allows a keyed wrapper', () => {
    const keyedRow = callExpression(
      Testing.callExpr('keyed', [Testing.strLiteral('li')]),
      [
        Testing.memberExpr('item', 'id'),
        arrayExpression([]),
        arrayExpression([]),
      ],
    )
    const mapCall = methodMapCall(
      Testing.arrowFn(keyedRow, [Testing.id('item')]),
    )

    const result = runRule(mapCall)

    expect(result).toHaveLength(0)
  })

  it('allows single-value functor maps such as Option.map and Effect.map', () => {
    const optionMap = Testing.callOfMember('Option', 'map', [
      Testing.id('maybeItem'),
      Testing.arrowFn(idBearingRow('div'), [Testing.id('item')]),
    ])
    const effectMap = Testing.callOfMember('Effect', 'map', [
      Testing.id('itemEffect'),
      Testing.arrowFn(idBearingRow('div'), [Testing.id('item')]),
    ])

    expect(runRule(optionMap)).toHaveLength(0)
    expect(runRule(effectMap)).toHaveLength(0)
  })

  it('still flags a data-first Array.map that returns an id-bearing row', () => {
    const arrayMap = Testing.callOfMember('Array', 'map', [
      Testing.id('items'),
      Testing.arrowFn(idBearingRow('li'), [Testing.id('item')]),
    ])

    expect(runRule(arrayMap)).toHaveLength(1)
  })

  it('allows a member-form keyed wrapper', () => {
    const keyedRow = callExpression(
      Testing.callOfMember('h', 'keyed', [Testing.strLiteral('li')]),
      [
        Testing.memberExpr('item', 'id'),
        arrayExpression([]),
        arrayExpression([]),
      ],
    )
    const mapCall = methodMapCall(
      Testing.arrowFn(keyedRow, [Testing.id('item')]),
    )

    const result = runRule(mapCall)

    expect(result).toHaveLength(0)
  })

  it('allows a row keyed with the Key attribute form', () => {
    const rowCall = Testing.callExpr('li', [
      arrayExpression([
        Testing.callExpr('Key', [Testing.memberExpr('item', 'id')]),
      ]),
      arrayExpression([Testing.memberExpr('item', 'id')]),
    ])
    const mapCall = methodMapCall(
      Testing.arrowFn(rowCall, [Testing.id('item')]),
    )

    const result = runRule(mapCall)

    expect(result).toHaveLength(0)
  })

  it('allows a row keyed with the member-form Key attribute', () => {
    const rowCall = Testing.callOfMember('h', 'li', [
      arrayExpression([
        Testing.callOfMember('h', 'Key', [Testing.memberExpr('item', 'id')]),
      ]),
      arrayExpression([Testing.memberExpr('item', 'id')]),
    ])
    const mapCall = methodMapCall(
      Testing.arrowFn(rowCall, [Testing.id('item')]),
    )

    const result = runRule(mapCall)

    expect(result).toHaveLength(0)
  })

  it('allows a stateless static list with no id reference', () => {
    const rowCall = Testing.callExpr('li', [
      arrayExpression([]),
      arrayExpression([Testing.id('tag')]),
    ])
    const mapCall = methodMapCall(Testing.arrowFn(rowCall, [Testing.id('tag')]))

    const result = runRule(mapCall)

    expect(result).toHaveLength(0)
  })

  it('allows non-row elements', () => {
    const mapCall = methodMapCall(
      Testing.arrowFn(idBearingRow('span'), [Testing.id('item')]),
    )

    const result = runRule(mapCall)

    expect(result).toHaveLength(0)
  })

  it('allows a helper-call return', () => {
    const helperCall = Testing.callExpr('renderHabitRow', [Testing.id('item')])
    const mapCall = methodMapCall(
      Testing.arrowFn(helperCall, [Testing.id('item')]),
    )

    const result = runRule(mapCall)

    expect(result).toHaveLength(0)
  })

  it('ignores non-map methods', () => {
    const forEachCall = Testing.callOfMember('items', 'forEach', [
      Testing.arrowFn(idBearingRow('li'), [Testing.id('item')]),
    ])

    const result = runRule(forEachCall)

    expect(result).toHaveLength(0)
  })

  it('ignores FunctionExpression callbacks', () => {
    const mapCall = Testing.callOfMember('Array', 'map', [
      Testing.id('items'),
      {
        type: 'FunctionExpression',
        params: [Testing.id('item')],
        body: Testing.blockStmt([Testing.returnStmt(idBearingRow('li'))]),
      },
    ])

    const result = runRule(mapCall)

    expect(result).toHaveLength(0)
  })

  it('ignores callbacks with zero parameters', () => {
    const rowCall = Testing.callExpr('li', [
      arrayExpression([]),
      arrayExpression([]),
    ])
    const mapCall = methodMapCall(Testing.arrowFn(rowCall, []))

    const result = runRule(mapCall)

    expect(result).toHaveLength(0)
  })

  it('ignores block bodies whose last return has no argument', () => {
    const mapCall = methodMapCall(
      Testing.arrowFn(
        Testing.blockStmt([
          Testing.varDecl('const', 'rowId', Testing.memberExpr('item', 'id')),
          Testing.returnStmt(),
        ]),
        [Testing.id('item')],
      ),
    )

    const result = runRule(mapCall)

    expect(result).toHaveLength(0)
  })

  it('ignores computed map callees', () => {
    const mapCall = callExpression(Testing.computedMemberExpr('items', 'map'), [
      Testing.arrowFn(idBearingRow('li'), [Testing.id('item')]),
    ])

    const result = runRule(mapCall)

    expect(result).toHaveLength(0)
  })
})
