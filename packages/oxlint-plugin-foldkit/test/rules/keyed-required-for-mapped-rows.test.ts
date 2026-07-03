import * as Testing from 'effect-oxlint/testing'
import { describe, expect, it } from 'vitest'

import rule from '../../src/rules/keyed-required-for-mapped-rows.ts'

// ── helpers ────────────────────────────────────────────────────────────────

const arr = (elements: ReadonlyArray<unknown>) => ({
  type: 'ArrayExpression',
  elements: Array.from(elements),
})

const ident = (name: string) => ({ type: 'Identifier', name })

const memberAccess = (object: string, property: string) => ({
  type: 'MemberExpression',
  computed: false,
  object: ident(object),
  property: ident(property),
})

const arrowFn = (paramName: string, body: unknown) => ({
  type: 'ArrowFunctionExpression',
  expression: true,
  async: false,
  params: [ident(paramName)],
  body,
  id: null,
  generator: false,
})

const arrowFnDestructured = (body: unknown) => ({
  type: 'ArrowFunctionExpression',
  expression: true,
  async: false,
  params: [{ type: 'ObjectPattern', properties: [] }],
  body,
  id: null,
  generator: false,
})

// items.map(fn)
const methodMap = (receiver: unknown, fn: unknown) => ({
  type: 'CallExpression',
  callee: {
    type: 'MemberExpression',
    computed: false,
    object: receiver,
    property: ident('map'),
  },
  arguments: [fn],
})

// Array.map(items, fn)
const arrayMap = (items: unknown, fn: unknown) => ({
  type: 'CallExpression',
  callee: {
    type: 'MemberExpression',
    computed: false,
    object: ident('Array'),
    property: ident('map'),
  },
  arguments: [items, fn],
})

// li([attrs], [children])
const rowCall = (tag: string, attrs: unknown, children: unknown) => ({
  type: 'CallExpression',
  callee: ident(tag),
  arguments: [attrs, children],
})

// keyed('li')(id, attrs, children)
const keyedRowCall = (
  tag: string,
  id: unknown,
  attrs: unknown,
  children: unknown,
) => ({
  type: 'CallExpression',
  callee: {
    type: 'CallExpression',
    callee: ident('keyed'),
    arguments: [{ type: 'Literal', value: tag }],
  },
  arguments: [id, attrs, children],
})

// OnClick(ClickedDelete({ id: item.id }))
const onClickReferencingId = (paramName: string) =>
  Testing.callExpr('OnClick', [
    Testing.callExpr('ClickedDelete', [
      {
        type: 'ObjectExpression',
        properties: [
          {
            type: 'Property',
            kind: 'init',
            computed: false,
            method: false,
            shorthand: false,
            key: ident('id'),
            value: memberAccess(paramName, 'id'),
          },
        ],
      },
    ]),
  ])

describe('keyed-required-for-mapped-rows', () => {
  it('flags `items.map((item) => li([], [item.id]))` (id-bearing row)', () => {
    const node = methodMap(
      ident('items'),
      arrowFn(
        'item',
        rowCall('li', arr([]), arr([memberAccess('item', 'id')])),
      ),
    )
    const result = Testing.runRule(rule, 'CallExpression', node)
    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('keyed')
  })

  it('flags `items.map((item) => li([OnClick(...{ id: item.id })], []))`', () => {
    const node = methodMap(
      ident('items'),
      arrowFn(
        'item',
        rowCall('li', arr([onClickReferencingId('item')]), arr([])),
      ),
    )
    const result = Testing.runRule(rule, 'CallExpression', node)
    expect(result).toHaveLength(1)
  })

  it('flags `Array.map(items, (item) => div([], [item.id]))`', () => {
    const node = arrayMap(
      ident('items'),
      arrowFn(
        'item',
        rowCall('div', arr([]), arr([memberAccess('item', 'id')])),
      ),
    )
    const result = Testing.runRule(rule, 'CallExpression', node)
    expect(result).toHaveLength(1)
  })

  it.each(['tr', 'article', 'section'])('flags `%s` row elements', tag => {
    const node = methodMap(
      ident('items'),
      arrowFn('item', rowCall(tag, arr([]), arr([memberAccess('item', 'id')]))),
    )
    const result = Testing.runRule(rule, 'CallExpression', node)
    expect(result).toHaveLength(1)
  })

  it('flags destructured params (assumed identity-bearing)', () => {
    const node = methodMap(
      ident('items'),
      arrowFnDestructured(rowCall('li', arr([]), arr([]))),
    )
    const result = Testing.runRule(rule, 'CallExpression', node)
    expect(result).toHaveLength(1)
  })

  it('does not flag `items.map((item) => keyed("li")(item.id, [], []))`', () => {
    const node = methodMap(
      ident('items'),
      arrowFn(
        'item',
        keyedRowCall('li', memberAccess('item', 'id'), arr([]), arr([])),
      ),
    )
    const result = Testing.runRule(rule, 'CallExpression', node)
    expect(result).toHaveLength(0)
  })

  it('does not flag stateless static lists (no `<param>.id` reference)', () => {
    const node = methodMap(
      ident('tags'),
      arrowFn('tag', rowCall('li', arr([]), arr([ident('tag')]))),
    )
    const result = Testing.runRule(rule, 'CallExpression', node)
    expect(result).toHaveLength(0)
  })

  it('does not flag non-row elements (e.g. `span`, `p`)', () => {
    const node = methodMap(
      ident('items'),
      arrowFn(
        'item',
        rowCall('span', arr([]), arr([memberAccess('item', 'id')])),
      ),
    )
    const result = Testing.runRule(rule, 'CallExpression', node)
    expect(result).toHaveLength(0)
  })

  it('does not flag arrow body that returns something that is not a row call', () => {
    const node = methodMap(
      ident('items'),
      arrowFn('item', Testing.callExpr('renderHabitRow', [ident('item')])),
    )
    const result = Testing.runRule(rule, 'CallExpression', node)
    expect(result).toHaveLength(0)
  })

  it('handles block-bodied arrow with explicit return', () => {
    const blockArrow = {
      type: 'ArrowFunctionExpression',
      expression: false,
      async: false,
      params: [ident('item')],
      body: {
        type: 'BlockStatement',
        body: [
          {
            type: 'ReturnStatement',
            argument: rowCall('li', arr([]), arr([memberAccess('item', 'id')])),
          },
        ],
      },
      id: null,
      generator: false,
    }
    const node = methodMap(ident('items'), blockArrow)
    const result = Testing.runRule(rule, 'CallExpression', node)
    expect(result).toHaveLength(1)
  })

  it('does not flag non-`.map` method calls', () => {
    const node = methodMap(
      ident('items'),
      arrowFn(
        'item',
        rowCall('li', arr([]), arr([memberAccess('item', 'id')])),
      ),
    )
    // Override the method name
    const nonMapNode = {
      ...node,
      callee: { ...node.callee, property: ident('forEach') },
    }
    const result = Testing.runRule(rule, 'CallExpression', nonMapNode)
    expect(result).toHaveLength(0)
  })

  it('does not flag `Array.map(items, function(item) {...})` (non-arrow)', () => {
    const fnExpr = {
      type: 'FunctionExpression',
      async: false,
      generator: false,
      id: null,
      params: [ident('item')],
      body: {
        type: 'BlockStatement',
        body: [
          {
            type: 'ReturnStatement',
            argument: rowCall('li', arr([]), arr([memberAccess('item', 'id')])),
          },
        ],
      },
    }
    const node = arrayMap(ident('items'), fnExpr)
    const result = Testing.runRule(rule, 'CallExpression', node)
    expect(result).toHaveLength(0)
  })
})
