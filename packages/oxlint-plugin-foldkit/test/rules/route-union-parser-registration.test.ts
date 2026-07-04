import * as Testing from 'effect-oxlint/testing'
import { describe, expect, it } from 'vitest'

import { routeUnionParserRegistration } from '../../src/rules/route-union-parser-registration.ts'

const routeDeclarator = (routeName: string) =>
  Testing.varDeclarator(
    routeName,
    Testing.callExpr('r', [Testing.strLiteral(routeName)]),
  )

const arrayExpression = (elements: ReadonlyArray<unknown>) => ({
  type: 'ArrayExpression',
  elements,
})

const unionCall = (routeNames: ReadonlyArray<string>) =>
  Testing.callOfMember('S', 'Union', [
    arrayExpression(routeNames.map(Testing.id)),
  ])

const mapToRouter = (routerName: string, routeName: string) =>
  Testing.varDeclarator(
    routerName,
    Testing.callOfMember('Route', 'mapTo', [Testing.id(routeName)]),
  )

const pipeMapToRouter = (
  routerName: string,
  pathSegment: string,
  routeName: string,
) =>
  Testing.varDeclarator(
    routerName,
    Testing.callExpr('pipe', [
      Testing.callExpr('literal', [Testing.strLiteral(pathSegment)]),
      Testing.callExpr('slash', [
        Testing.callExpr('string', [Testing.strLiteral('id')]),
      ]),
      Testing.callOfMember('Route', 'mapTo', [Testing.id(routeName)]),
    ]),
  )

const oneOfCall = (routerNames: ReadonlyArray<string>) =>
  Testing.callOfMember('Route', 'oneOf', routerNames.map(Testing.id))

const fallbackCall = (routeName: string) =>
  Testing.callOfMember('Route', 'parseUrlWithFallback', [
    Testing.id('routeParser'),
    Testing.id(routeName),
  ])

describe('route-union-parser-registration', () => {
  it('flags a union member with no Router', () => {
    const result = Testing.runRuleMulti(routeUnionParserRegistration, [
      ['VariableDeclarator', routeDeclarator('HomeRoute')],
      ['VariableDeclarator', routeDeclarator('UserRoute')],
      ['VariableDeclarator', routeDeclarator('NotFoundRoute')],
      [
        'CallExpression',
        unionCall(['HomeRoute', 'UserRoute', 'NotFoundRoute']),
      ],
      ['VariableDeclarator', mapToRouter('homeRouter', 'HomeRoute')],
      ['CallExpression', oneOfCall(['homeRouter'])],
      ['CallExpression', fallbackCall('NotFoundRoute')],
      ['Program:exit', Testing.program()],
    ])

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('UserRoute')
    expect(result[0]?.diagnostic.message).toContain('Route.mapTo')
  })

  it('flags a mapped Router that is not registered in oneOf', () => {
    const result = Testing.runRuleMulti(routeUnionParserRegistration, [
      ['VariableDeclarator', routeDeclarator('HomeRoute')],
      ['VariableDeclarator', routeDeclarator('UserRoute')],
      ['VariableDeclarator', routeDeclarator('NotFoundRoute')],
      [
        'CallExpression',
        unionCall(['HomeRoute', 'UserRoute', 'NotFoundRoute']),
      ],
      ['VariableDeclarator', mapToRouter('homeRouter', 'HomeRoute')],
      ['VariableDeclarator', mapToRouter('userRouter', 'UserRoute')],
      ['CallExpression', oneOfCall(['homeRouter'])],
      ['CallExpression', fallbackCall('NotFoundRoute')],
      ['Program:exit', Testing.program()],
    ])

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('userRouter')
    expect(result[0]?.diagnostic.message).toContain('Route.oneOf')
  })

  it('flags the would-be fallback route when parseUrlWithFallback is absent', () => {
    const result = Testing.runRuleMulti(routeUnionParserRegistration, [
      ['VariableDeclarator', routeDeclarator('HomeRoute')],
      ['VariableDeclarator', routeDeclarator('NotFoundRoute')],
      ['CallExpression', unionCall(['HomeRoute', 'NotFoundRoute'])],
      ['VariableDeclarator', mapToRouter('homeRouter', 'HomeRoute')],
      ['CallExpression', oneOfCall(['homeRouter'])],
      ['Program:exit', Testing.program()],
    ])

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('NotFoundRoute')
  })

  it('does not flag a complete union, Router, and registration set', () => {
    const result = Testing.runRuleMulti(routeUnionParserRegistration, [
      ['VariableDeclarator', routeDeclarator('HomeRoute')],
      ['VariableDeclarator', routeDeclarator('UserRoute')],
      ['VariableDeclarator', routeDeclarator('NotFoundRoute')],
      [
        'CallExpression',
        unionCall(['HomeRoute', 'UserRoute', 'NotFoundRoute']),
      ],
      ['VariableDeclarator', mapToRouter('homeRouter', 'HomeRoute')],
      ['VariableDeclarator', mapToRouter('userRouter', 'UserRoute')],
      ['CallExpression', oneOfCall(['homeRouter', 'userRouter'])],
      ['CallExpression', fallbackCall('NotFoundRoute')],
      ['Program:exit', Testing.program()],
    ])

    expect(result).toHaveLength(0)
  })

  it('stays silent without route declarations and oneOf registrations', () => {
    const result = Testing.runRuleMulti(routeUnionParserRegistration, [
      ['CallExpression', unionCall(['HomeRoute'])],
      ['VariableDeclarator', mapToRouter('homeRouter', 'HomeRoute')],
      ['Program:exit', Testing.program()],
    ])

    expect(result).toHaveLength(0)
  })

  it('finds Router mappings inside pipe chains', () => {
    const result = Testing.runRuleMulti(routeUnionParserRegistration, [
      ['VariableDeclarator', routeDeclarator('HomeRoute')],
      ['VariableDeclarator', routeDeclarator('UserRoute')],
      ['VariableDeclarator', routeDeclarator('NotFoundRoute')],
      [
        'CallExpression',
        unionCall(['HomeRoute', 'UserRoute', 'NotFoundRoute']),
      ],
      [
        'VariableDeclarator',
        pipeMapToRouter('homeRouter', 'home', 'HomeRoute'),
      ],
      [
        'VariableDeclarator',
        pipeMapToRouter('userRouter', 'user', 'UserRoute'),
      ],
      ['CallExpression', oneOfCall(['homeRouter', 'userRouter'])],
      ['CallExpression', fallbackCall('NotFoundRoute')],
      ['Program:exit', Testing.program()],
    ])

    expect(result).toHaveLength(0)
  })

  it('matches bare combinator forms and Schema.Union', () => {
    const result = Testing.runRuleMulti(routeUnionParserRegistration, [
      ['VariableDeclarator', routeDeclarator('HomeRoute')],
      ['VariableDeclarator', routeDeclarator('UserRoute')],
      ['VariableDeclarator', routeDeclarator('NotFoundRoute')],
      [
        'CallExpression',
        Testing.callOfMember('Schema', 'Union', [
          arrayExpression([
            Testing.id('HomeRoute'),
            Testing.id('UserRoute'),
            Testing.id('NotFoundRoute'),
          ]),
        ]),
      ],
      [
        'VariableDeclarator',
        Testing.varDeclarator(
          'homeRouter',
          Testing.callExpr('mapTo', [Testing.id('HomeRoute')]),
        ),
      ],
      ['CallExpression', Testing.callExpr('oneOf', [Testing.id('homeRouter')])],
      [
        'CallExpression',
        Testing.callExpr('parseUrlWithFallback', [
          Testing.id('routeParser'),
          Testing.id('NotFoundRoute'),
        ]),
      ],
      ['Program:exit', Testing.program()],
    ])

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('UserRoute')
  })

  it('stays silent when every Router is built through helpers', () => {
    const result = Testing.runRuleMulti(routeUnionParserRegistration, [
      ['VariableDeclarator', routeDeclarator('HomeRoute')],
      ['CallExpression', unionCall(['HomeRoute'])],
      [
        'VariableDeclarator',
        Testing.varDeclarator(
          'page',
          Testing.arrowFn(Testing.callExpr('mapTo', [Testing.id('route')])),
        ),
      ],
      ['CallExpression', oneOfCall(['homeRouter'])],
      ['Program:exit', Testing.program()],
    ])

    expect(result).toHaveLength(0)
  })

  it('ignores helper mappings but still analyzes declared mappings', () => {
    const result = Testing.runRuleMulti(routeUnionParserRegistration, [
      ['VariableDeclarator', routeDeclarator('HomeRoute')],
      ['VariableDeclarator', routeDeclarator('UserRoute')],
      ['CallExpression', unionCall(['HomeRoute', 'UserRoute'])],
      [
        'VariableDeclarator',
        Testing.varDeclarator(
          'page',
          Testing.arrowFn(Testing.callExpr('mapTo', [Testing.id('route')])),
        ),
      ],
      ['VariableDeclarator', mapToRouter('homeRouter', 'HomeRoute')],
      ['CallExpression', oneOfCall(['homeRouter'])],
      ['Program:exit', Testing.program()],
    ])

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('UserRoute')
    expect(result[0]?.diagnostic.message).not.toContain('page')
  })

  it('selects the largest union made entirely of declared routes', () => {
    const result = Testing.runRuleMulti(routeUnionParserRegistration, [
      ['VariableDeclarator', routeDeclarator('HomeRoute')],
      ['VariableDeclarator', routeDeclarator('UserRoute')],
      ['CallExpression', unionCall(['HomeRoute'])],
      ['CallExpression', unionCall(['HomeRoute', 'UserRoute'])],
      ['CallExpression', unionCall(['HomeRoute', 'DocsRoute'])],
      ['VariableDeclarator', mapToRouter('homeRouter', 'HomeRoute')],
      ['CallExpression', oneOfCall(['homeRouter'])],
      ['Program:exit', Testing.program()],
    ])

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('UserRoute')
    expect(result[0]?.diagnostic.message).not.toContain('DocsRoute')
  })

  it('counts registrations from every oneOf call in the file', () => {
    const result = Testing.runRuleMulti(routeUnionParserRegistration, [
      ['VariableDeclarator', routeDeclarator('HomeRoute')],
      ['VariableDeclarator', routeDeclarator('UserRoute')],
      ['VariableDeclarator', routeDeclarator('NotFoundRoute')],
      [
        'CallExpression',
        unionCall(['HomeRoute', 'UserRoute', 'NotFoundRoute']),
      ],
      ['VariableDeclarator', mapToRouter('homeRouter', 'HomeRoute')],
      ['VariableDeclarator', mapToRouter('userRouter', 'UserRoute')],
      ['CallExpression', oneOfCall(['homeRouter'])],
      ['CallExpression', oneOfCall(['userRouter'])],
      ['CallExpression', fallbackCall('NotFoundRoute')],
      ['Program:exit', Testing.program()],
    ])

    expect(result).toHaveLength(0)
  })

  it('reports unparsed members before unregistered Routers', () => {
    const result = Testing.runRuleMulti(routeUnionParserRegistration, [
      ['VariableDeclarator', routeDeclarator('HomeRoute')],
      ['VariableDeclarator', routeDeclarator('UserRoute')],
      ['VariableDeclarator', routeDeclarator('NotFoundRoute')],
      [
        'CallExpression',
        unionCall(['HomeRoute', 'UserRoute', 'NotFoundRoute']),
      ],
      ['VariableDeclarator', mapToRouter('homeRouter', 'HomeRoute')],
      ['VariableDeclarator', mapToRouter('userRouter', 'UserRoute')],
      ['CallExpression', oneOfCall(['homeRouter'])],
      ['Program:exit', Testing.program()],
    ])

    expect(result).toHaveLength(2)
    expect(result[0]?.diagnostic.message).toContain('NotFoundRoute')
    expect(result[1]?.diagnostic.message).toContain('userRouter')
  })

  it('skips non-identifier union elements without disqualifying the union', () => {
    const result = Testing.runRuleMulti(routeUnionParserRegistration, [
      ['VariableDeclarator', routeDeclarator('HomeRoute')],
      ['VariableDeclarator', routeDeclarator('NotFoundRoute')],
      [
        'CallExpression',
        Testing.callOfMember('S', 'Union', [
          arrayExpression([
            Testing.id('HomeRoute'),
            { type: 'SpreadElement', argument: Testing.id('extraRoutes') },
            Testing.id('NotFoundRoute'),
          ]),
        ]),
      ],
      ['VariableDeclarator', mapToRouter('homeRouter', 'HomeRoute')],
      ['CallExpression', oneOfCall(['homeRouter'])],
      ['CallExpression', fallbackCall('NotFoundRoute')],
      ['Program:exit', Testing.program()],
    ])

    expect(result).toHaveLength(0)
  })

  it('finds Router mappings nested inside object initializers', () => {
    const result = Testing.runRuleMulti(routeUnionParserRegistration, [
      ['VariableDeclarator', routeDeclarator('HomeRoute')],
      ['VariableDeclarator', routeDeclarator('NotFoundRoute')],
      ['CallExpression', unionCall(['HomeRoute', 'NotFoundRoute'])],
      [
        'VariableDeclarator',
        Testing.varDeclarator(
          'routers',
          Testing.objectExpr([
            {
              key: 'home',
              value: Testing.callOfMember('Route', 'mapTo', [
                Testing.id('HomeRoute'),
              ]),
            },
          ]),
        ),
      ],
      ['CallExpression', oneOfCall(['otherRouter'])],
      ['CallExpression', fallbackCall('NotFoundRoute')],
      ['Program:exit', Testing.program()],
    ])

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('routers')
    expect(result[0]?.diagnostic.message).toContain('Route.oneOf')
  })
})
