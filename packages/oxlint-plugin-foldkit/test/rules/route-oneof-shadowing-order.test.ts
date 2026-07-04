import * as Testing from 'effect-oxlint/testing'
import { describe, expect, it } from 'vitest'

import { routeOneOfShadowingOrder } from '../../src/rules/route-oneof-shadowing-order.ts'

const literalCall = (value: string) =>
  Testing.callExpr('literal', [Testing.strLiteral(value)])

const stringCall = (name: string) =>
  Testing.callExpr('string', [Testing.strLiteral(name)])

const intCall = (name: string) =>
  Testing.callExpr('int', [Testing.strLiteral(name)])

const restCall = (name: string) =>
  Testing.callExpr('rest', [Testing.strLiteral(name)])

const slashCall = (segment: unknown) => Testing.callExpr('slash', [segment])

const mapToCall = (routeName: string) =>
  Testing.callOfMember('Route', 'mapTo', [Testing.id(routeName)])

const queryCall = () =>
  Testing.callOfMember('Route', 'query', [Testing.objectExpr([])])

const pipeRouter = (
  routerName: string,
  pipeArguments: ReadonlyArray<unknown>,
) => Testing.varDeclarator(routerName, Testing.callExpr('pipe', pipeArguments))

const oneOfCall = (routerNames: ReadonlyArray<string>) =>
  Testing.callOfMember('Route', 'oneOf', routerNames.map(Testing.id))

describe('route-oneof-shadowing-order', () => {
  it('flags a wildcard Router before a same-length literal Router', () => {
    const result = Testing.runRuleMulti(routeOneOfShadowingOrder, [
      [
        'VariableDeclarator',
        pipeRouter('taskRouter', [
          literalCall('tasks'),
          slashCall(stringCall('id')),
          mapToCall('TaskRoute'),
        ]),
      ],
      [
        'VariableDeclarator',
        pipeRouter('taskArchiveRouter', [
          literalCall('tasks'),
          slashCall(literalCall('archive')),
          mapToCall('TaskArchiveRoute'),
        ]),
      ],
      ['CallExpression', oneOfCall(['taskRouter', 'taskArchiveRouter'])],
      ['Program:exit', Testing.program()],
    ])

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('taskArchiveRouter')
    expect(result[0]?.diagnostic.message).toContain('taskRouter')
    expect(result[0]?.diagnostic.message).toContain('same path shape')
  })

  it('does not flag a shorter Router before a longer Router', () => {
    const result = Testing.runRuleMulti(routeOneOfShadowingOrder, [
      [
        'VariableDeclarator',
        pipeRouter('tasksRouter', [
          literalCall('tasks'),
          mapToCall('TasksRoute'),
        ]),
      ],
      [
        'VariableDeclarator',
        pipeRouter('taskRouter', [
          literalCall('tasks'),
          slashCall(stringCall('id')),
          mapToCall('TaskRoute'),
        ]),
      ],
      ['CallExpression', oneOfCall(['tasksRouter', 'taskRouter'])],
      ['Program:exit', Testing.program()],
    ])

    expect(result).toHaveLength(0)
  })

  it('flags only numeric literals behind an int parameter', () => {
    const result = Testing.runRuleMulti(routeOneOfShadowingOrder, [
      [
        'VariableDeclarator',
        pipeRouter('itemNumberRouter', [
          literalCall('items'),
          slashCall(intCall('id')),
          mapToCall('ItemNumberRoute'),
        ]),
      ],
      [
        'VariableDeclarator',
        pipeRouter('itemArchiveRouter', [
          literalCall('items'),
          slashCall(literalCall('archive')),
          mapToCall('ItemArchiveRoute'),
        ]),
      ],
      [
        'VariableDeclarator',
        pipeRouter('itemFortyTwoRouter', [
          literalCall('items'),
          slashCall(literalCall('42')),
          mapToCall('ItemFortyTwoRoute'),
        ]),
      ],
      [
        'CallExpression',
        oneOfCall([
          'itemNumberRouter',
          'itemArchiveRouter',
          'itemFortyTwoRouter',
        ]),
      ],
      ['Program:exit', Testing.program()],
    ])

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('itemFortyTwoRouter')
    expect(result[0]?.diagnostic.message).toContain('itemNumberRouter')
  })

  it('does not flag a zero-padded literal behind an int parameter', () => {
    const result = Testing.runRuleMulti(routeOneOfShadowingOrder, [
      [
        'VariableDeclarator',
        pipeRouter('itemNumberRouter', [
          literalCall('items'),
          slashCall(intCall('id')),
          mapToCall('ItemNumberRoute'),
        ]),
      ],
      [
        'VariableDeclarator',
        pipeRouter('itemZeroPaddedRouter', [
          literalCall('items'),
          slashCall(literalCall('042')),
          mapToCall('ItemZeroPaddedRoute'),
        ]),
      ],
      [
        'CallExpression',
        oneOfCall(['itemNumberRouter', 'itemZeroPaddedRouter']),
      ],
      ['Program:exit', Testing.program()],
    ])

    expect(result).toHaveLength(0)
  })

  it('does not flag specific-first ordering', () => {
    const result = Testing.runRuleMulti(routeOneOfShadowingOrder, [
      [
        'VariableDeclarator',
        pipeRouter('newTaskRouter', [
          literalCall('tasks'),
          slashCall(literalCall('new')),
          mapToCall('NewTaskRoute'),
        ]),
      ],
      [
        'VariableDeclarator',
        pipeRouter('taskRouter', [
          literalCall('tasks'),
          slashCall(stringCall('id')),
          mapToCall('TaskRoute'),
        ]),
      ],
      [
        'VariableDeclarator',
        pipeRouter('tasksRouter', [
          literalCall('tasks'),
          mapToCall('TasksRoute'),
        ]),
      ],
      [
        'CallExpression',
        oneOfCall(['newTaskRouter', 'taskRouter', 'tasksRouter']),
      ],
      ['Program:exit', Testing.program()],
    ])

    expect(result).toHaveLength(0)
  })

  it('does not treat a query-guarded Router as shadowing', () => {
    const result = Testing.runRuleMulti(routeOneOfShadowingOrder, [
      [
        'VariableDeclarator',
        pipeRouter('peopleRouter', [
          literalCall('people'),
          queryCall(),
          mapToCall('PeopleRoute'),
        ]),
      ],
      [
        'VariableDeclarator',
        pipeRouter('personRouter', [
          literalCall('people'),
          slashCall(stringCall('personId')),
          mapToCall('PersonRoute'),
        ]),
      ],
      ['CallExpression', oneOfCall(['peopleRouter', 'personRouter'])],
      ['Program:exit', Testing.program()],
    ])

    expect(result).toHaveLength(0)
  })

  it('flags a query-guarded Router shadowed by an earlier plain Router', () => {
    const result = Testing.runRuleMulti(routeOneOfShadowingOrder, [
      [
        'VariableDeclarator',
        pipeRouter('peopleRouter', [
          literalCall('people'),
          mapToCall('PeopleRoute'),
        ]),
      ],
      [
        'VariableDeclarator',
        pipeRouter('peopleSearchRouter', [
          literalCall('people'),
          queryCall(),
          mapToCall('PeopleSearchRoute'),
        ]),
      ],
      ['CallExpression', oneOfCall(['peopleRouter', 'peopleSearchRouter'])],
      ['Program:exit', Testing.program()],
    ])

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('peopleSearchRouter')
    expect(result[0]?.diagnostic.message).toContain('peopleRouter')
  })

  it('does not treat a root Router as shadowing non-root Routers', () => {
    const result = Testing.runRuleMulti(routeOneOfShadowingOrder, [
      [
        'VariableDeclarator',
        pipeRouter('homeRouter', [Testing.id('root'), mapToCall('HomeRoute')]),
      ],
      [
        'VariableDeclarator',
        pipeRouter('tasksRouter', [
          literalCall('tasks'),
          mapToCall('TasksRoute'),
        ]),
      ],
      ['CallExpression', oneOfCall(['homeRouter', 'tasksRouter'])],
      ['Program:exit', Testing.program()],
    ])

    expect(result).toHaveLength(0)
  })

  it('flags a duplicate root Router across seed spellings', () => {
    const result = Testing.runRuleMulti(routeOneOfShadowingOrder, [
      [
        'VariableDeclarator',
        pipeRouter('homeRouter', [
          Testing.memberExpr('Route', 'root'),
          mapToCall('HomeRoute'),
        ]),
      ],
      [
        'VariableDeclarator',
        pipeRouter('landingRouter', [
          Testing.id('root'),
          Testing.callExpr('mapTo', [Testing.id('LandingRoute')]),
        ]),
      ],
      ['CallExpression', oneOfCall(['homeRouter', 'landingRouter'])],
      ['Program:exit', Testing.program()],
    ])

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('landingRouter')
    expect(result[0]?.diagnostic.message).toContain('homeRouter')
    expect(result[0]?.diagnostic.message).toContain('same path shape')
  })

  it('skips opaque Routers instead of treating them as shadowing', () => {
    const result = Testing.runRuleMulti(routeOneOfShadowingOrder, [
      [
        'VariableDeclarator',
        Testing.varDeclarator('opaqueRouter', Testing.callExpr('makeRouter')),
      ],
      [
        'VariableDeclarator',
        pipeRouter('taskRouter', [
          literalCall('tasks'),
          slashCall(stringCall('id')),
          mapToCall('TaskRoute'),
        ]),
      ],
      [
        'VariableDeclarator',
        pipeRouter('taskArchiveRouter', [
          literalCall('tasks'),
          slashCall(literalCall('archive')),
          mapToCall('TaskArchiveRoute'),
        ]),
      ],
      ['CallExpression', oneOfCall(['opaqueRouter', 'taskArchiveRouter'])],
      ['Program:exit', Testing.program()],
    ])

    expect(result).toHaveLength(0)
  })

  it('treats a schemaSegment Router as opaque', () => {
    const result = Testing.runRuleMulti(routeOneOfShadowingOrder, [
      [
        'VariableDeclarator',
        pipeRouter('userRouter', [
          literalCall('users'),
          slashCall(
            Testing.callExpr('schemaSegment', [
              Testing.strLiteral('userId'),
              Testing.id('UserId'),
            ]),
          ),
          mapToCall('UserRoute'),
        ]),
      ],
      [
        'VariableDeclarator',
        pipeRouter('currentUserRouter', [
          literalCall('users'),
          slashCall(literalCall('me')),
          mapToCall('CurrentUserRoute'),
        ]),
      ],
      ['CallExpression', oneOfCall(['userRouter', 'currentUserRouter'])],
      ['Program:exit', Testing.program()],
    ])

    expect(result).toHaveLength(0)
  })

  it('flags a Router hidden behind an earlier rest Router', () => {
    const result = Testing.runRuleMulti(routeOneOfShadowingOrder, [
      [
        'VariableDeclarator',
        pipeRouter('filesRestRouter', [
          literalCall('files'),
          slashCall(restCall('path')),
          mapToCall('FilesRoute'),
        ]),
      ],
      [
        'VariableDeclarator',
        pipeRouter('fileSpecialRouter', [
          literalCall('files'),
          slashCall(literalCall('special')),
          mapToCall('FileSpecialRoute'),
        ]),
      ],
      ['CallExpression', oneOfCall(['filesRestRouter', 'fileSpecialRouter'])],
      ['Program:exit', Testing.program()],
    ])

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('fileSpecialRouter')
    expect(result[0]?.diagnostic.message).toContain('filesRestRouter')
    expect(result[0]?.diagnostic.message).toContain('path prefix')
  })

  it('does not treat a rest Router as matching its bare prefix', () => {
    const result = Testing.runRuleMulti(routeOneOfShadowingOrder, [
      [
        'VariableDeclarator',
        pipeRouter('filesRestRouter', [
          literalCall('files'),
          slashCall(restCall('path')),
          mapToCall('FilesRoute'),
        ]),
      ],
      [
        'VariableDeclarator',
        pipeRouter('filesIndexRouter', [
          literalCall('files'),
          mapToCall('FilesIndexRoute'),
        ]),
      ],
      ['CallExpression', oneOfCall(['filesRestRouter', 'filesIndexRouter'])],
      ['Program:exit', Testing.program()],
    ])

    expect(result).toHaveLength(0)
  })

  it('flags non-root Routers behind a rest seed but spares the root Router', () => {
    const result = Testing.runRuleMulti(routeOneOfShadowingOrder, [
      [
        'VariableDeclarator',
        pipeRouter('catchAllRouter', [
          restCall('path'),
          mapToCall('CatchAllRoute'),
        ]),
      ],
      [
        'VariableDeclarator',
        pipeRouter('homeRouter', [Testing.id('root'), mapToCall('HomeRoute')]),
      ],
      [
        'VariableDeclarator',
        pipeRouter('tasksRouter', [
          literalCall('tasks'),
          mapToCall('TasksRoute'),
        ]),
      ],
      [
        'CallExpression',
        oneOfCall(['catchAllRouter', 'homeRouter', 'tasksRouter']),
      ],
      ['Program:exit', Testing.program()],
    ])

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('tasksRouter')
    expect(result[0]?.diagnostic.message).toContain('catchAllRouter')
  })

  it('matches bare combinator forms', () => {
    const result = Testing.runRuleMulti(routeOneOfShadowingOrder, [
      [
        'VariableDeclarator',
        pipeRouter('tasksRouter', [
          literalCall('tasks'),
          Testing.callExpr('mapTo', [Testing.id('TasksRoute')]),
        ]),
      ],
      [
        'VariableDeclarator',
        pipeRouter('duplicateTasksRouter', [
          Testing.callOfMember('Route', 'literal', [
            Testing.strLiteral('tasks'),
          ]),
          Testing.callOfMember('Route', 'mapTo', [
            Testing.id('DuplicateTasksRoute'),
          ]),
        ]),
      ],
      [
        'CallExpression',
        Testing.callExpr('oneOf', [
          Testing.id('tasksRouter'),
          Testing.id('duplicateTasksRouter'),
        ]),
      ],
      ['Program:exit', Testing.program()],
    ])

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('duplicateTasksRouter')
    expect(result[0]?.diagnostic.message).toContain('tasksRouter')
    expect(result[0]?.diagnostic.message).toContain('same path shape')
  })

  it('analyzes each oneOf call independently', () => {
    const result = Testing.runRuleMulti(routeOneOfShadowingOrder, [
      [
        'VariableDeclarator',
        pipeRouter('taskRouter', [
          literalCall('tasks'),
          slashCall(stringCall('id')),
          mapToCall('TaskRoute'),
        ]),
      ],
      [
        'VariableDeclarator',
        pipeRouter('taskArchiveRouter', [
          literalCall('tasks'),
          slashCall(literalCall('archive')),
          mapToCall('TaskArchiveRoute'),
        ]),
      ],
      ['CallExpression', oneOfCall(['taskRouter'])],
      ['CallExpression', oneOfCall(['taskArchiveRouter'])],
      ['Program:exit', Testing.program()],
    ])

    expect(result).toHaveLength(0)
  })
})
