import * as Testing from 'effect-oxlint/testing'
import { describe, expect, it } from 'vitest'

import { preferPointFreeEvoSetter } from '../../src/rules/prefer-point-free-evo-setter.ts'

const evoCall = (
  properties: ReadonlyArray<{ readonly key: string; readonly value?: unknown }>,
) => Testing.callExpr('evo', [Testing.id('model'), Testing.objectExpr(properties)])

const zeroParamArrow = (body: unknown) => Testing.arrowFn(body, [])

const run = (node: unknown) =>
  Testing.runRule(preferPointFreeEvoSetter, 'CallExpression', node)

describe('prefer-point-free-evo-setter', () => {
  it('flags a zero-param arrow that reads the same field it sets', () => {
    const result = run(
      evoCall([
        {
          key: 'count',
          value: zeroParamArrow(
            Testing.binaryExpr(
              '+',
              Testing.memberExpr('model', 'count'),
              Testing.numLiteral(1),
            ),
          ),
        },
      ]),
    )

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('count')
    expect(result[0]?.diagnostic.message).toContain('point-free')
  })

  it('flags a same-field read nested inside a call', () => {
    const result = run(
      evoCall([
        {
          key: 'entries',
          value: zeroParamArrow(
            Testing.callOfMember('Array', 'map', [
              Testing.memberExpr('model', 'entries'),
              Testing.id('archive'),
            ]),
          ),
        },
      ]),
    )

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('entries')
  })

  it('allows a point-free transformer value', () => {
    const result = run(
      evoCall([{ key: 'count', value: Testing.memberExpr('Number', 'increment') }]),
    )

    expect(result).toHaveLength(0)
  })

  it('allows a zero-param arrow that reads a different field', () => {
    const result = run(
      evoCall([
        {
          key: 'selectedId',
          value: zeroParamArrow(Testing.memberExpr('model', 'other')),
        },
      ]),
    )

    expect(result).toHaveLength(0)
  })

  it('allows a zero-param arrow that reads no model field', () => {
    const result = run(
      evoCall([{ key: 'count', value: zeroParamArrow(Testing.numLiteral(0)) }]),
    )

    expect(result).toHaveLength(0)
  })

  it('ignores calls that are not evo', () => {
    const result = run(
      Testing.callExpr('notEvo', [
        Testing.id('model'),
        Testing.objectExpr([
          {
            key: 'count',
            value: zeroParamArrow(
              Testing.binaryExpr(
                '+',
                Testing.memberExpr('model', 'count'),
                Testing.numLiteral(1),
              ),
            ),
          },
        ]),
      ]),
    )

    expect(result).toHaveLength(0)
  })
})
