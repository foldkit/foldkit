import * as Testing from 'effect-oxlint/testing'
import { describe, expect, it } from 'vitest'

import { noImpureCallAtDecisionTime } from '../../src/rules/no-impure-call-at-decision-time.ts'

const program = { type: 'Program', parent: null }

const atProgram = <Node extends object>(node: Node): Node =>
  Object.assign(node, { parent: program })

const run = (node: Readonly<{ type: string }>) =>
  Testing.runRule(noImpureCallAtDecisionTime, node.type, node)

const wrapExpression = (expression: Readonly<{ type: string }>) => {
  const asExpression = { type: 'TSAsExpression', expression }
  const satisfiesExpression = {
    type: 'TSSatisfiesExpression',
    expression: asExpression,
  }
  const parenthesizedExpression = {
    type: 'ParenthesizedExpression',
    expression: satisfiesExpression,
  }

  Object.assign(expression, { parent: asExpression })
  Object.assign(asExpression, { parent: satisfiesExpression })
  Object.assign(satisfiesExpression, { parent: parenthesizedExpression })

  return parenthesizedExpression
}

const inDirectCallback = (
  operation: Readonly<{ type: string }>,
  namespace: string,
  method: string,
  isWrapped = false,
) => {
  const callback = Testing.arrowFn(operation)
  const argument = isWrapped ? wrapExpression(callback) : callback
  const boundary = atProgram(
    Testing.callOfMember(namespace, method, [argument]),
  )

  Object.assign(operation, { parent: callback })
  Object.assign(argument, { parent: boundary })

  return operation
}

const inInlineConfig = (
  operation: Readonly<{ type: string }>,
  namespace: string,
  method: string,
  propertyName: string,
  isWrapped = false,
) => {
  const callback = Testing.arrowFn(operation)
  const property = {
    type: 'Property',
    kind: 'init',
    key: Testing.id(propertyName),
    value: callback,
    method: false,
    shorthand: false,
    computed: false,
  }
  const config = {
    type: 'ObjectExpression',
    properties: [property],
  }
  const argument = isWrapped ? wrapExpression(config) : config
  const boundary = atProgram(
    Testing.callOfMember(namespace, method, [
      Testing.strLiteral('Boundary'),
      argument,
    ]),
  )

  Object.assign(operation, { parent: callback })
  Object.assign(callback, { parent: property })
  Object.assign(property, { parent: config })
  Object.assign(argument, { parent: boundary })

  return operation
}

const inTrailingCallback = (
  operation: Readonly<{ type: string }>,
  namespace: string,
  method: string,
) => {
  const body = Testing.arrowFn(Testing.callOfMember('Effect', 'void'))
  const callback = Testing.arrowFn(operation)
  const boundary = atProgram(
    Testing.callOfMember(namespace, method, [body, callback]),
  )

  Object.assign(operation, { parent: callback })
  Object.assign(callback, { parent: boundary })
  Object.assign(body, { parent: boundary })

  return operation
}

const inPositionedCallback = (
  operation: Readonly<{ type: string }>,
  namespace: string,
  method: string,
  before: ReadonlyArray<Readonly<{ type: string }>>,
  after: ReadonlyArray<Readonly<{ type: string }>>,
) => {
  const callback = Testing.arrowFn(operation)
  const boundary = atProgram(
    Testing.callOfMember(namespace, method, [...before, callback, ...after]),
  )

  Object.assign(operation, { parent: callback })
  Object.assign(callback, { parent: boundary })

  return operation
}

const inPositionedObjectCallback = (
  operation: Readonly<{ type: string }>,
  namespace: string,
  method: string,
  propertyName: string,
  before: ReadonlyArray<Readonly<{ type: string }>>,
  after: ReadonlyArray<Readonly<{ type: string }>>,
) => {
  const callback = Testing.arrowFn(operation)
  const property = {
    type: 'Property',
    kind: 'init',
    key: Testing.id(propertyName),
    value: callback,
    method: false,
    shorthand: false,
    computed: false,
  }
  const config = { type: 'ObjectExpression', properties: [property] }
  const boundary = atProgram(
    Testing.callOfMember(namespace, method, [...before, config, ...after]),
  )

  Object.assign(operation, { parent: callback })
  Object.assign(callback, { parent: property })
  Object.assign(property, { parent: config })
  Object.assign(config, { parent: boundary })

  return operation
}

const inToLayerHandler = (
  operation: Readonly<{ type: string }>,
  definitionName: string,
) => {
  const handler = Testing.arrowFn(operation)
  const build = Testing.callOfMember('Effect', 'succeed', [handler])
  const boundary = atProgram(
    Testing.callOfMember(definitionName, 'toLayer', [build]),
  )

  Object.assign(operation, { parent: handler })
  Object.assign(handler, { parent: build })
  Object.assign(build, { parent: boundary })

  return operation
}

const inToLayerLifecycleHandler = (
  operation: Readonly<{ type: string }>,
  propertyName: string,
  isWrapped = false,
) => {
  const handler = Testing.arrowFn(operation)
  const property = {
    type: 'Property',
    kind: 'init',
    key: Testing.id(propertyName),
    value: handler,
    method: false,
    shorthand: false,
    computed: false,
  }
  const lifecycle = { type: 'ObjectExpression', properties: [property] }
  const argument = isWrapped ? wrapExpression(lifecycle) : lifecycle
  const build = Testing.callOfMember('Effect', 'succeed', [argument])
  const boundary = atProgram(
    Testing.callOfMember('sessionResource', 'toLayer', [build]),
  )

  Object.assign(operation, { parent: handler })
  Object.assign(handler, { parent: property })
  Object.assign(property, { parent: lifecycle })
  Object.assign(argument, { parent: build })
  Object.assign(build, { parent: boundary })

  return operation
}

const inAttachedHandler = (
  operation: Readonly<{ type: string }>,
  namespace: string,
  method: string,
  argumentsBefore: ReadonlyArray<unknown>,
  propertyName?: string,
) => {
  const handler = Testing.arrowFn(operation)
  const property = {
    type: 'Property',
    kind: 'init',
    key: Testing.id(propertyName ?? 'acquire'),
    value: handler,
    method: false,
    shorthand: false,
    computed: false,
  }
  const lifecycle = { type: 'ObjectExpression', properties: [property] }
  const value = propertyName === undefined ? handler : lifecycle
  const build = Testing.callOfMember('Effect', 'succeed', [value])
  const definition =
    namespace === 'Subscription' || namespace === 'ManagedResource'
      ? Testing.callExpr('entry', [...argumentsBefore, build])
      : Testing.callOfMember(namespace, method, [...argumentsBefore, build])

  Object.assign(operation, { parent: handler })
  Object.assign(handler, {
    parent: propertyName === undefined ? build : property,
  })
  Object.assign(property, { parent: lifecycle })
  Object.assign(lifecycle, { parent: build })
  Object.assign(build, { parent: definition })

  if (namespace === 'Subscription' || namespace === 'ManagedResource') {
    const builder = Testing.arrowFn(definition, [Testing.id('entry')])
    const make = Testing.callOfMember(namespace, 'make')
    const boundary = atProgram({
      type: 'CallExpression',
      callee: make,
      arguments: [builder],
    })
    Object.assign(definition, { parent: builder })
    Object.assign(builder, { parent: boundary })
    Object.assign(make, { parent: boundary })
  } else {
    atProgram(definition)
  }

  return operation
}

const inNestedLifecycleConfig = (
  operation: Readonly<{ type: string }>,
  namespace: string,
  propertyName: string,
  isWrapped = false,
) => {
  const callback = Testing.arrowFn(operation)
  const property = {
    type: 'Property',
    kind: 'init',
    key: Testing.id(propertyName),
    value: callback,
    method: false,
    shorthand: false,
    computed: false,
  }
  const config = { type: 'ObjectExpression', properties: [property] }
  const argument = isWrapped ? wrapExpression(config) : config
  const entry = Testing.callExpr('entry', [argument])
  const builder = Testing.arrowFn(entry)
  const make = Testing.callOfMember(namespace, 'make')
  const boundary = atProgram({
    type: 'CallExpression',
    callee: make,
    arguments: [builder],
  })

  Object.assign(operation, { parent: callback })
  Object.assign(callback, { parent: property })
  Object.assign(property, { parent: config })
  Object.assign(argument, { parent: entry })
  Object.assign(entry, { parent: builder })
  Object.assign(builder, { parent: boundary })
  Object.assign(make, { parent: boundary })

  return operation
}

describe('no-impure-call-at-decision-time', () => {
  it.each([
    ['Date.now', Testing.callOfMember('Date', 'now')],
    ['Date', Testing.callExpr('Date')],
    ['Math.random', Testing.callOfMember('Math', 'random')],
    ['performance.now', Testing.callOfMember('performance', 'now')],
    ['crypto.randomUUID', Testing.callOfMember('crypto', 'randomUUID')],
    [
      'crypto.getRandomValues',
      Testing.callOfMember('crypto', 'getRandomValues'),
    ],
  ])('flags %s outside a recognized deferred callback', (_name, operation) => {
    const result = run(atProgram(operation))

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain(
      'Assigning it to a local variable or passing it as a Command argument does not defer the call',
    )
  })

  it('flags a zero-argument Date constructor', () => {
    const result = run(atProgram(Testing.newExpr('Date')))

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('new Date()')
  })

  it('recommends the Effect v4 Crypto service for UUIDs', () => {
    const result = run(atProgram(Testing.callOfMember('crypto', 'randomUUID')))

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain(
      "Crypto.Crypto's randomUUIDv4 Effect with a platform Crypto layer",
    )
  })

  it('flags Date called as a function even when it receives arguments', () => {
    const result = run(
      atProgram(Testing.callExpr('Date', [Testing.id('ignored')])),
    )

    expect(result).toHaveLength(1)
  })

  it('allows a Date constructed from a known value', () => {
    const result = run(
      atProgram(Testing.newExpr('Date', [Testing.id('timestamp')])),
    )

    expect(result).toHaveLength(0)
  })

  it('allows direct Effect and Stream callbacks', () => {
    const effectResult = run(
      inDirectCallback(Testing.callOfMember('Date', 'now'), 'Effect', 'sync'),
    )
    const streamResult = run(
      inDirectCallback(Testing.callOfMember('Math', 'random'), 'Stream', 'map'),
    )

    expect(effectResult).toHaveLength(0)
    expect(streamResult).toHaveLength(0)
  })

  it('allows callbacks that Effect and Stream defer', () => {
    const effectResult = run(
      inInlineConfig(
        Testing.callOfMember('Date', 'now'),
        'Effect',
        'match',
        'onSuccess',
      ),
    )
    const streamResult = run(
      inInlineConfig(
        Testing.callOfMember('Math', 'random'),
        'Stream',
        'mapBoth',
        'onElement',
      ),
    )
    const streamErrorResult = run(
      inInlineConfig(
        Testing.callOfMember('Math', 'random'),
        'Stream',
        'mapBoth',
        'onError',
      ),
    )
    const functionBodyResult = run(
      inDirectCallback(Testing.callOfMember('Date', 'now'), 'Effect', 'fn'),
    )

    expect(effectResult).toHaveLength(0)
    expect(streamResult).toHaveLength(0)
    expect(streamErrorResult).toHaveLength(0)
    expect(functionBodyResult).toHaveLength(0)
  })

  it('allows deferred callbacks behind transparent TypeScript wrappers', () => {
    const directResult = run(
      inDirectCallback(
        Testing.callOfMember('Date', 'now'),
        'Effect',
        'sync',
        true,
      ),
    )
    const objectResult = run(
      inInlineConfig(
        Testing.callOfMember('Math', 'random'),
        'Effect',
        'match',
        'onSuccess',
        true,
      ),
    )
    const lifecycleResult = run(
      inToLayerLifecycleHandler(
        Testing.callOfMember('crypto', 'randomUUID'),
        'acquire',
        true,
      ),
    )

    expect(directResult).toHaveLength(0)
    expect(objectResult).toHaveLength(0)
    expect(lifecycleResult).toHaveLength(0)
  })

  it('flags synchronous callbacks passed to Effect APIs', () => {
    const eagerDirectResult = run(
      inDirectCallback(
        Testing.callOfMember('Date', 'now'),
        'Effect',
        'mapEager',
      ),
    )
    const eagerObjectResult = run(
      inInlineConfig(
        Testing.callOfMember('Math', 'random'),
        'Effect',
        'matchEager',
        'onSuccess',
      ),
    )
    const functionTransformResult = run(
      inTrailingCallback(Testing.callOfMember('Date', 'now'), 'Effect', 'fn'),
    )
    const runCallbackResult = run(
      inInlineConfig(
        Testing.callOfMember('Math', 'random'),
        'Effect',
        'runCallback',
        'onExit',
      ),
    )
    const fromOptionResult = run(
      inTrailingCallback(
        Testing.callOfMember('Date', 'now'),
        'Effect',
        'fromOption',
      ),
    )
    const functionValueResult = run(
      inDirectCallback(
        Testing.callOfMember('Math', 'random'),
        'Effect',
        'succeed',
      ),
    )

    expect(eagerDirectResult).toHaveLength(1)
    expect(eagerObjectResult).toHaveLength(1)
    expect(functionTransformResult).toHaveLength(1)
    expect(runCallbackResult).toHaveLength(1)
    expect(fromOptionResult).toHaveLength(1)
    expect(functionValueResult).toHaveLength(1)
  })

  it('matches deferred direct callbacks by arity and argument position', () => {
    const iterateNextResult = run(
      inPositionedCallback(
        Testing.callOfMember('Date', 'now'),
        'Stream',
        'iterate',
        [Testing.id('seed')],
        [],
      ),
    )
    const iterateSeedResult = run(
      inPositionedCallback(
        Testing.callOfMember('Math', 'random'),
        'Stream',
        'iterate',
        [],
        [Testing.arrowFn(Testing.id('current'))],
      ),
    )
    const scanReducerResult = run(
      inPositionedCallback(
        Testing.callOfMember('Date', 'now'),
        'Stream',
        'scan',
        [Testing.id('stream'), Testing.id('initial')],
        [],
      ),
    )
    const scanInitialResult = run(
      inPositionedCallback(
        Testing.callOfMember('Date', 'now'),
        'Stream',
        'scan',
        [Testing.id('stream')],
        [Testing.arrowFn(Testing.id('state'))],
      ),
    )

    expect(iterateNextResult).toHaveLength(0)
    expect(iterateSeedResult).toHaveLength(1)
    expect(scanReducerResult).toHaveLength(0)
    expect(scanInitialResult).toHaveLength(1)
  })

  it('matches deferred object callbacks by arity, position, and property', () => {
    const repeatConditionResult = run(
      inPositionedObjectCallback(
        Testing.callOfMember('Date', 'now'),
        'Effect',
        'repeat',
        'while',
        [Testing.id('effect')],
        [],
      ),
    )
    const repeatScheduleResult = run(
      inPositionedObjectCallback(
        Testing.callOfMember('Math', 'random'),
        'Effect',
        'repeat',
        'schedule',
        [Testing.id('effect')],
        [],
      ),
    )
    const genSelfResult = run(
      inPositionedObjectCallback(
        Testing.callOfMember('Math', 'random'),
        'Effect',
        'gen',
        'self',
        [],
        [Testing.arrowFn(Testing.id('body'))],
      ),
    )
    const executionPlanEventResult = run(
      inPositionedObjectCallback(
        Testing.callOfMember('Date', 'now'),
        'Effect',
        'withExecutionPlan',
        'onEvent',
        [Testing.id('effect'), Testing.id('plan')],
        [],
      ),
    )

    expect(repeatConditionResult).toHaveLength(0)
    expect(repeatScheduleResult).toHaveLength(1)
    expect(genSelfResult).toHaveLength(1)
    expect(executionPlanEventResult).toHaveLength(0)
  })

  it('covers optional and data-first callback overloads', () => {
    const filterResult = run(
      inPositionedCallback(
        Testing.callOfMember('Date', 'now'),
        'Effect',
        'filterOrFail',
        [],
        [],
      ),
    )
    const releaseResult = run(
      inPositionedCallback(
        Testing.callOfMember('Date', 'now'),
        'Effect',
        'acquireRelease',
        [Testing.id('acquire')],
        [Testing.id('options')],
      ),
    )
    const combineStateResult = run(
      inPositionedCallback(
        Testing.callOfMember('Math', 'random'),
        'Stream',
        'combine',
        [Testing.id('left'), Testing.id('right')],
        [Testing.arrowFn(Testing.id('combined'))],
      ),
    )
    const groupByResult = run(
      inPositionedCallback(
        Testing.callOfMember('Date', 'now'),
        'Stream',
        'groupBy',
        [Testing.id('stream')],
        [Testing.id('options')],
      ),
    )
    const onHaltResult = run(
      inPositionedObjectCallback(
        Testing.callOfMember('Date', 'now'),
        'Stream',
        'mapAccum',
        'onHalt',
        [
          Testing.id('stream'),
          Testing.arrowFn(Testing.id('initial')),
          Testing.arrowFn(Testing.id('reducer')),
        ],
        [],
      ),
    )

    expect(filterResult).toHaveLength(0)
    expect(releaseResult).toHaveLength(0)
    expect(combineStateResult).toHaveLength(0)
    expect(groupByResult).toHaveLength(0)
    expect(onHaltResult).toHaveLength(0)
  })

  it('allows handlers returned by Effect constructors passed to toLayer', () => {
    const commandResult = run(
      inToLayerHandler(
        Testing.callOfMember('crypto', 'randomUUID'),
        'ReadClock',
      ),
    )
    const subscriptionResult = run(
      inToLayerHandler(
        Testing.callOfMember('performance', 'now'),
        'clockSubscription',
      ),
    )

    expect(commandResult).toHaveLength(0)
    expect(subscriptionResult).toHaveLength(0)
  })

  it.each([
    [
      'Command',
      'define',
      [Testing.strLiteral('ReadClock'), Testing.id('config')],
    ],
    [
      'Mount',
      'define',
      [Testing.strLiteral('MeasurePanel'), Testing.id('config')],
    ],
    [
      'Mount',
      'defineStream',
      [Testing.strLiteral('PanelSizes'), Testing.id('config')],
    ],
    ['Query', 'define', [Testing.id('config')]],
    [
      'Subscription',
      'entry',
      [Testing.strLiteral('ClockTicks'), Testing.id('config')],
    ],
    [
      'Subscription',
      'entry',
      [
        Testing.strLiteral('ClockTicks'),
        Testing.id('fields'),
        Testing.id('config'),
      ],
    ],
  ])(
    'allows an attached %s.%s invocation handler',
    (namespace, method, before) => {
      expect(
        run(
          inAttachedHandler(
            Testing.callOfMember('Date', 'now'),
            namespace,
            method,
            before,
          ),
        ),
      ).toHaveLength(0)
    },
  )

  it.each(['acquire', 'release'])(
    'allows attached ManagedResource %s handlers',
    propertyName => {
      expect(
        run(
          inAttachedHandler(
            Testing.callOfMember('Date', 'now'),
            'ManagedResource',
            'entry',
            [
              Testing.strLiteral('Session'),
              Testing.id('schema'),
              Testing.id('config'),
            ],
            propertyName,
          ),
        ),
      ).toHaveLength(0)
    },
  )

  it('checks arbitrary constructors and eager attached argument expressions', () => {
    const arbitrary = inAttachedHandler(
      Testing.callOfMember('Date', 'now'),
      'Other',
      'define',
      [Testing.strLiteral('ReadClock'), Testing.id('config')],
    )
    const operation = Testing.callOfMember('Math', 'random')
    const build = Testing.callOfMember('Effect', 'succeed', [operation])
    const definition = atProgram(
      Testing.callOfMember('Command', 'define', [
        Testing.strLiteral('ReadClock'),
        Testing.id('config'),
        build,
      ]),
    )
    Object.assign(operation, { parent: build })
    Object.assign(build, { parent: definition })

    expect(run(arbitrary)).toHaveLength(1)
    expect(run(operation)).toHaveLength(1)
  })

  it('allows lifecycle handlers on an object returned by an Effect constructor', () => {
    const acquireResult = run(
      inToLayerLifecycleHandler(
        Testing.callOfMember('crypto', 'randomUUID'),
        'acquire',
      ),
    )
    const releaseResult = run(
      inToLayerLifecycleHandler(
        Testing.callOfMember('performance', 'now'),
        'release',
      ),
    )

    expect(acquireResult).toHaveLength(0)
    expect(releaseResult).toHaveLength(0)
  })

  it('does not treat eager toLayer arguments or unrelated callbacks as handlers', () => {
    const eagerOperation = Testing.callOfMember('Date', 'now')
    const eagerBuild = Testing.callOfMember('Effect', 'succeed', [
      eagerOperation,
    ])
    const eagerBoundary = atProgram(
      Testing.callOfMember('ReadClock', 'toLayer', [eagerBuild]),
    )
    Object.assign(eagerOperation, { parent: eagerBuild })
    Object.assign(eagerBuild, { parent: eagerBoundary })

    const nestedOperation = Testing.callOfMember('Math', 'random')
    const nestedCallback = Testing.arrowFn(nestedOperation)
    const wrapper = Testing.callExpr('wrapHandler', [nestedCallback])
    const wrappedBuild = Testing.callOfMember('Effect', 'succeed', [wrapper])
    const wrappedBoundary = atProgram(
      Testing.callOfMember('ReadClock', 'toLayer', [wrappedBuild]),
    )
    Object.assign(nestedOperation, { parent: nestedCallback })
    Object.assign(nestedCallback, { parent: wrapper })
    Object.assign(wrapper, { parent: wrappedBuild })
    Object.assign(wrappedBuild, { parent: wrappedBoundary })

    const misplacedResult = run(
      inPositionedCallback(
        Testing.callOfMember('performance', 'now'),
        'ReadClock',
        'toLayer',
        [Testing.id('options')],
        [],
      ),
    )
    const unrelatedPropertyResult = run(
      inToLayerLifecycleHandler(
        Testing.callOfMember('crypto', 'randomUUID'),
        'build',
      ),
    )

    expect(run(eagerOperation)).toHaveLength(1)
    expect(run(nestedOperation)).toHaveLength(1)
    expect(misplacedResult).toHaveLength(1)
    expect(unrelatedPropertyResult).toHaveLength(1)
  })

  it('does not treat declaration projection callbacks as execution boundaries', () => {
    const dependencyResult = run(
      inNestedLifecycleConfig(
        Testing.callOfMember('Date', 'now'),
        'Subscription',
        'modelToDependencies',
      ),
    )

    expect(dependencyResult).toHaveLength(1)
  })
})
