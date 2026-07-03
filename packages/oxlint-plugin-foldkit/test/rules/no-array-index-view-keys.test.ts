import * as Testing from 'effect-oxlint/testing'
import { describe, expect, it } from 'vitest'

import rule from '../../src/rules/no-array-index-view-keys.ts'

const arr = (elements: ReadonlyArray<unknown> = []) => ({
  type: 'ArrayExpression',
  elements: Array.from(elements),
})

const parent = (child: object, value: object) => {
  Object.defineProperty(child, 'parent', { value })
}

const arrow = (params: ReadonlyArray<string>, body: unknown) => ({
  type: 'ArrowFunctionExpression',
  expression: true,
  async: false,
  params: params.map(Testing.id),
  body,
  id: null,
  generator: false,
})

const methodMap = (fn: object) => {
  const call = Testing.callExpr('', [])
  Object.assign(call, {
    callee: Testing.memberExpr('items', 'map'),
    arguments: [fn],
  })
  parent(fn, call)
  return call
}

const arrMapDataFirst = (fn: object) => {
  const call = Testing.callOfMember('Arr', 'map', [Testing.id('items'), fn])
  parent(fn, call)
  return call
}

const arrMapDataLast = (fn: object) => {
  const call = Testing.callOfMember('Arr', 'map', [fn])
  parent(fn, call)
  return call
}

const arrMakeBy = (fn: object) => {
  const call = Testing.callOfMember('Arr', 'makeBy', [
    Testing.numLiteral(3),
    fn,
  ])
  parent(fn, call)
  return call
}

const hKeyed = (key: unknown) => ({
  type: 'CallExpression',
  callee: Testing.callOfMember('h', 'keyed', [Testing.strLiteral('div')]),
  arguments: [key, arr(), arr()],
})

const hKey = (key: unknown) => Testing.callOfMember('h', 'Key', [key])

const hSubmodel = (slotId: unknown) =>
  Testing.callOfMember('h', 'submodel', [
    Testing.objectExpr([{ key: 'slotId', value: slotId }]),
  ])

const keyedLazyCall = (name: string, key: unknown) =>
  Testing.callExpr(name, [key, Testing.id('view')])

const runInMap = (fn: object, sink: object) =>
  Testing.runRuleMulti(rule, [
    ['ArrowFunctionExpression', fn],
    ['CallExpression', sink],
    ['ArrowFunctionExpression:exit', fn],
  ])

describe('no-array-index-view-keys', () => {
  it('flags array index keys in `h.keyed(...)` inside `.map` callbacks', () => {
    const sink = hKeyed(Testing.id('i'))
    const fn = arrow(['item', 'i'], sink)
    methodMap(fn)
    const result = runInMap(fn, sink)
    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('array index')
  })

  it('flags array index keys in data-first `Arr.map(xs, fn)`', () => {
    const sink = hKeyed(Testing.id('index'))
    const fn = arrow(['item', 'index'], sink)
    arrMapDataFirst(fn)
    const result = runInMap(fn, sink)
    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('`index`')
  })

  it('flags array index keys in data-last `Arr.map(fn)`', () => {
    const sink = hKey(Testing.id('i'))
    const fn = arrow(['item', 'i'], sink)
    arrMapDataLast(fn)
    const result = runInMap(fn, sink)
    expect(result).toHaveLength(1)
  })

  it('flags `h.Key(index)` attributes', () => {
    const sink = hKey(Testing.id('i'))
    const fn = arrow(['item', 'i'], sink)
    methodMap(fn)
    const result = runInMap(fn, sink)
    expect(result).toHaveLength(1)
  })

  it('flags `slotId` in `h.submodel({ ... })` configs', () => {
    const sink = hSubmodel(Testing.id('i'))
    const fn = arrow(['item', 'i'], sink)
    methodMap(fn)
    const result = runInMap(fn, sink)
    expect(result).toHaveLength(1)
  })

  it('flags createKeyedLazy-derived slot calls', () => {
    const declarator = Testing.varDeclarator(
      'RowSlot',
      Testing.callExpr('createKeyedLazy'),
    )
    const sink = keyedLazyCall('RowSlot', Testing.id('i'))
    const fn = arrow(['item', 'i'], sink)
    methodMap(fn)
    const result = Testing.runRuleMulti(rule, [
      ['VariableDeclarator', declarator],
      ['ArrowFunctionExpression', fn],
      ['CallExpression', sink],
      ['ArrowFunctionExpression:exit', fn],
    ])
    expect(result).toHaveLength(1)
  })

  it('does not flag keys derived from stable item fields', () => {
    const sink = hKeyed(Testing.memberExpr('item', 'id'))
    const fn = arrow(['item', 'i'], sink)
    methodMap(fn)
    const result = runInMap(fn, sink)
    expect(result).toHaveLength(0)
  })

  it('does not flag first-parameter identifiers', () => {
    const sink = hKey(Testing.id('item'))
    const fn = arrow(['item', 'i'], sink)
    methodMap(fn)
    const result = runInMap(fn, sink)
    expect(result).toHaveLength(0)
  })

  it('does not flag callbacks without a second parameter', () => {
    const sink = hKey(Testing.id('i'))
    const fn = arrow(['item'], sink)
    methodMap(fn)
    const result = runInMap(fn, sink)
    expect(result).toHaveLength(0)
  })

  it('does not treat `Arr.makeBy` indexes as map row identity', () => {
    const sink = hKey(Testing.id('i'))
    const fn = arrow(['item', 'i'], sink)
    arrMakeBy(fn)
    const result = runInMap(fn, sink)
    expect(result).toHaveLength(0)
  })
})
