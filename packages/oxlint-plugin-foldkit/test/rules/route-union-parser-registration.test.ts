import * as Testing from 'effect-oxlint/testing'
import { describe, expect, it } from 'vitest'

import rule from '../../src/rules/route-union-parser-registration.ts'

const arr = (elements: ReadonlyArray<unknown>) => ({
  type: 'ArrayExpression',
  elements: Array.from(elements),
})

const routeDecl = (name: string) =>
  Testing.varDeclarator(name, Testing.callExpr('r', [Testing.strLiteral(name)]))

const routerDecl = (routerName: string, routeName: string) =>
  Testing.varDeclarator(
    routerName,
    Testing.callOfMember('Route', 'mapTo', [Testing.id(routeName)]),
  )

const appRouteUnion = (routeNames: ReadonlyArray<string>) =>
  Testing.callOfMember('S', 'Union', [arr(routeNames.map(Testing.id))])

const oneOf = (routerNames: ReadonlyArray<string>) =>
  Testing.callOfMember('Route', 'oneOf', routerNames.map(Testing.id))

const fallback = (routeName: string) =>
  Testing.callOfMember('Route', 'parseUrlWithFallback', [
    Testing.id('routeParser'),
    Testing.id(routeName),
  ])

const programExit = ['Program:exit', Testing.program()] as const

const runRouteRule = (events: ReadonlyArray<readonly [string, unknown]>) =>
  Testing.runRuleMulti(rule, [...events, programExit])

describe('route-union-parser-registration', () => {
  it('does not flag a complete route union / router / oneOf registration set', () => {
    const result = runRouteRule([
      ['VariableDeclarator', routeDecl('HomeRoute')],
      ['VariableDeclarator', routeDecl('UserRoute')],
      ['VariableDeclarator', routeDecl('NotFoundRoute')],
      [
        'CallExpression',
        appRouteUnion(['HomeRoute', 'UserRoute', 'NotFoundRoute']),
      ],
      ['VariableDeclarator', routerDecl('homeRouter', 'HomeRoute')],
      ['VariableDeclarator', routerDecl('userRouter', 'UserRoute')],
      ['CallExpression', oneOf(['homeRouter', 'userRouter'])],
      ['CallExpression', fallback('NotFoundRoute')],
    ])
    expect(result).toHaveLength(0)
  })

  it('flags union route members with no Route.mapTo parser, excluding the fallback route', () => {
    const result = runRouteRule([
      ['VariableDeclarator', routeDecl('HomeRoute')],
      ['VariableDeclarator', routeDecl('UserRoute')],
      ['VariableDeclarator', routeDecl('NotFoundRoute')],
      [
        'CallExpression',
        appRouteUnion(['HomeRoute', 'UserRoute', 'NotFoundRoute']),
      ],
      ['VariableDeclarator', routerDecl('homeRouter', 'HomeRoute')],
      ['CallExpression', oneOf(['homeRouter'])],
      ['CallExpression', fallback('NotFoundRoute')],
    ])
    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('UserRoute')
    expect(result[0]?.diagnostic.message).toContain('Route.mapTo')
  })

  it('flags routers that map a route but are absent from Route.oneOf', () => {
    const result = runRouteRule([
      ['VariableDeclarator', routeDecl('HomeRoute')],
      ['VariableDeclarator', routeDecl('UserRoute')],
      ['VariableDeclarator', routeDecl('NotFoundRoute')],
      [
        'CallExpression',
        appRouteUnion(['HomeRoute', 'UserRoute', 'NotFoundRoute']),
      ],
      ['VariableDeclarator', routerDecl('homeRouter', 'HomeRoute')],
      ['VariableDeclarator', routerDecl('userRouter', 'UserRoute')],
      ['CallExpression', oneOf(['homeRouter'])],
      ['CallExpression', fallback('NotFoundRoute')],
    ])
    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('userRouter')
    expect(result[0]?.diagnostic.message).toContain('Route.oneOf')
  })

  it('handles a missing parseUrlWithFallback call without crashing', () => {
    const result = runRouteRule([
      ['VariableDeclarator', routeDecl('HomeRoute')],
      ['VariableDeclarator', routeDecl('NotFoundRoute')],
      ['CallExpression', appRouteUnion(['HomeRoute', 'NotFoundRoute'])],
      ['VariableDeclarator', routerDecl('homeRouter', 'HomeRoute')],
      ['CallExpression', oneOf(['homeRouter'])],
    ])
    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('NotFoundRoute')
  })

  it('does not run unless the file has route declarations and Route.oneOf', () => {
    const result = runRouteRule([
      ['CallExpression', appRouteUnion(['HomeRoute'])],
      ['VariableDeclarator', routerDecl('homeRouter', 'HomeRoute')],
    ])
    expect(result).toHaveLength(0)
  })
})
