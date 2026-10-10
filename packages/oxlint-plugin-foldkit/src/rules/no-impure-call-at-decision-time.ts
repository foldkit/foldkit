import { Array, Effect, Option, pipe } from 'effect'
import {
  Diagnostic,
  type ESTree,
  type OxlintScope,
  type Reference,
  Rule,
  RuleContext,
  type Variable,
} from 'effect-oxlint'

import {
  effectConstructorValue,
  generatorConstructorValue,
  resolveLocalValue,
} from '../effect-constructor.ts'
import {
  indexReferences,
  isIdentifier,
  isIdentifierReference,
  isMemberExpression,
  isObjectExpression,
  isObjectProperty,
  isVariableDeclarator,
  isUnshadowedReference,
  resolveImportedPath,
  resolvedVariable,
  staticMemberName,
  staticPropertyName,
} from '../guards.ts'

type StaticPath = Readonly<{
  root: ESTree.IdentifierReference
  members: ReadonlyArray<string>
}>

type ImportedPath = Readonly<{
  source: string
  members: ReadonlyArray<string>
}>

type ImpureOperation = Readonly<{
  display: string
  guidance: string
}>

const globalContainers = new Set(['globalThis', 'self', 'window'])

const impureCallByPath = new Map<string, ImpureOperation>([
  [
    'Date',
    {
      display: 'Date()',
      guidance:
        'Use Clock.currentTimeMillis and construct the Date from that value.',
    },
  ],
  [
    'Date.now',
    {
      display: 'Date.now()',
      guidance: 'Use Clock.currentTimeMillis.',
    },
  ],
  [
    'Math.random',
    {
      display: 'Math.random()',
      guidance: 'Use Random.',
    },
  ],
  [
    'performance.now',
    {
      display: 'performance.now()',
      guidance: 'Use Clock.',
    },
  ],
  [
    'crypto.randomUUID',
    {
      display: 'crypto.randomUUID()',
      guidance:
        "Use Crypto.Crypto's randomUUIDv4 Effect with a platform Crypto layer.",
    },
  ],
  [
    'crypto.getRandomValues',
    {
      display: 'crypto.getRandomValues()',
      guidance: 'Use Random or Crypto.Crypto with a platform Crypto layer.',
    },
  ],
])

const newDateOperation: ImpureOperation = {
  display: 'new Date()',
  guidance:
    'Use Clock.currentTimeMillis and construct the Date from that value.',
}

const isFunction = (
  node: unknown,
): node is ESTree.ArrowFunctionExpression | ESTree.Function =>
  typeof node === 'object' &&
  node !== null &&
  'type' in node &&
  (node.type === 'ArrowFunctionExpression' ||
    node.type === 'FunctionExpression' ||
    node.type === 'FunctionDeclaration')

type TransparentExpression =
  | ESTree.ChainExpression
  | ESTree.ParenthesizedExpression
  | ESTree.TSAsExpression
  | ESTree.TSInstantiationExpression
  | ESTree.TSNonNullExpression
  | ESTree.TSSatisfiesExpression
  | ESTree.TSTypeAssertion

const isTransparentExpression = (
  node: unknown,
): node is TransparentExpression => {
  if (typeof node !== 'object' || node === null || !('type' in node)) {
    return false
  }

  return (
    node.type === 'ChainExpression' ||
    node.type === 'ParenthesizedExpression' ||
    node.type === 'TSAsExpression' ||
    node.type === 'TSInstantiationExpression' ||
    node.type === 'TSNonNullExpression' ||
    node.type === 'TSSatisfiesExpression' ||
    node.type === 'TSTypeAssertion'
  )
}

const innermostExpression = (node: unknown): unknown =>
  isTransparentExpression(node) ? innermostExpression(node.expression) : node

const outermostExpression = (node: ESTree.Node): ESTree.Node => {
  const parent = node.parent
  return isTransparentExpression(parent) && parent.expression === node
    ? outermostExpression(parent)
    : node
}

const staticPath = (node: unknown): Option.Option<StaticPath> => {
  const expression = innermostExpression(node)
  if (isIdentifierReference(expression)) {
    return Option.some({ root: expression, members: [] })
  }
  if (!isMemberExpression(expression)) {
    return Option.none()
  }

  return Option.flatMap(staticPath(expression.object), path =>
    Option.map(staticMemberName(expression), member => ({
      root: path.root,
      members: [...path.members, member],
    })),
  )
}

const globalPathKey = (
  references: WeakMap<ESTree.Node, Reference> | undefined,
  node: unknown,
): Option.Option<string> =>
  Option.flatMap(staticPath(node), path => {
    if (!isUnshadowedReference(references, path.root)) {
      return Option.none()
    }

    const members = globalContainers.has(path.root.name)
      ? path.members
      : [path.root.name, ...path.members]
    return Option.some(members.join('.'))
  })

const importedPath = (
  references: WeakMap<ESTree.Node, Reference> | undefined,
  node: unknown,
): Option.Option<ImportedPath> =>
  references === undefined
    ? Option.map(staticPath(node), path => ({
        source: '',
        members: [path.root.name, ...path.members],
      }))
    : Option.map(resolveImportedPath(references, node), path => ({
        source: path.source,
        members: path.members,
      }))

const normalizedApiPath = (
  path: ImportedPath,
): Option.Option<ReadonlyArray<string>> => {
  if (
    path.source === '' ||
    path.source === 'effect' ||
    path.source === 'foldkit'
  ) {
    return Option.some(path.members)
  }
  if (path.source === 'effect/Effect') {
    return Option.some(['Effect', ...path.members])
  }
  if (path.source === 'effect/Stream') {
    return Option.some(['Stream', ...path.members])
  }
  if (path.source === 'foldkit/command') {
    return Option.some(['Command', ...path.members])
  }
  if (path.source === 'foldkit/managedResource') {
    return Option.some(['ManagedResource', ...path.members])
  }
  if (path.source === 'foldkit/mount') {
    return Option.some(['Mount', ...path.members])
  }
  if (path.source === 'foldkit/experimental/query') {
    return Option.some(['Query', ...path.members])
  }
  if (path.source === 'foldkit/subscription') {
    return Option.some(['Subscription', ...path.members])
  }
  return Option.none()
}

const headCall = (node: ESTree.CallExpression): ESTree.CallExpression =>
  node.callee.type === 'CallExpression' ? headCall(node.callee) : node

const apiCallKey = (
  references: WeakMap<ESTree.Node, Reference> | undefined,
  node: ESTree.CallExpression,
): Option.Option<string> =>
  Option.flatMap(importedPath(references, headCall(node).callee), path =>
    Option.map(normalizedApiPath(path), members => members.join('.')),
  )

type EnclosingCallArgument = Readonly<{
  call: ESTree.CallExpression
  argument: ESTree.Node
}>

const enclosingCallArgument = (
  node: ESTree.Node,
): Option.Option<EnclosingCallArgument> => {
  const argument = outermostExpression(node)
  const parent = argument.parent
  return parent?.type === 'CallExpression' &&
    parent.arguments.some(candidate => candidate === argument)
    ? Option.some({ call: parent, argument })
    : Option.none()
}

const enclosingPropertyValue = (
  node: ESTree.Node,
): Option.Option<ESTree.ObjectProperty> => {
  const value = outermostExpression(node)
  const parent = value.parent
  return isObjectProperty(parent) && parent.value === value
    ? Option.some(parent)
    : Option.none()
}

const effectFunctionFactories = new Set(['Effect.fn', 'Effect.fnUntraced'])

type ArgumentPositions = Readonly<[number, ...Array<number>]>

type PropertyPositions = Readonly<[number, number, ...Array<string>]>

type DeferredPropertyNames = true | ReadonlySet<string>

type DeferredCallbackMetadata = Readonly<{
  direct?: ReadonlyMap<number, ReadonlySet<number>>
  properties?: ReadonlyMap<number, ReadonlyMap<number, DeferredPropertyNames>>
}>

const directByArity = (
  ...entries: ReadonlyArray<ArgumentPositions>
): ReadonlyMap<number, ReadonlySet<number>> =>
  new Map(
    entries.map(([arity, ...argumentIndices]) => [
      arity,
      new Set(argumentIndices),
    ]),
  )

const propertiesByArity = (
  ...entries: ReadonlyArray<PropertyPositions>
): ReadonlyMap<number, ReadonlyMap<number, DeferredPropertyNames>> => {
  const properties = new Map<number, Map<number, DeferredPropertyNames>>()

  for (const [arity, argumentIndex, ...propertyNames] of entries) {
    const byArgument = properties.get(arity) ?? new Map()
    byArgument.set(
      argumentIndex,
      Array.isArrayEmpty(propertyNames) ? true : new Set(propertyNames),
    )
    properties.set(arity, byArgument)
  }

  return properties
}

const direct = (
  ...entries: ReadonlyArray<ArgumentPositions>
): DeferredCallbackMetadata => ({ direct: directByArity(...entries) })

const properties = (
  ...entries: ReadonlyArray<PropertyPositions>
): DeferredCallbackMetadata => ({
  properties: propertiesByArity(...entries),
})

const unaryCallback = direct([1, 0])
const unaryDualCallback = direct([1, 0], [2, 1])
const unaryDualCallbackWithOptions = direct([1, 0], [2, 0, 1], [3, 1])
const binaryDualCallback = direct([2, 1], [3, 2])
const binaryDualCallbackWithOptions = direct([2, 1], [3, 1, 2], [4, 2])

const successAndFailureProperties = properties(
  [1, 0, 'onFailure', 'onSuccess'],
  [2, 1, 'onFailure', 'onSuccess'],
)

const taggedCallback = direct([2, 1], [3, 1, 2], [4, 2, 3])

const taggedCallbackMap: DeferredCallbackMetadata = {
  direct: directByArity([2, 1], [3, 2]),
  properties: propertiesByArity([1, 0], [2, 0], [2, 1], [3, 1]),
}

const reasonCallback = direct([3, 2], [4, 2, 3], [5, 3, 4])

const reasonCallbackMap: DeferredCallbackMetadata = {
  direct: directByArity([3, 2], [4, 3]),
  properties: propertiesByArity([2, 1], [3, 1], [3, 2], [4, 2]),
}

const predicateAndCallback = direct([2, 0, 1], [3, 0, 1, 2], [4, 1, 2, 3])

const deferredCallbackByApi = new Map<string, DeferredCallbackMetadata>([
  ['Effect.acquireRelease', direct([2, 1], [3, 1])],
  ['Effect.acquireUseRelease', direct([3, 1, 2])],
  ['Effect.addFinalizer', unaryCallback],
  ['Effect.andThen', unaryDualCallback],
  ['Effect.bind', binaryDualCallback],
  ['Effect.callback', unaryCallback],
  ['Effect.catch', unaryDualCallback],
  ['Effect.catchCause', unaryDualCallback],
  ['Effect.catchCauseFilter', predicateAndCallback],
  ['Effect.catchCauseIf', predicateAndCallback],
  ['Effect.catchDefect', unaryDualCallback],
  ['Effect.catchFilter', predicateAndCallback],
  ['Effect.catchIf', predicateAndCallback],
  ['Effect.catchReason', reasonCallback],
  ['Effect.catchReasons', reasonCallbackMap],
  ['Effect.catchTag', taggedCallback],
  ['Effect.catchTags', taggedCallbackMap],
  ['Effect.clockWith', unaryCallback],
  ['Effect.contextWith', unaryCallback],
  ['Effect.effectify', direct([1, 0], [2, 0, 1], [3, 0, 1, 2])],
  ['Effect.failCauseSync', unaryCallback],
  ['Effect.failSync', unaryCallback],
  ['Effect.filter', unaryDualCallbackWithOptions],
  ['Effect.filterMap', unaryDualCallback],
  ['Effect.filterMapEffect', unaryDualCallbackWithOptions],
  ['Effect.filterMapOrElse', direct([2, 0, 1], [3, 1, 2])],
  ['Effect.filterMapOrFail', direct([1, 0], [2, 0, 1], [3, 1, 2])],
  ['Effect.filterOrElse', direct([2, 0, 1], [3, 1, 2])],
  ['Effect.filterOrFail', direct([1, 0], [2, 0, 1], [3, 1, 2])],
  ['Effect.findFirst', unaryDualCallback],
  ['Effect.findFirstFilter', unaryDualCallback],
  ['Effect.flatMap', unaryDualCallback],
  ['Effect.forEach', unaryDualCallbackWithOptions],
  ['Effect.gen', direct([1, 0], [2, 1])],
  ['Effect.interruptibleMask', unaryCallback],
  ['Effect.let', binaryDualCallback],
  ['Effect.map', unaryDualCallback],
  ['Effect.mapBoth', successAndFailureProperties],
  ['Effect.mapError', unaryDualCallback],
  ['Effect.match', successAndFailureProperties],
  ['Effect.matchCause', successAndFailureProperties],
  ['Effect.matchCauseEffect', successAndFailureProperties],
  ['Effect.matchEffect', successAndFailureProperties],
  ['Effect.onError', unaryDualCallback],
  ['Effect.onErrorFilter', predicateAndCallback],
  ['Effect.onErrorIf', predicateAndCallback],
  ['Effect.onExit', unaryDualCallback],
  ['Effect.onExitFilter', predicateAndCallback],
  ['Effect.onExitIf', predicateAndCallback],
  ['Effect.onExitPrimitive', direct([2, 1], [3, 1])],
  ['Effect.onInterrupt', unaryDualCallback],
  ['Effect.orElseSucceed', unaryDualCallback],
  ['Effect.partition', unaryDualCallbackWithOptions],
  ['Effect.promise', unaryCallback],
  ['Effect.reduce', direct([2, 0, 1], [3, 1, 2])],
  [
    'Effect.repeat',
    properties([1, 0, 'while', 'until'], [2, 1, 'while', 'until']),
  ],
  ['Effect.repeatOrElse', binaryDualCallback],
  [
    'Effect.retry',
    properties([1, 0, 'while', 'until'], [2, 1, 'while', 'until']),
  ],
  ['Effect.retryOrElse', binaryDualCallback],
  ['Effect.scopedWith', unaryCallback],
  ['Effect.suspend', unaryCallback],
  ['Effect.sync', unaryCallback],
  ['Effect.tap', unaryDualCallback],
  ['Effect.tapCause', unaryDualCallback],
  ['Effect.tapCauseFilter', predicateAndCallback],
  ['Effect.tapCauseIf', predicateAndCallback],
  ['Effect.tapDefect', unaryDualCallback],
  ['Effect.tapError', unaryDualCallback],
  ['Effect.tapErrorTag', taggedCallback],
  ['Effect.timeoutOrElse', properties([1, 0, 'orElse'], [2, 1, 'orElse'])],
  ['Effect.track', direct([2, 1], [3, 2])],
  ['Effect.trackDefects', direct([2, 1], [3, 2])],
  ['Effect.trackDuration', direct([2, 1], [3, 2])],
  ['Effect.trackErrors', direct([2, 1], [3, 2])],
  ['Effect.trackSuccesses', direct([2, 1], [3, 2])],
  [
    'Effect.try',
    {
      direct: directByArity([1, 0]),
      properties: propertiesByArity([1, 0, 'try', 'catch']),
    },
  ],
  [
    'Effect.tryPromise',
    {
      direct: directByArity([1, 0]),
      properties: propertiesByArity([1, 0, 'try', 'catch']),
    },
  ],
  ['Effect.uninterruptibleMask', unaryCallback],
  ['Effect.updateContext', unaryDualCallback],
  ['Effect.updateService', binaryDualCallback],
  [
    'Effect.updateServiceScoped',
    {
      direct: directByArity([2, 1], [3, 1]),
      properties: propertiesByArity([3, 2, 'reset']),
    },
  ],
  ['Effect.useSpan', direct([2, 1], [3, 2])],
  ['Effect.validate', unaryDualCallbackWithOptions],
  ['Effect.whileLoop', properties([1, 0, 'while', 'body', 'step'])],
  [
    'Effect.withExecutionPlan',
    properties([2, 1, 'onEvent'], [3, 2, 'onEvent']),
  ],
  ['Effect.withFiber', unaryCallback],
  ['Effect.zipWith', binaryDualCallbackWithOptions],
  ['Effect.race', properties([2, 1, 'onWinner'], [3, 2, 'onWinner'])],
  ['Effect.raceFirst', properties([2, 1, 'onWinner'], [3, 2, 'onWinner'])],
  ['Effect.raceAll', properties([2, 1, 'onWinner'])],
  ['Effect.raceAllFirst', properties([2, 1, 'onWinner'])],
  ['Stream.bind', binaryDualCallbackWithOptions],
  ['Stream.bindEffect', binaryDualCallbackWithOptions],
  ['Stream.callback', unaryCallback],
  ['Stream.catch', unaryDualCallback],
  ['Stream.catchCause', unaryDualCallback],
  ['Stream.catchCauseFilter', predicateAndCallback],
  ['Stream.catchCauseIf', predicateAndCallback],
  ['Stream.catchFilter', predicateAndCallback],
  ['Stream.catchIf', predicateAndCallback],
  ['Stream.catchReason', reasonCallback],
  ['Stream.catchReasons', reasonCallbackMap],
  ['Stream.catchTag', taggedCallback],
  ['Stream.catchTags', taggedCallbackMap],
  ['Stream.changesWith', unaryDualCallback],
  ['Stream.changesWithEffect', unaryDualCallback],
  ['Stream.combine', direct([3, 1, 2], [4, 2, 3])],
  ['Stream.combineArray', direct([3, 1, 2], [4, 2, 3])],
  ['Stream.crossWith', binaryDualCallback],
  ['Stream.dropUntil', unaryDualCallback],
  ['Stream.dropUntilEffect', unaryDualCallback],
  ['Stream.dropWhile', unaryDualCallback],
  ['Stream.dropWhileEffect', unaryDualCallback],
  ['Stream.dropWhileFilter', unaryDualCallback],
  ['Stream.failCauseSync', unaryCallback],
  ['Stream.failSync', unaryCallback],
  ['Stream.filter', unaryDualCallback],
  ['Stream.filterEffect', unaryDualCallback],
  ['Stream.filterMap', unaryDualCallback],
  ['Stream.filterMapEffect', unaryDualCallback],
  ['Stream.flatMap', unaryDualCallbackWithOptions],
  ['Stream.fromAsyncIterable', direct([2, 1])],
  ['Stream.fromReadableStream', properties([1, 0, 'evaluate', 'onError'])],
  ['Stream.groupAdjacentBy', unaryDualCallback],
  ['Stream.groupBy', unaryDualCallbackWithOptions],
  ['Stream.groupByKey', unaryDualCallbackWithOptions],
  ['Stream.iterate', direct([2, 1])],
  ['Stream.limitBytes', direct([2, 1], [3, 2])],
  ['Stream.map', unaryDualCallback],
  [
    'Stream.mapAccum',
    {
      direct: directByArity([2, 0, 1], [3, 0, 1, 2], [4, 1, 2]),
      properties: propertiesByArity([3, 2, 'onHalt'], [4, 3, 'onHalt']),
    },
  ],
  [
    'Stream.mapAccumArray',
    {
      direct: directByArity([2, 0, 1], [3, 0, 1, 2], [4, 1, 2]),
      properties: propertiesByArity([3, 2, 'onHalt'], [4, 3, 'onHalt']),
    },
  ],
  [
    'Stream.mapAccumArrayEffect',
    {
      direct: directByArity([2, 0, 1], [3, 0, 1, 2], [4, 1, 2]),
      properties: propertiesByArity([3, 2, 'onHalt'], [4, 3, 'onHalt']),
    },
  ],
  [
    'Stream.mapAccumEffect',
    {
      direct: directByArity([2, 0, 1], [3, 0, 1, 2], [4, 1, 2]),
      properties: propertiesByArity([3, 2, 'onHalt'], [4, 3, 'onHalt']),
    },
  ],
  ['Stream.mapArray', unaryDualCallback],
  ['Stream.mapArrayEffect', unaryDualCallback],
  [
    'Stream.mapBoth',
    properties([1, 0, 'onElement', 'onError'], [2, 1, 'onElement', 'onError']),
  ],
  ['Stream.mapEffect', unaryDualCallbackWithOptions],
  ['Stream.mapError', unaryDualCallback],
  ['Stream.let', binaryDualCallback],
  ['Stream.onError', unaryDualCallback],
  ['Stream.onExit', unaryDualCallback],
  ['Stream.onFirst', unaryDualCallback],
  ['Stream.orElseIfEmpty', unaryDualCallback],
  ['Stream.orElseSucceed', unaryDualCallback],
  ['Stream.paginate', direct([2, 1])],
  ['Stream.partition', unaryDualCallbackWithOptions],
  ['Stream.partitionEffect', unaryDualCallbackWithOptions],
  ['Stream.partitionQueue', unaryDualCallbackWithOptions],
  ['Stream.runFold', direct([2, 0, 1], [3, 1, 2])],
  ['Stream.runFoldEffect', direct([2, 0, 1], [3, 1, 2])],
  ['Stream.runForEach', unaryDualCallback],
  ['Stream.runForEachArray', unaryDualCallback],
  ['Stream.runForEachWhile', unaryDualCallback],
  ['Stream.scan', direct([2, 1], [3, 2])],
  ['Stream.scanEffect', direct([2, 1], [3, 2])],
  ['Stream.split', unaryDualCallback],
  ['Stream.suspend', unaryCallback],
  ['Stream.switchMap', unaryDualCallbackWithOptions],
  ['Stream.sync', unaryCallback],
  ['Stream.takeUntil', unaryDualCallbackWithOptions],
  ['Stream.takeUntilEffect', unaryDualCallbackWithOptions],
  ['Stream.takeWhile', unaryDualCallback],
  ['Stream.takeWhileEffect', unaryDualCallback],
  ['Stream.takeWhileFilter', unaryDualCallback],
  ['Stream.tap', unaryDualCallbackWithOptions],
  [
    'Stream.tapBoth',
    properties([1, 0, 'onElement', 'onError'], [2, 1, 'onElement', 'onError']),
  ],
  ['Stream.tapCause', unaryDualCallback],
  ['Stream.tapError', unaryDualCallback],
  ['Stream.throttle', properties([1, 0, 'cost'], [2, 1, 'cost'])],
  ['Stream.throttleEffect', properties([1, 0, 'cost'], [2, 1, 'cost'])],
  ['Stream.timeoutOrElse', properties([1, 0, 'orElse'], [2, 1, 'orElse'])],
  ['Stream.transformPull', direct([2, 1])],
  ['Stream.transformPullBracket', direct([2, 1])],
  ['Stream.unfold', direct([2, 1])],
  ['Stream.updateContext', unaryDualCallback],
  ['Stream.updateService', binaryDualCallback],
  [
    'Stream.withExecutionPlan',
    properties([2, 1, 'onEvent'], [3, 2, 'onEvent']),
  ],
  ['Stream.zipLatestWith', binaryDualCallback],
  ['Stream.zipWith', binaryDualCallback],
  ['Stream.zipWithArray', binaryDualCallback],
])

const isEffectFunctionBody = (
  argument: ESTree.Node,
  call: ESTree.CallExpression,
): boolean => {
  const maybeFirstArgument = Array.head(call.arguments)
  if (Option.contains(maybeFirstArgument, argument)) {
    return true
  }

  return (
    Option.exists(maybeFirstArgument, argument =>
      isObjectExpression(innermostExpression(argument)),
    ) && Option.contains(Array.get(call.arguments, 1), argument)
  )
}

const isDeferredDirectEffectApiCallback = (
  argument: ESTree.Node,
  call: ESTree.CallExpression,
  key: string,
): boolean => {
  if (effectFunctionFactories.has(key)) {
    return isEffectFunctionBody(argument, call)
  }

  const maybeArgumentIndex = Array.findFirstIndex(
    call.arguments,
    candidate => candidate === argument,
  )
  const maybePositions = Option.fromNullishOr(
    deferredCallbackByApi.get(key)?.direct?.get(call.arguments.length),
  )

  return Option.exists(maybeArgumentIndex, argumentIndex =>
    Option.exists(maybePositions, positions => positions.has(argumentIndex)),
  )
}

const isDeferredObjectEffectApiCallback = (
  property: ESTree.ObjectProperty,
  argument: ESTree.Node,
  call: ESTree.CallExpression,
  key: string,
): boolean => {
  const maybeArgumentIndex = Array.findFirstIndex(
    call.arguments,
    candidate => candidate === argument,
  )
  const maybePropertyName = staticPropertyName(property)
  const propertiesByArgument = deferredCallbackByApi
    .get(key)
    ?.properties?.get(call.arguments.length)

  return Option.exists(maybeArgumentIndex, argumentIndex => {
    const propertyNames = propertiesByArgument?.get(argumentIndex)
    return (
      propertyNames === true ||
      (propertyNames !== undefined &&
        Option.exists(maybePropertyName, propertyName =>
          propertyNames.has(propertyName),
        ))
    )
  })
}

const isEffectOrStreamCallback = (
  references: WeakMap<ESTree.Node, Reference> | undefined,
  fn: ESTree.ArrowFunctionExpression | ESTree.Function,
): boolean => {
  const maybeDirectCall = enclosingCallArgument(fn)
  if (Option.isSome(maybeDirectCall)) {
    return Option.exists(
      apiCallKey(references, maybeDirectCall.value.call),
      key =>
        isDeferredDirectEffectApiCallback(
          maybeDirectCall.value.argument,
          maybeDirectCall.value.call,
          key,
        ),
    )
  }

  const maybeProperty = enclosingPropertyValue(fn)
  if (Option.isNone(maybeProperty)) {
    return false
  }
  const property = maybeProperty.value

  const object = property.parent
  if (object.type !== 'ObjectExpression') {
    return false
  }

  const maybeCall = enclosingCallArgument(object)
  if (Option.isNone(maybeCall)) {
    return false
  }
  const { argument, call } = maybeCall.value

  return Option.exists(apiCallKey(references, call), key =>
    isDeferredObjectEffectApiCallback(property, argument, call, key),
  )
}

const isToLayerCall = (call: ESTree.CallExpression): boolean => {
  const callee = innermostExpression(call.callee)
  return (
    isMemberExpression(callee) &&
    Option.contains(staticMemberName(callee), 'toLayer')
  )
}

const lifecycleEffectProperties = new Set(['acquire', 'release'])

type HandlerUse = Readonly<{
  isHandler: boolean
  isUnsafe: boolean
}>

const emptyHandlerUse: HandlerUse = {
  isHandler: false,
  isUnsafe: false,
}

const mergeHandlerUse = (left: HandlerUse, right: HandlerUse): HandlerUse => ({
  isHandler: left.isHandler || right.isHandler,
  isUnsafe: left.isUnsafe || right.isUnsafe,
})

const indexVariableDefinitions = (
  scopes: ReadonlyArray<OxlintScope>,
): WeakMap<ESTree.Node, Variable> => {
  const variables = new WeakMap<ESTree.Node, Variable>()

  for (const scope of scopes) {
    for (const variable of scope.variables) {
      for (const definition of variable.defs) {
        variables.set(definition.node, variable)
      }
    }
  }

  return variables
}

const immutableLocalVariableValue = (
  variable: Variable,
): Option.Option<ESTree.Node> => {
  if (variable.defs.length !== 1) {
    return Option.none()
  }

  const [definition] = variable.defs
  if (definition === undefined) {
    return Option.none()
  }

  if (
    definition.type === 'Variable' &&
    isVariableDeclarator(definition.node) &&
    isIdentifier(definition.node.id) &&
    definition.node.init !== null &&
    definition.node.parent.type === 'VariableDeclaration' &&
    definition.node.parent.kind === 'const'
  ) {
    return Option.some(definition.node.init)
  }

  if (
    definition.type === 'FunctionName' &&
    definition.node.type === 'FunctionDeclaration' &&
    !variable.references.some(reference => reference.isWrite())
  ) {
    return Option.some(definition.node)
  }

  return Option.none()
}

const isImmutableLocalVariable = (variable: Variable): boolean =>
  Option.isSome(immutableLocalVariableValue(variable))

const isExportedLocalVariable = (variable: Variable): boolean =>
  variable.defs.some(definition => {
    if (
      definition.type === 'Variable' &&
      isVariableDeclarator(definition.node)
    ) {
      return definition.node.parent.parent?.type === 'ExportNamedDeclaration'
    }

    return (
      definition.type === 'FunctionName' &&
      definition.node.type === 'FunctionDeclaration' &&
      definition.node.parent.type === 'ExportNamedDeclaration'
    )
  })

const localValueVariable = (
  definitions: WeakMap<ESTree.Node, Variable>,
  value: ESTree.Node,
): Option.Option<Variable> => {
  const expression = outermostExpression(value)
  const parent = expression.parent

  if (
    isVariableDeclarator(parent) &&
    isIdentifier(parent.id) &&
    parent.init === expression &&
    parent.parent.type === 'VariableDeclaration' &&
    parent.parent.kind === 'const'
  ) {
    return Option.fromNullishOr(definitions.get(parent))
  }

  return value.type === 'FunctionDeclaration'
    ? Option.fromNullishOr(definitions.get(value))
    : Option.none()
}

const enclosingLocalValueVariable = (
  definitions: WeakMap<ESTree.Node, Variable>,
  node: ESTree.Node,
): Option.Option<Variable> => {
  const parent = node.parent
  if (parent === null) {
    return Option.none()
  }

  if (
    isVariableDeclarator(parent) &&
    isIdentifier(parent.id) &&
    parent.init === node &&
    parent.parent.type === 'VariableDeclaration' &&
    parent.parent.kind === 'const'
  ) {
    return Option.fromNullishOr(definitions.get(parent))
  }

  return enclosingLocalValueVariable(definitions, parent)
}

const isDescendantOf = (node: ESTree.Node, ancestor: ESTree.Node): boolean => {
  if (node === ancestor) {
    return true
  }

  return node.parent === null ? false : isDescendantOf(node.parent, ancestor)
}

const handlerValueContainsFunction = (
  references: WeakMap<ESTree.Node, Reference> | undefined,
  handlerValue: ESTree.Node,
  fn: ESTree.ArrowFunctionExpression | ESTree.Function,
): boolean =>
  Option.exists(resolveLocalValue(handlerValue, references), value => {
    if (value === fn) {
      return true
    }

    if (!isObjectExpression(value)) {
      return false
    }

    return value.properties.some(property => {
      if (
        !isObjectProperty(property) ||
        !Option.exists(staticPropertyName(property), name =>
          lifecycleEffectProperties.has(name),
        )
      ) {
        return false
      }

      return Option.contains(resolveLocalValue(property.value, references), fn)
    })
  })

const localVariableCarriesFunction = (
  references: WeakMap<ESTree.Node, Reference>,
  variable: Variable,
  fn: ESTree.ArrowFunctionExpression | ESTree.Function,
): boolean =>
  Option.exists(immutableLocalVariableValue(variable), value => {
    if (handlerValueContainsFunction(references, value, fn)) {
      return true
    }

    return Option.exists(handlerConstructorValue(value, references), handler =>
      handlerValueContainsFunction(references, handler, fn),
    )
  })

const isInsideDeferredEffectCallback = (
  references: WeakMap<ESTree.Node, Reference>,
  node: ESTree.Node,
): boolean => {
  const parent = node.parent
  if (parent === null) {
    return false
  }

  if (isFunction(parent) && isEffectOrStreamCallback(references, parent)) {
    return true
  }

  return isInsideDeferredEffectCallback(references, parent)
}

const isEntryBuilderCall = (
  references: WeakMap<ESTree.Node, Reference> | undefined,
  call: ESTree.CallExpression,
): boolean => {
  const callee = innermostExpression(call.callee)
  if (!isIdentifierReference(callee)) {
    return false
  }

  for (
    let ancestor: ESTree.Node | null = call.parent;
    ancestor !== null;
    ancestor = ancestor.parent
  ) {
    if (!isFunction(ancestor)) {
      continue
    }

    const maybeParameter = Array.head(ancestor.params)
    if (
      !Option.exists(
        maybeParameter,
        parameter =>
          isIdentifierReference(parameter) && parameter.name === callee.name,
      )
    ) {
      continue
    }

    if (
      references !== undefined &&
      !Option.exists(resolvedVariable(references, callee), variable =>
        variable.defs.some(
          definition =>
            definition.type === 'Parameter' && definition.node === ancestor,
        ),
      )
    ) {
      return false
    }

    return Option.exists(
      enclosingCallArgument(ancestor),
      ({ call: builderCall }) =>
        Option.exists(
          apiCallKey(references, builderCall),
          key => key === 'Subscription.make' || key === 'ManagedResource.make',
        ),
    )
  }

  return false
}

const handlerConfigValue = (
  config: ESTree.Node,
  references: WeakMap<ESTree.Node, Reference> | undefined,
): Option.Option<ESTree.Node> =>
  Option.flatMap(resolveLocalValue(config, references), value => {
    if (!isObjectExpression(value)) {
      return Option.none()
    }

    return pipe(
      value.properties,
      Array.findFirst(
        (property): property is ESTree.ObjectProperty =>
          isObjectProperty(property) &&
          Option.contains(staticPropertyName(property), 'handler'),
      ),
      Option.map(property => property.value),
    )
  })

const handlerConstructorArgument = (
  references: WeakMap<ESTree.Node, Reference> | undefined,
  call: ESTree.CallExpression,
): Option.Option<ESTree.Node> => {
  if (isToLayerCall(call) && call.arguments.length === 1) {
    return Array.head(call.arguments)
  }

  const isDefinition = Option.exists(
    apiCallKey(references, call),
    key =>
      (call.arguments.length === 2 &&
        (key === 'Command.define' ||
          key === 'Mount.define' ||
          key === 'Mount.defineStream')) ||
      (call.arguments.length === 1 && key === 'Query.define'),
  )
  const isEntry =
    (call.arguments.length === 2 || call.arguments.length === 3) &&
    isEntryBuilderCall(references, call)

  return isDefinition || isEntry
    ? pipe(
        call.arguments,
        Array.last,
        Option.flatMap(config => handlerConfigValue(config, references)),
      )
    : Option.none()
}

const handlerConstructorValue = (
  constructor: ESTree.Node,
  references: WeakMap<ESTree.Node, Reference> | undefined,
): Option.Option<ESTree.Node> => {
  const generatorValue = generatorConstructorValue(constructor, references)
  return Option.isSome(generatorValue)
    ? generatorValue
    : effectConstructorValue(constructor, references)
}

const enclosingHandlerConstructor = (
  references: WeakMap<ESTree.Node, Reference> | undefined,
  node: ESTree.Node,
): Option.Option<ESTree.Node> => {
  const parent = node.parent
  if (parent === null) {
    return Option.none()
  }

  if (parent.type === 'CallExpression') {
    const maybeBuild = handlerConstructorArgument(references, parent)
    if (Option.isSome(maybeBuild)) {
      return maybeBuild
    }
  }

  return enclosingHandlerConstructor(references, parent)
}

const variableHandlerUse = (
  references: WeakMap<ESTree.Node, Reference>,
  definitions: WeakMap<ESTree.Node, Variable>,
  variable: Variable,
  fn: ESTree.ArrowFunctionExpression | ESTree.Function,
  visited: Set<Variable>,
): HandlerUse => {
  if (!isImmutableLocalVariable(variable) || visited.has(variable)) {
    return { isHandler: false, isUnsafe: true }
  }

  const path = new Set(visited)
  path.add(variable)
  let use = isExportedLocalVariable(variable)
    ? { isHandler: false, isUnsafe: true }
    : emptyHandlerUse

  for (const reference of variable.references) {
    if (!reference.isRead()) {
      continue
    }

    const identifier = reference.identifier
    if (isDescendantOf(identifier, fn)) {
      continue
    }

    const maybeBuild = enclosingHandlerConstructor(references, identifier)
    if (
      Option.exists(maybeBuild, build =>
        Option.exists(handlerConstructorValue(build, references), handler =>
          handlerValueContainsFunction(references, handler, fn),
        ),
      )
    ) {
      use = mergeHandlerUse(use, { isHandler: true, isUnsafe: false })
      continue
    }

    const maybeContainer = enclosingLocalValueVariable(definitions, identifier)
    if (
      Option.isSome(maybeContainer) &&
      maybeContainer.value !== variable &&
      localVariableCarriesFunction(references, maybeContainer.value, fn)
    ) {
      use = mergeHandlerUse(
        use,
        variableHandlerUse(
          references,
          definitions,
          maybeContainer.value,
          fn,
          path,
        ),
      )
      continue
    }

    if (isInsideDeferredEffectCallback(references, identifier)) {
      continue
    }

    use = mergeHandlerUse(use, { isHandler: false, isUnsafe: true })
  }

  return use
}

const isConstructedHandlerFunction = (
  references: WeakMap<ESTree.Node, Reference> | undefined,
  definitions: WeakMap<ESTree.Node, Variable> | undefined,
  fn: ESTree.ArrowFunctionExpression | ESTree.Function,
): boolean => {
  const maybeBuild = enclosingHandlerConstructor(references, fn)
  if (
    Option.exists(maybeBuild, build =>
      Option.exists(handlerConstructorValue(build, references), handler =>
        handlerValueContainsFunction(references, handler, fn),
      ),
    )
  ) {
    return true
  }

  if (references === undefined || definitions === undefined) {
    return false
  }

  return Option.exists(localValueVariable(definitions, fn), variable => {
    const use = variableHandlerUse(
      references,
      definitions,
      variable,
      fn,
      new Set(),
    )
    return use.isHandler && !use.isUnsafe
  })
}

const isDeferredFunction = (
  references: WeakMap<ESTree.Node, Reference> | undefined,
  definitions: WeakMap<ESTree.Node, Variable> | undefined,
  fn: ESTree.ArrowFunctionExpression | ESTree.Function,
): boolean =>
  isEffectOrStreamCallback(references, fn) ||
  isConstructedHandlerFunction(references, definitions, fn)

const isInsideEffectBoundary = (
  references: WeakMap<ESTree.Node, Reference> | undefined,
  definitions: WeakMap<ESTree.Node, Variable> | undefined,
  node: ESTree.Node,
): boolean => {
  const parent = node.parent
  if (parent === null) {
    return false
  }
  if (
    isFunction(parent) &&
    isDeferredFunction(references, definitions, parent)
  ) {
    return true
  }
  return isInsideEffectBoundary(references, definitions, parent)
}

const callOperation = (
  references: WeakMap<ESTree.Node, Reference> | undefined,
  node: ESTree.CallExpression,
): Option.Option<ImpureOperation> =>
  Option.flatMap(globalPathKey(references, node.callee), key =>
    Option.fromNullishOr(impureCallByPath.get(key)),
  )

const newOperation = (
  references: WeakMap<ESTree.Node, Reference> | undefined,
  node: ESTree.NewExpression,
): Option.Option<ImpureOperation> =>
  Array.isArrayEmpty(node.arguments) &&
  Option.contains(globalPathKey(references, node.callee), 'Date')
    ? Option.some(newDateOperation)
    : Option.none()

const diagnosticMessage = ({ display, guidance }: ImpureOperation): string =>
  `${display} is outside a recognized callback that Effect or Foldkit defers until execution. ${guidance} Obtain the value in a deferred Effect or lifecycle execution callback and return it in a Message. Assigning it to a local variable or passing it as a Command argument does not defer the call.`

/**
 * Flags direct calls to known nondeterministic globals unless they appear in a
 * recognized deferred Effect, Stream, Command, Mount, Subscription, or
 * ManagedResource callback.
 */
export const noImpureCallAtDecisionTime = Rule.define({
  name: 'no-impure-call-at-decision-time',
  meta: Rule.meta({
    type: 'problem',
    description:
      'Keep direct time and randomness calls inside deferred Effect and lifecycle execution callbacks.',
  }),
  create: function* () {
    const ctx = yield* RuleContext
    const scopes = ctx.sourceCode.scopeManager?.scopes
    const references =
      scopes === undefined ? undefined : indexReferences(scopes)
    const definitions =
      scopes === undefined ? undefined : indexVariableDefinitions(scopes)

    const report = (
      node: ESTree.CallExpression | ESTree.NewExpression,
      maybeOperation: Option.Option<ImpureOperation>,
    ) =>
      Option.match(maybeOperation, {
        onNone: () => Effect.void,
        onSome: operation =>
          isInsideEffectBoundary(references, definitions, node)
            ? Effect.void
            : ctx.report(
                Diagnostic.make({
                  node,
                  message: diagnosticMessage(operation),
                }),
              ),
      })

    return {
      CallExpression: (node: ESTree.Node) =>
        node.type === 'CallExpression'
          ? report(node, callOperation(references, node))
          : Effect.void,
      NewExpression: (node: ESTree.Node) =>
        node.type === 'NewExpression'
          ? report(node, newOperation(references, node))
          : Effect.void,
    }
  },
})
