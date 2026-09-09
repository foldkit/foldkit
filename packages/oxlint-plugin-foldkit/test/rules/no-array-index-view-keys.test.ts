import * as Testing from 'effect-oxlint/testing'
import { describe, expect, it } from 'vitest'

import { noArrayIndexViewKeys } from '../../src/rules/no-array-index-view-keys.ts'

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

type MapCallbackArrowOptions = Readonly<{
  mapCallee: unknown
  parameters: ReadonlyArray<unknown>
  callbackPosition?: 0 | 1
}>

const mapCallbackArrow = (options: MapCallbackArrowOptions) => {
  const arrow: Record<string, unknown> = {
    type: 'ArrowFunctionExpression',
    params: options.parameters,
  }
  const callbackArguments =
    (options.callbackPosition ?? 0) === 0
      ? [arrow]
      : [Testing.id('items'), arrow]
  arrow.parent = {
    type: 'CallExpression',
    callee: options.mapCallee,
    arguments: callbackArguments,
  }
  return arrow
}

const itemAndIndexParameters = [Testing.id('item'), Testing.id('i')]

const methodMapArrow = (parameters: ReadonlyArray<unknown>) =>
  mapCallbackArrow({
    mapCallee: Testing.memberExpr('items', 'map'),
    parameters,
  })

const runMapScenario = (arrow: unknown, sink: unknown) =>
  Testing.runRuleMulti(noArrayIndexViewKeys, [
    ['ArrowFunctionExpression', arrow],
    ['CallExpression', sink],
    ['ArrowFunctionExpression:exit', arrow],
  ])

describe('no-array-index-view-keys', () => {
  it('flags an index key in a keyed element inside .map', () => {
    const indexIdentifier = Testing.id('i')
    const sink = callExpression(
      Testing.callOfMember('h', 'keyed', [Testing.strLiteral('div')]),
      [indexIdentifier, arrayExpression([]), arrayExpression([])],
    )

    const result = runMapScenario(methodMapArrow(itemAndIndexParameters), sink)

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('array index')
    expect(result[0]?.diagnostic.node).toBe(indexIdentifier)
  })

  it('flags a data-first module map with the callback at position 1', () => {
    const arrow = mapCallbackArrow({
      mapCallee: Testing.memberExpr('Array', 'map'),
      parameters: [Testing.id('item'), Testing.id('index')],
      callbackPosition: 1,
    })
    const sink = callExpression(
      Testing.callOfMember('h', 'keyed', [Testing.strLiteral('div')]),
      [Testing.id('index'), arrayExpression([]), arrayExpression([])],
    )

    const result = runMapScenario(arrow, sink)

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('`index`')
  })

  it('flags a data-last module map with the callback at position 0', () => {
    const arrow = mapCallbackArrow({
      mapCallee: Testing.memberExpr('Array', 'map'),
      parameters: itemAndIndexParameters,
    })
    const sink = Testing.callOfMember('h', 'Key', [Testing.id('i')])

    const result = runMapScenario(arrow, sink)

    expect(result).toHaveLength(1)
  })

  it('flags an index key in a Key attribute', () => {
    const sink = Testing.callOfMember('h', 'Key', [Testing.id('i')])

    const result = runMapScenario(methodMapArrow(itemAndIndexParameters), sink)

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('`i`')
  })

  it('flags an index key in a Submodel slotId', () => {
    const sink = Testing.callOfMember('h', 'submodel', [
      Testing.objectExpr([{ key: 'slotId', value: Testing.id('i') }]),
    ])

    const result = runMapScenario(methodMapArrow(itemAndIndexParameters), sink)

    expect(result).toHaveLength(1)
  })

  it('flags an index key in a keyed-lazy slot call', () => {
    const arrow = methodMapArrow(itemAndIndexParameters)
    const slotDeclarator = Testing.varDeclarator(
      'RowSlot',
      Testing.callExpr('createKeyedLazy'),
    )
    const sink = Testing.callExpr('RowSlot', [
      Testing.id('i'),
      Testing.id('view'),
    ])

    const result = Testing.runRuleMulti(noArrayIndexViewKeys, [
      ['VariableDeclarator', slotDeclarator],
      ['ArrowFunctionExpression', arrow],
      ['CallExpression', sink],
      ['ArrowFunctionExpression:exit', arrow],
    ])

    expect(result).toHaveLength(1)
  })

  it('flags bare map and bare Key forms', () => {
    const arrow = mapCallbackArrow({
      mapCallee: Testing.id('map'),
      parameters: itemAndIndexParameters,
    })
    const sink = Testing.callExpr('Key', [Testing.id('i')])

    const result = runMapScenario(arrow, sink)

    expect(result).toHaveLength(1)
  })

  it('flags computed member access referencing the index', () => {
    const sink = Testing.callOfMember('h', 'Key', [
      Testing.computedMemberExpr('labels', 'i'),
    ])

    const result = runMapScenario(methodMapArrow(itemAndIndexParameters), sink)

    expect(result).toHaveLength(1)
  })

  it('flags the outermost index when nested maps both track and the key uses the outer one', () => {
    const outerArrow = methodMapArrow(itemAndIndexParameters)
    const innerArrow = mapCallbackArrow({
      mapCallee: Testing.memberExpr('children', 'map'),
      parameters: [Testing.id('child'), Testing.id('j')],
    })
    const sink = Testing.callOfMember('h', 'Key', [Testing.id('i')])

    const result = Testing.runRuleMulti(noArrayIndexViewKeys, [
      ['ArrowFunctionExpression', outerArrow],
      ['ArrowFunctionExpression', innerArrow],
      ['CallExpression', sink],
      ['ArrowFunctionExpression:exit', innerArrow],
      ['ArrowFunctionExpression:exit', outerArrow],
    ])

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('`i`')
  })

  it('allows a stable field key', () => {
    const sink = callExpression(
      Testing.callOfMember('h', 'keyed', [Testing.strLiteral('div')]),
      [
        Testing.memberExpr('item', 'id'),
        arrayExpression([]),
        arrayExpression([]),
      ],
    )

    const result = runMapScenario(methodMapArrow(itemAndIndexParameters), sink)

    expect(result).toHaveLength(0)
  })

  it('allows the first parameter as the key', () => {
    const sink = Testing.callOfMember('h', 'Key', [Testing.id('item')])

    const result = runMapScenario(methodMapArrow(itemAndIndexParameters), sink)

    expect(result).toHaveLength(0)
  })

  it('does not track callbacks with no second parameter', () => {
    const arrow = methodMapArrow([Testing.id('item')])
    const sink = Testing.callOfMember('h', 'Key', [Testing.id('i')])

    const result = runMapScenario(arrow, sink)

    expect(result).toHaveLength(0)
  })

  it('does not track callbacks with a destructured second parameter', () => {
    const arrow = methodMapArrow([
      Testing.id('item'),
      { type: 'ObjectPattern', properties: [] },
    ])
    const sink = Testing.callOfMember('h', 'Key', [Testing.id('i')])

    const result = runMapScenario(arrow, sink)

    expect(result).toHaveLength(0)
  })

  it('does not treat Array.makeBy as a map call', () => {
    const arrow = mapCallbackArrow({
      mapCallee: Testing.memberExpr('Array', 'makeBy'),
      parameters: itemAndIndexParameters,
      callbackPosition: 1,
    })
    const sink = Testing.callOfMember('h', 'Key', [Testing.id('i')])

    const result = runMapScenario(arrow, sink)

    expect(result).toHaveLength(0)
  })

  it('does not treat a computed map callee as a map call', () => {
    const arrow = mapCallbackArrow({
      mapCallee: Testing.computedMemberExpr('items', 'map'),
      parameters: itemAndIndexParameters,
    })
    const sink = Testing.callOfMember('h', 'Key', [Testing.id('i')])

    const result = runMapScenario(arrow, sink)

    expect(result).toHaveLength(0)
  })

  it('allows an index name that only collides with a member property name', () => {
    const arrow = methodMapArrow([Testing.id('item'), Testing.id('id')])
    const sink = Testing.callOfMember('h', 'Key', [
      Testing.memberExpr('item', 'id'),
    ])

    const result = runMapScenario(arrow, sink)

    expect(result).toHaveLength(0)
  })

  it('allows a static object key that collides with the index name', () => {
    const sink = Testing.callOfMember('h', 'submodel', [
      Testing.objectExpr([
        { key: 'slotId', value: Testing.memberExpr('item', 'id') },
        { key: 'i', value: Testing.strLiteral('extra') },
      ]),
    ])

    const result = runMapScenario(methodMapArrow(itemAndIndexParameters), sink)

    expect(result).toHaveLength(0)
  })

  it('allows an index name shadowed by a nested arrow parameter', () => {
    const nestedArrow = {
      type: 'ArrowFunctionExpression',
      params: [Testing.id('i')],
      body: Testing.id('i'),
    }
    const sink = Testing.callOfMember('h', 'Key', [
      callExpression(Testing.id('compute'), [nestedArrow]),
    ])

    const result = runMapScenario(methodMapArrow(itemAndIndexParameters), sink)

    expect(result).toHaveLength(0)
  })

  it('skips sinks whose key argument is a SpreadElement', () => {
    const sink = Testing.callOfMember('h', 'Key', [
      { type: 'SpreadElement', argument: Testing.id('i') },
    ])

    const result = runMapScenario(methodMapArrow(itemAndIndexParameters), sink)

    expect(result).toHaveLength(0)
  })

  it('skips submodel calls whose first argument is not an object literal', () => {
    const sink = Testing.callOfMember('h', 'submodel', [Testing.id('config')])

    const result = runMapScenario(methodMapArrow(itemAndIndexParameters), sink)

    expect(result).toHaveLength(0)
  })

  it('does not recognize member-form slot calls', () => {
    const arrow = methodMapArrow(itemAndIndexParameters)
    const slotDeclarator = Testing.varDeclarator(
      'RowSlot',
      Testing.callExpr('createKeyedLazy'),
    )
    const sink = Testing.callOfMember('slots', 'RowSlot', [Testing.id('i')])

    const result = Testing.runRuleMulti(noArrayIndexViewKeys, [
      ['VariableDeclarator', slotDeclarator],
      ['ArrowFunctionExpression', arrow],
      ['CallExpression', sink],
      ['ArrowFunctionExpression:exit', arrow],
    ])

    expect(result).toHaveLength(0)
  })

  it('ignores sinks reached while no map callback is active', () => {
    const sink = Testing.callOfMember('h', 'Key', [Testing.id('i')])

    const result = Testing.runRule(noArrayIndexViewKeys, 'CallExpression', sink)

    expect(result).toHaveLength(0)
  })
})
