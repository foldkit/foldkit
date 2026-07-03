import * as Testing from 'effect-oxlint/testing'
import { describe, expect, it } from 'vitest'

import rule from '../../src/rules/no-disabling-dev-guardrails.ts'

const prop = (key: string, value: unknown = Testing.boolLiteral(false)) => ({
  type: 'Property',
  kind: 'init',
  computed: false,
  method: false,
  shorthand: false,
  key: Testing.id(key),
  value,
})

const stringProp = (
  key: string,
  value: unknown = Testing.boolLiteral(false),
) => ({
  type: 'Property',
  kind: 'init',
  computed: false,
  method: false,
  shorthand: false,
  key: Testing.strLiteral(key),
  value,
})

const computedProp = (
  key: string,
  value: unknown = Testing.boolLiteral(false),
) => ({
  type: 'Property',
  kind: 'init',
  computed: true,
  method: false,
  shorthand: false,
  key: Testing.id(key),
  value,
})

const objectExpr = (properties: ReadonlyArray<unknown>) => ({
  type: 'ObjectExpression',
  properties: Array.from(properties),
})

const runObject = (properties: ReadonlyArray<unknown>) =>
  Testing.runRule(rule, 'ObjectExpression', objectExpr(properties))

describe('no-disabling-dev-guardrails', () => {
  it('flags `slowView: false`', () => {
    const result = runObject([prop('slowView')])
    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('slowView')
  })

  it('flags `freezeModel: false`', () => {
    const result = runObject([prop('freezeModel')])
    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('freezeModel')
  })

  it('flags string-literal guardrail keys', () => {
    const result = runObject([stringProp('slowView')])
    expect(result).toHaveLength(1)
  })

  it('reports each disabled guardrail independently', () => {
    const result = runObject([prop('slowView'), prop('freezeModel')])
    expect(result).toHaveLength(2)
  })

  it('does not flag guardrails set to true', () => {
    const result = runObject([
      prop('slowView', Testing.boolLiteral(true)),
      prop('freezeModel', Testing.boolLiteral(true)),
    ])
    expect(result).toHaveLength(0)
  })

  it('does not flag dynamic false values', () => {
    const result = runObject([prop('slowView', Testing.id('disabled'))])
    expect(result).toHaveLength(0)
  })

  it('does not flag unrelated keys set to false', () => {
    const result = runObject([prop('devTools'), stringProp('guardrails')])
    expect(result).toHaveLength(0)
  })

  it('skips computed guardrail-like keys', () => {
    const result = runObject([computedProp('slowView')])
    expect(result).toHaveLength(0)
  })
})
