import * as Testing from 'effect-oxlint/testing'
import { describe, expect, it, vi } from 'vitest'

import { noEmptyToParentOutMessage } from '../../src/rules/no-empty-to-parent-out-message.ts'

const property = ({
  key = Testing.id('toParentOutMessage'),
  value = Testing.arrowFn(Testing.id('undefined')),
  computed = false,
  kind = 'init',
  range = [9, 49],
}: Readonly<{
  key?: unknown
  value?: unknown
  computed?: boolean
  kind?: 'get' | 'init' | 'set'
  range?: [number, number]
}> = {}) => {
  const [start, end] = range

  return {
    type: 'Property',
    kind,
    key,
    value,
    method: false,
    shorthand: false,
    computed,
    optional: false,
    start,
    end,
    range,
  }
}

const objectExpression = (
  properties: ReadonlyArray<unknown>,
  range: [number, number] = [0, 51],
) => {
  const [start, end] = range

  return {
    type: 'ObjectExpression',
    properties,
    start,
    end,
    range,
  }
}

const functionExpression = (body: unknown) => ({
  type: 'FunctionExpression',
  id: null,
  expression: false,
  generator: false,
  async: false,
  params: [],
  body,
})

const run = (node: unknown, sourceText = '') =>
  Testing.runRule(noEmptyToParentOutMessage, 'ObjectExpression', node, {
    sourceText,
  })

describe('no-empty-to-parent-out-message', () => {
  it('flags expression-bodied and block-bodied mappers that return undefined', () => {
    const expression = run(objectExpression([property()]))
    const block = run(
      objectExpression([
        property({
          value: Testing.arrowFn(
            Testing.blockStmt([Testing.returnStmt(Testing.id('undefined'))]),
          ),
        }),
      ]),
    )
    const functionResult = run(
      objectExpression([
        property({
          value: functionExpression(
            Testing.blockStmt([Testing.returnStmt(Testing.id('undefined'))]),
          ),
        }),
      ]),
    )

    expect(expression).toHaveLength(1)
    expect(block).toHaveLength(1)
    expect(functionResult).toHaveLength(1)
    expect(expression[0]?.diagnostic.message).toBe(
      'Omit toParentOutMessage. This mapper directly returns undefined, so it forwards nothing to the parent.',
    )
  })

  it('flags quoted and statically computed property names', () => {
    const quoted = run(
      objectExpression([
        property({ key: Testing.strLiteral('toParentOutMessage') }),
      ]),
    )
    const computed = run(
      objectExpression([
        property({
          key: Testing.strLiteral('toParentOutMessage'),
          computed: true,
        }),
      ]),
    )

    expect(quoted).toHaveLength(1)
    expect(computed).toHaveLength(1)
  })

  it('allows named and variant-sensitive mappers', () => {
    const named = run(
      objectExpression([property({ value: Testing.id('toParentOutMessage') })]),
    )
    const forwarded = run(
      objectExpression([
        property({
          value: Testing.arrowFn(Testing.id('parentOutMessage')),
        }),
      ]),
    )
    const matched = run(
      objectExpression([
        property({
          value: Testing.arrowFn(
            Testing.callExpr('matchOutMessage', [Testing.id('outMessage')]),
          ),
        }),
      ]),
    )

    expect(named).toHaveLength(0)
    expect(forwarded).toHaveLength(0)
    expect(matched).toHaveLength(0)
  })

  it('allows non-single-return bodies and other property names', () => {
    const multiStatement = run(
      objectExpression([
        property({
          value: Testing.arrowFn(
            Testing.blockStmt([
              Testing.returnStmt(Testing.id('undefined')),
              Testing.returnStmt(Testing.id('undefined')),
            ]),
          ),
        }),
      ]),
    )
    const otherProperty = run(
      objectExpression([property({ key: Testing.id('onNone') })]),
    )

    expect(multiStatement).toHaveLength(0)
    expect(otherProperty).toHaveLength(0)
  })

  it('allows async and generator mappers', () => {
    const asyncMapper = run(
      objectExpression([
        property({
          value: {
            ...Testing.arrowFn(Testing.id('undefined')),
            async: true,
          },
        }),
      ]),
    )
    const generatorMapper = run(
      objectExpression([
        property({
          value: {
            ...functionExpression(
              Testing.blockStmt([Testing.returnStmt(Testing.id('undefined'))]),
            ),
            generator: true,
          },
        }),
      ]),
    )

    expect(asyncMapper).toHaveLength(0)
    expect(generatorMapper).toHaveLength(0)
  })

  it('allows accessors that return undefined', () => {
    const getter = run(
      objectExpression([
        property({
          kind: 'get',
          value: functionExpression(
            Testing.blockStmt([Testing.returnStmt(Testing.id('undefined'))]),
          ),
        }),
      ]),
    )

    expect(getter).toHaveLength(0)
  })

  it('autofixes a structurally safe property removal', () => {
    const result = run(
      objectExpression([
        property({
          key: Testing.id('update'),
          value: Testing.id('update'),
          range: [2, 8],
        }),
        property(),
      ]),
    )
    const removeRange = vi.fn(() => ({ range: [8, 49], text: '' }))

    result[0]?.diagnostic.fix?.({ removeRange } as never)

    expect(removeRange).toHaveBeenCalledWith([8, 49])
  })

  it('includes a trailing comma when removing the only property', () => {
    const sourceText = '{ toParentOutMessage: () => undefined, }'
    const propertyStart = sourceText.indexOf('toParentOutMessage')
    const propertyEnd = sourceText.indexOf(',')
    const result = run(
      objectExpression(
        [property({ range: [propertyStart, propertyEnd] })],
        [0, sourceText.length],
      ),
      sourceText,
    )
    const removeRange = vi.fn(() => ({
      range: [propertyStart, propertyEnd + 1],
      text: '',
    }))

    result[0]?.diagnostic.fix?.({ removeRange } as never)

    expect(removeRange).toHaveBeenCalledWith([propertyStart, propertyEnd + 1])
  })

  it('reports without a fix when surrounding properties make removal unsafe', () => {
    const spreadResult = run(
      objectExpression([
        {
          type: 'SpreadElement',
          argument: Testing.id('foldOptions'),
          start: 2,
          end: 16,
        },
        property(),
      ]),
    )
    const duplicateResult = run(
      objectExpression([
        property({
          value: Testing.id('toParentOutMessage'),
          range: [2, 31],
        }),
        property(),
      ]),
    )
    const dynamicComputedResult = run(
      objectExpression([
        property({
          key: Testing.id('propertyName'),
          value: Testing.id('forwardingMapper'),
          computed: true,
          range: [2, 31],
        }),
        property(),
      ]),
    )

    expect(spreadResult[0]?.diagnostic.fix).toBeUndefined()
    expect(duplicateResult[0]?.diagnostic.fix).toBeUndefined()
    expect(dynamicComputedResult[0]?.diagnostic.fix).toBeUndefined()
  })
})
