import * as Testing from 'effect-oxlint/testing'
import { describe, expect, it } from 'vitest'

import { noRouteQueryConstructorDefault } from '../../src/rules/no-route-query-constructor-default.ts'

const withConstructorDefaultCall = (object: string) =>
  Testing.callOfMember(object, 'withConstructorDefault', [Testing.arrowFn()])

const structFields = (
  fields: ReadonlyArray<Readonly<{ key: string; value?: unknown }>>,
) => Testing.callOfMember('S', 'Struct', [Testing.objectExpr(fields)])

const routeQuery = (
  fields: ReadonlyArray<Readonly<{ key: string; value?: unknown }>>,
) => Testing.callOfMember('Route', 'query', [structFields(fields)])

describe('no-route-query-constructor-default', () => {
  it('flags Schema.withConstructorDefault on a Route.query field', () => {
    const result = Testing.runRule(
      noRouteQueryConstructorDefault,
      'CallExpression',
      routeQuery([
        { key: 'page', value: withConstructorDefaultCall('Schema') },
      ]),
    )

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('Route.mapTo')
  })

  it('flags a bare withConstructorDefault on a Route.query field', () => {
    const result = Testing.runRule(
      noRouteQueryConstructorDefault,
      'CallExpression',
      routeQuery([
        {
          key: 'page',
          value: Testing.callExpr('withConstructorDefault', [
            Testing.arrowFn(),
          ]),
        },
      ]),
    )

    expect(result).toHaveLength(1)
  })

  it('flags every Route.query field that carries a default', () => {
    const result = Testing.runRule(
      noRouteQueryConstructorDefault,
      'CallExpression',
      routeQuery([
        { key: 'page', value: withConstructorDefaultCall('Schema') },
        { key: 'sort', value: withConstructorDefaultCall('S') },
      ]),
    )

    expect(result).toHaveLength(2)
  })

  it('allows Route.query fields without a constructor default', () => {
    const result = Testing.runRule(
      noRouteQueryConstructorDefault,
      'CallExpression',
      routeQuery([
        { key: 'page', value: Testing.memberExpr('S', 'FiniteFromString') },
      ]),
    )

    expect(result).toHaveLength(0)
  })

  it('ignores withConstructorDefault outside Route.query', () => {
    const result = Testing.runRule(
      noRouteQueryConstructorDefault,
      'CallExpression',
      structFields([
        { key: 'name', value: withConstructorDefaultCall('Schema') },
      ]),
    )

    expect(result).toHaveLength(0)
  })
})
