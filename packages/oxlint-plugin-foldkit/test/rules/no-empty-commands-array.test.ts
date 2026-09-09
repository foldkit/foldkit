import * as Testing from 'effect-oxlint/testing'
import { describe, expect, it, vi } from 'vitest'

import { noEmptyCommandsArray } from '../../src/rules/no-empty-commands-array.ts'

const arrayExpression = (elements: ReadonlyArray<unknown> = []) => ({
  type: 'ArrayExpression',
  elements,
})

const property = ({
  key = Testing.id('commands'),
  value = arrayExpression(),
  computed = false,
  range = [9, 21],
}: Readonly<{
  key?: unknown
  value?: unknown
  computed?: boolean
  range?: [number, number]
}> = {}) => {
  const [start, end] = range

  return {
    type: 'Property',
    kind: 'init',
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
  range: [number, number] = [0, 23],
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

const run = (node: unknown, sourceText = '') =>
  Testing.runRule(noEmptyCommandsArray, 'ObjectExpression', node, {
    sourceText,
  })

describe('no-empty-commands-array', () => {
  it('flags a literal empty commands array', () => {
    const result = run(
      objectExpression([
        property({
          key: Testing.id('model'),
          value: Testing.id('model'),
          range: [2, 7],
        }),
        property(),
      ]),
    )

    expect(result).toHaveLength(1)
    const [reported] = result
    expect(reported?.diagnostic.message).toContain(
      'Return { model } instead of the literal { model, commands: [] }.',
    )
  })

  it('flags quoted and statically computed commands properties', () => {
    const quoted = run(
      objectExpression([property({ key: Testing.strLiteral('commands') })]),
    )
    const computed = run(
      objectExpression([
        property({ key: Testing.strLiteral('commands'), computed: true }),
      ]),
    )

    expect(quoted).toHaveLength(1)
    expect(computed).toHaveLength(1)
  })

  it('intentionally flags an unrelated object with the same syntax', () => {
    const result = run(objectExpression([property()]))

    expect(result).toHaveLength(1)
  })

  it('allows omitted, shorthand, normalized, and computed commands', () => {
    const cases = [
      objectExpression([
        property({ key: Testing.id('model'), value: Testing.id('model') }),
      ]),
      objectExpression([property({ value: Testing.id('commands') })]),
      objectExpression([
        property({
          value: {
            type: 'LogicalExpression',
            operator: '??',
            left: Testing.id('optionalCommands'),
            right: arrayExpression(),
          },
        }),
      ]),
      objectExpression([
        property({
          value: Testing.callExpr('buildCommands', [Testing.id('model')]),
        }),
      ]),
      objectExpression([property({ computed: true })]),
    ]

    for (const node of cases) {
      expect(run(node)).toHaveLength(0)
    }
  })

  it('allows non-empty arrays and other empty-array properties', () => {
    const nonEmpty = run(
      objectExpression([
        property({ value: arrayExpression([Testing.id('load')]) }),
      ]),
    )
    const otherProperty = run(
      objectExpression([property({ key: Testing.id('items') })]),
    )

    expect(nonEmpty).toHaveLength(0)
    expect(otherProperty).toHaveLength(0)
  })

  it('autofixes a structurally safe property removal', () => {
    const result = run(
      objectExpression([
        property({
          key: Testing.id('model'),
          value: Testing.id('model'),
          range: [2, 7],
        }),
        property(),
      ]),
    )
    const removeRange = vi.fn(() => ({ range: [7, 21], text: '' }))

    const [reported] = result
    reported?.diagnostic.fix?.({ removeRange } as never)

    expect(removeRange).toHaveBeenCalledWith([7, 21])
  })

  it('includes a trailing comma when removing the only property', () => {
    const sourceText = '{ commands: [], }'
    const propertyStart = sourceText.indexOf('commands')
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
          argument: Testing.id('result'),
          start: 2,
          end: 11,
        },
        property(),
      ]),
    )
    const duplicateResult = run(
      objectExpression([
        property({ value: Testing.id('commands'), range: [2, 11] }),
        property(),
      ]),
    )
    const dynamicComputedResult = run(
      objectExpression([
        property({
          key: Testing.id('propertyName'),
          value: Testing.id('computedCommands'),
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
