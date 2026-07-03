import * as Testing from 'effect-oxlint/testing'
import { describe, expect, it } from 'vitest'

import rule from '../../src/rules/route-oneof-shadowing-order.ts'

const programExit = ['Program:exit', Testing.program()] as const

const routeMapTo = (routeName: string) =>
  Testing.callOfMember('Route', 'mapTo', [Testing.id(routeName)])

const literal = (segment: string) =>
  Testing.callExpr('literal', [Testing.strLiteral(segment)])

const stringParam = (name: string) =>
  Testing.callExpr('string', [Testing.strLiteral(name)])

const intParam = (name: string) =>
  Testing.callExpr('int', [Testing.strLiteral(name)])

const slash = (segment: unknown) => Testing.callExpr('slash', [segment])

const query = () =>
  Testing.callOfMember('Route', 'query', [Testing.objectExpr([])])

const pipeRouter = (parts: ReadonlyArray<unknown>) =>
  Testing.callExpr('pipe', parts)

const routerDecl = (routerName: string, parts: ReadonlyArray<unknown>) =>
  Testing.varDeclarator(routerName, pipeRouter(parts))

const oneOf = (...routerNames: ReadonlyArray<string>) =>
  Testing.callOfMember(
    'Route',
    'oneOf',
    routerNames.map(routerName => Testing.id(routerName)),
  )

const run = (events: ReadonlyArray<readonly [string, unknown]>) =>
  Testing.runRuleMulti(rule, [...events, programExit])

describe('route-oneof-shadowing-order', () => {
  it('does not flag specific routers before wildcard or prefix routers', () => {
    const result = run([
      [
        'VariableDeclarator',
        routerDecl('newTaskRouter', [
          literal('tasks'),
          slash(literal('new')),
          routeMapTo('NewTaskRoute'),
        ]),
      ],
      [
        'VariableDeclarator',
        routerDecl('taskRouter', [
          literal('tasks'),
          slash(stringParam('id')),
          routeMapTo('TaskRoute'),
        ]),
      ],
      [
        'VariableDeclarator',
        routerDecl('tasksRouter', [literal('tasks'), routeMapTo('TasksRoute')]),
      ],
      ['CallExpression', oneOf('newTaskRouter', 'taskRouter', 'tasksRouter')],
    ])
    expect(result).toHaveLength(0)
  })

  it('flags a wildcard router before a later literal with the same prefix', () => {
    const result = run([
      [
        'VariableDeclarator',
        routerDecl('taskRouter', [
          literal('tasks'),
          slash(stringParam('id')),
          routeMapTo('TaskRoute'),
        ]),
      ],
      [
        'VariableDeclarator',
        routerDecl('taskArchiveRouter', [
          literal('tasks'),
          slash(literal('archive')),
          routeMapTo('TaskArchiveRoute'),
        ]),
      ],
      ['CallExpression', oneOf('taskRouter', 'taskArchiveRouter')],
    ])
    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('taskArchiveRouter')
    expect(result[0]?.diagnostic.message).toContain('taskRouter')
    expect(result[0]?.diagnostic.message).toContain('same path shape')
  })

  it('flags a shorter prefix router before a longer route', () => {
    const result = run([
      [
        'VariableDeclarator',
        routerDecl('tasksRouter', [literal('tasks'), routeMapTo('TasksRoute')]),
      ],
      [
        'VariableDeclarator',
        routerDecl('taskRouter', [
          literal('tasks'),
          slash(stringParam('id')),
          routeMapTo('TaskRoute'),
        ]),
      ],
      ['CallExpression', oneOf('tasksRouter', 'taskRouter')],
    ])
    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('path prefix')
  })

  it('does not let query-guarded earlier routers shadow later path routers', () => {
    const result = run([
      [
        'VariableDeclarator',
        routerDecl('peopleRouter', [
          literal('people'),
          query(),
          routeMapTo('PeopleRoute'),
        ]),
      ],
      [
        'VariableDeclarator',
        routerDecl('personRouter', [
          literal('people'),
          slash(stringParam('personId')),
          routeMapTo('PersonRoute'),
        ]),
      ],
      ['CallExpression', oneOf('peopleRouter', 'personRouter')],
    ])
    expect(result).toHaveLength(0)
  })

  it('treats int parameters as covering numeric literals only', () => {
    const result = run([
      [
        'VariableDeclarator',
        routerDecl('itemNumberRouter', [
          literal('items'),
          slash(intParam('id')),
          routeMapTo('ItemNumberRoute'),
        ]),
      ],
      [
        'VariableDeclarator',
        routerDecl('itemArchiveRouter', [
          literal('items'),
          slash(literal('archive')),
          routeMapTo('ItemArchiveRoute'),
        ]),
      ],
      [
        'VariableDeclarator',
        routerDecl('itemFortyTwoRouter', [
          literal('items'),
          slash(literal('42')),
          routeMapTo('ItemFortyTwoRoute'),
        ]),
      ],
      [
        'CallExpression',
        oneOf('itemNumberRouter', 'itemArchiveRouter', 'itemFortyTwoRouter'),
      ],
    ])
    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('itemFortyTwoRouter')
  })

  it('does not let the root router shadow non-root routes', () => {
    const result = run([
      [
        'VariableDeclarator',
        routerDecl('homeRouter', [Testing.id('root'), routeMapTo('HomeRoute')]),
      ],
      [
        'VariableDeclarator',
        routerDecl('tasksRouter', [literal('tasks'), routeMapTo('TasksRoute')]),
      ],
      ['CallExpression', oneOf('homeRouter', 'tasksRouter')],
    ])
    expect(result).toHaveLength(0)
  })

  it('skips opaque routers whose pipe chain cannot be resolved', () => {
    const result = run([
      [
        'VariableDeclarator',
        Testing.varDeclarator(
          'opaqueRouter',
          Testing.callExpr('makeRouter', []),
        ),
      ],
      [
        'VariableDeclarator',
        routerDecl('taskRouter', [
          literal('tasks'),
          slash(stringParam('id')),
          routeMapTo('TaskRoute'),
        ]),
      ],
      [
        'VariableDeclarator',
        routerDecl('taskArchiveRouter', [
          literal('tasks'),
          slash(literal('archive')),
          routeMapTo('TaskArchiveRoute'),
        ]),
      ],
      ['CallExpression', oneOf('opaqueRouter', 'taskArchiveRouter')],
    ])
    expect(result).toHaveLength(0)
  })
})
