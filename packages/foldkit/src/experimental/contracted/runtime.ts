import {
  Context,
  Effect,
  Layer,
  Predicate,
  Schema,
  SchemaAST,
  Scope,
} from 'effect'

import { copyBlockInMessageUpdate } from '../../block/inMessageUpdate.js'
import { makeInstanceSchema } from '../../block/instanceSchema.js'
import { isOperationMessageConstructor } from '../../block/operation.js'
import { compositionOperationGraphOf } from '../../block/operationGraph.js'
import { registerRuntimeAcquisition } from '../../block/runtimeCapability.js'
import { registerRootConstruction } from '../../runtime/rootBlock.js'
import {
  type CompileInMessageUpdate,
  constructAuthoredImplementation,
  makeDefinitionFactory,
  registerDeclaredDescriptor,
  wrapExecutable,
} from '../constructed/runtime.js'
import {
  acquisitionOf,
  executionBindingsOf,
  registerExecutionBindings,
  withConstructionGraph,
} from '../constructed/symbolic.js'
import {
  authoringSourceOf,
  compilePlan,
  copyViewPlanGraph,
  planComposition,
  planKind,
} from '../hybrid/authoring.js'
import type {
  ContractConfiguration,
  Definition,
  InMessageConfigurationArguments,
} from './contract.js'
import {
  assertInMessageConfiguration,
  compileInputs,
  makeInMessageUpdateDispatcher,
  makeInMessageUpdatePlan,
} from './inMessageUpdate.js'

type AnySchema = Schema.Codec<any, any, any, any>
type AnyFunction = (...args: ReadonlyArray<any>) => any
type Declaration = ContractConfiguration &
  Readonly<{
    Model: AnySchema
    Message: AnySchema
    OutMessage?: AnySchema
    ChildInitContext?: AnySchema
  }>
type OptionalSchema<Config, Key extends PropertyKey> =
  Config extends Readonly<Record<Key, infer Value extends AnySchema>>
    ? Value
    : undefined

type IsUnion<Value, Whole = Value> = Value extends unknown
  ? [Whole] extends [Value]
    ? false
    : true
  : never
type LiteralContractId<Id extends string> = [Id] extends ['']
  ? never
  : {} extends Record<Id, unknown>
    ? never
    : true extends IsUnion<Id>
      ? never
      : Id

/** @internal Requires an explicitly message-free declaration to use Never. */
export type MessageFreeValidation<Config extends Declaration> =
  Config extends Readonly<{
    isMessageFree: true
  }>
    ? [Config['Message']['Type']] extends [never]
      ? readonly []
      : readonly [messageFreeContractRequiresNever: never]
    : readonly []

const declaredKeys = new Set<symbol>()
const handlerSelections = new WeakMap<
  object,
  (handlers: Layer.Any, declaredHosts?: ReadonlyArray<unknown>) => object
>()
let nextServiceKey = 0

const snapshotArray = (
  value: unknown,
  name: string,
): ReadonlyArray<unknown> => {
  if (!globalThis.Array.isArray(value)) {
    throw new Error(`[foldkit] ${name} must be an array.`)
  }

  const descriptors = Object.getOwnPropertyDescriptors(value)
  const snapshot: Array<unknown> = []
  let length = 0

  for (const key of Reflect.ownKeys(descriptors)) {
    const descriptor: PropertyDescriptor = Reflect.get(descriptors, key)

    if (key !== 'length' && (!Predicate.isString(key) || !/^\d+$/.test(key))) {
      throw new Error(`[foldkit] ${name} cannot have extra properties.`)
    }

    if (!Object.hasOwn(descriptor, 'value')) {
      throw new Error(`[foldkit] ${name} cannot contain accessors.`)
    }

    if (key === 'length') {
      length = descriptor.value
    } else {
      Object.defineProperty(snapshot, key, {
        configurable: true,
        enumerable: descriptor.enumerable ?? false,
        value: descriptor.value,
        writable: true,
      })
    }
  }

  snapshot.length = length

  return Object.freeze(snapshot)
}

const snapshotRecord = (value: unknown, name: string): Record<string, any> => {
  if (!Predicate.isObject(value) || globalThis.Array.isArray(value)) {
    throw new Error(`[foldkit] ${name} must be a record.`)
  }

  const descriptors = Object.getOwnPropertyDescriptors(value)
  const snapshot: Record<string, any> = {}

  for (const key of Reflect.ownKeys(descriptors)) {
    const descriptor: PropertyDescriptor = Reflect.get(descriptors, key)

    if (!Object.hasOwn(descriptor, 'value')) {
      throw new Error(`[foldkit] ${name} cannot contain accessors.`)
    }

    Object.defineProperty(snapshot, key, {
      configurable: true,
      enumerable: descriptor.enumerable ?? false,
      value: descriptor.value,
      writable: true,
    })
  }

  return snapshot
}

const snapshotChannelRecord = (
  value: unknown,
  name: string,
): Record<string, any> => {
  const record = snapshotRecord(value, name)

  for (const key of ['services', 'resources']) {
    if (Object.hasOwn(record, key)) {
      Object.defineProperty(record, key, {
        configurable: false,
        enumerable: true,
        value: snapshotArray(record[key], `${name}.${key}`),
        writable: false,
      })
    }
  }

  return Object.freeze(record)
}

/** @internal Copies declaration records before either public source is created. */
export function snapshotDefinitionConfiguration<Config extends Declaration>(
  config: Config,
): Config
export function snapshotDefinitionConfiguration(config: Declaration): object {
  const snapshot = snapshotRecord(config, 'Block Definition configuration')

  if (Object.hasOwn(snapshot, 'operations')) {
    const operations = snapshotRecord(snapshot['operations'], 'operations')

    for (const name of Reflect.ownKeys(operations)) {
      const declaration = Reflect.get(operations, name)

      if (!Predicate.isFunction(declaration)) {
        Object.defineProperty(operations, name, {
          configurable: false,
          enumerable:
            Object.getOwnPropertyDescriptor(operations, name)?.enumerable ??
            false,
          value: snapshotChannelRecord(
            declaration,
            `operations.${globalThis.String(name)}`,
          ),
          writable: false,
        })
      }
    }

    Object.defineProperty(snapshot, 'operations', {
      configurable: false,
      enumerable: true,
      value: Object.freeze(operations),
      writable: false,
    })
  }

  if (Object.hasOwn(snapshot, 'inMessageOutputs')) {
    const outputs = snapshotRecord(
      snapshot['inMessageOutputs'],
      'inMessageOutputs',
    )

    for (const tag of Reflect.ownKeys(outputs)) {
      const declaration = Reflect.get(outputs, tag)

      Object.defineProperty(outputs, tag, {
        configurable: false,
        enumerable:
          Object.getOwnPropertyDescriptor(outputs, tag)?.enumerable ?? false,
        value: snapshotChannelRecord(
          declaration,
          `inMessageOutputs.${globalThis.String(tag)}`,
        ),
        writable: false,
      })
    }

    Object.defineProperty(snapshot, 'inMessageOutputs', {
      configurable: false,
      enumerable: true,
      value: Object.freeze(outputs),
      writable: false,
    })
  }

  if (Object.hasOwn(snapshot, 'view')) {
    const view = snapshotRecord(snapshot['view'], 'view')

    if (Object.hasOwn(view, 'mounts')) {
      Object.defineProperty(view, 'mounts', {
        configurable: false,
        enumerable: true,
        value: snapshotArray(view['mounts'], 'view.mounts'),
        writable: false,
      })
    }

    Object.defineProperty(snapshot, 'view', {
      configurable: false,
      enumerable: true,
      value: Object.freeze(view),
      writable: false,
    })
  }

  for (const key of ['effects', 'codec']) {
    if (Object.hasOwn(snapshot, key) && snapshot[key] !== undefined) {
      const declaration = snapshotRecord(snapshot[key], key)

      for (const member of ['services', 'resources', 'decoding', 'encoding']) {
        if (Object.hasOwn(declaration, member)) {
          Object.defineProperty(declaration, member, {
            configurable: false,
            enumerable: true,
            value: snapshotArray(declaration[member], `${key}.${member}`),
            writable: false,
          })
        }
      }

      Object.defineProperty(snapshot, key, {
        configurable: false,
        enumerable: true,
        value: Object.freeze(declaration),
        writable: false,
      })
    }
  }

  return Object.freeze(snapshot)
}

const isNeverMessage = (sourceAst: SchemaAST.AST): boolean => {
  const ast = SchemaAST.toType(sourceAst)

  if (SchemaAST.isSuspend(ast)) {
    return isNeverMessage(ast.thunk())
  }

  return SchemaAST.isNever(ast)
}

const operationMessages = (config: Declaration): object =>
  Object.fromEntries(
    Object.entries(config.operations ?? {}).map(([name, declaration]) => {
      const message = Predicate.isFunction(declaration)
        ? declaration
        : declaration.message

      if (!Predicate.isFunction(message)) {
        throw new Error(
          '[foldkit] Contract operations require a local Message constructor or a Message tuple producer.',
        )
      }

      if (
        isOperationMessageConstructor(message) &&
        !Object.values(config.Message).includes(message)
      ) {
        throw new Error(
          '[foldkit] Contract operations require an original local Message constructor.',
        )
      }

      if (name === 'then' || name === 'construct') {
        throw new Error(
          '[foldkit] A Block contract reserves operation names "then" and "construct".',
        )
      }

      return [name, message]
    }),
  )

/**
 * Declares public inputs and outputs independently of executable construction.
 * Child Bindings require an implementation supplied by an ordinary Layer.
 */
export const makeDefinition = <
  const Id extends string,
  const Key extends symbol,
  const Config extends Omit<Declaration, 'key'>,
>(
  id: Id & LiteralContractId<Id>,
  config: Config &
    Readonly<{ key: Key }> &
    (symbol extends Key ? never : true extends IsUnion<Key> ? never : unknown),
  ..._validation: readonly [
    ...MessageFreeValidation<NoInfer<Config & Readonly<{ key: Key }>>>,
    ...InMessageConfigurationArguments<
      NoInfer<Config & Readonly<{ key: Key }>>
    >,
  ]
): Definition<
  Id,
  Config['Model'],
  Config['Message'],
  OptionalSchema<Config, 'OutMessage'>,
  OptionalSchema<Config, 'ChildInitContext'>,
  Config & Readonly<{ key: Key }>
> => makeDefinitionRuntime(id, config)

/** @internal Establishes independent contracts under one original namespace. */
export interface ContractNamespaceMakeDefinition<Id extends string> {
  <const Key extends symbol, const Config extends Omit<Declaration, 'key'>>(
    config: Config &
      Readonly<{ key: Key }> &
      (symbol extends Key
        ? never
        : true extends IsUnion<Key>
          ? never
          : unknown) &
      ([Id] extends [LiteralContractId<Id>] ? unknown : never),
    ...validation: readonly [
      ...MessageFreeValidation<NoInfer<Config & Readonly<{ key: Key }>>>,
      ...InMessageConfigurationArguments<
        NoInfer<Config & Readonly<{ key: Key }>>
      >,
    ]
  ): Definition<
    Id,
    Config['Model'],
    Config['Message'],
    OptionalSchema<Config, 'OutMessage'>,
    OptionalSchema<Config, 'ChildInitContext'>,
    Config & Readonly<{ key: Key }>
  >
}

/** @internal Retains the completion source when selecting a pending implementation's handlers. */
export const selectContractHandlers = (
  block: object,
  handlers: Layer.Any,
  declaredHosts?: ReadonlyArray<unknown>,
): any => {
  const select = handlerSelections.get(block)

  if (select === undefined) {
    throw new Error(
      '[foldkit] Handler selection requires an original contracted implementation.',
    )
  }

  if (!Layer.isLayer(handlers)) {
    throw new Error('[foldkit] Handler selection requires an Effect Layer.')
  }

  return select(handlers, declaredHosts)
}

/** @internal Shares checked completion with private parametric specializations. */
export const makeDefinitionRuntime = (
  id: string,
  config: Declaration,
  isOrdinaryDeclaration = true,
  sourceDefinition?: object,
): any => {
  config = snapshotDefinitionConfiguration(config)

  if (!Predicate.isString(id) || id.length === 0) {
    throw new Error(
      '[foldkit] An independent Block contract requires a nonempty literal Id.',
    )
  }

  if (config.isMessageFree === true && !isNeverMessage(config.Message.ast)) {
    throw new Error(
      '[foldkit] A message-free Block contract requires a Never Message Schema.',
    )
  }

  assertInMessageConfiguration(config)
  const InMessage = config.InMessage

  const coreContracts = {
    Model: config.Model,
    Message: config.Message,
    ...(config.OutMessage === undefined
      ? {}
      : { OutMessage: config.OutMessage }),
    ...(config.ChildInitContext === undefined
      ? {}
      : { ChildInitContext: config.ChildInitContext }),
  }
  const definition: any = Reflect.apply(
    makeDefinitionFactory('Effect'),
    undefined,
    [id, coreContracts, sourceDefinition],
  )
  const authoringSources = new WeakSet<object>()

  if (!Predicate.isSymbol(config.key)) {
    throw new Error('[foldkit] A Block contract requires a unique symbol key.')
  }

  if (isOrdinaryDeclaration && declaredKeys.has(config.key)) {
    throw new Error(
      `[foldkit] Independent Block contract key for "${id}" is already declared. Reuse the original contract.`,
    )
  }

  const service = Context.Service<unknown, object>(
    `foldkit/ContractedBlock/${nextServiceKey++}/${id}`,
  )
  const contract = Object.freeze({
    owner: definition.owner,
    Model: config.Model,
    Message: config.Message,
    OutMessage: config.OutMessage,
    Instance: makeInstanceSchema(definition.owner, config.Model),
    InMessage: config.InMessage,
    get: Effect.map(service, executable => executable),
  })
  const operations = operationMessages(config)
  const publishedMounts = Object.freeze(
    globalThis.Array.from(config.view?.mounts ?? []),
  )

  if (isOrdinaryDeclaration) {
    declaredKeys.add(config.key)
  }
  registerDeclaredDescriptor(
    contract,
    () => contract.get,
    () => Effect.serviceOption(service),
  )

  const complete = (
    constructor: Effect.Effect<any, any, any>,
    provision: (
      layer: Layer.Layer<any, any, any>,
    ) => Layer.Layer<any, any, any> = layer => layer,
    selectedHandlers?: Layer.Any,
    declaredHosts?: ReadonlyArray<unknown>,
  ): any => {
    const layer = provision(
      Layer.fromBuildMemo((memoMap, scope) =>
        withConstructionGraph(
          graph =>
            constructor.pipe(
              Scope.provide(scope),
              Effect.provideService(Layer.CurrentMemoMap, memoMap),
              Effect.flatMap(constructorBody =>
                Effect.gen(function* () {
                  if (Object.hasOwn(constructorBody, 'operations')) {
                    throw new Error(
                      '[foldkit] Contract operations are declared once on the Definition.',
                    )
                  }

                  const body = { ...constructorBody }

                  if (!authoringSources.has(planComposition(body.init))) {
                    throw new Error(
                      '[foldkit] Constructor plans belong to another Definition.',
                    )
                  }

                  const compileInMessageUpdate:
                    | CompileInMessageUpdate
                    | undefined =
                    InMessage === undefined
                      ? undefined
                      : (actual, source, environment) => {
                          if (
                            body.inMessageUpdate === undefined ||
                            planKind(body.inMessageUpdate) !== 'InMessageUpdate'
                          ) {
                            throw new Error(
                              '[foldkit] An InMessage contract requires its Composition.makeInMessageUpdate plan.',
                            )
                          }

                          const makeInMessageUpdate =
                            makeInMessageUpdateDispatcher(
                              InMessage,
                              compositionOperationGraphOf(actual),
                              environment,
                            )
                          actual.makeInMessageUpdate = makeInMessageUpdate
                          const inMessageUpdate = compilePlan<AnyFunction>(
                            body.inMessageUpdate,
                            actual,
                            source,
                          )
                          makeInMessageUpdate.complete(inMessageUpdate)

                          return {
                            InMessage: InMessage,
                            inMessageUpdate,
                            operations: compileInputs(
                              InMessage,
                              inMessageUpdate,
                              actual,
                            ),
                          }
                        }
                  const authoredImplementation =
                    constructAuthoredImplementation(
                      {
                        ...body,
                        operations,
                      },
                      compileInMessageUpdate,
                      graph,
                    )

                  for (const mount of publishedMounts) {
                    if (!authoredImplementation.mounts.includes(mount)) {
                      throw new Error(
                        '[foldkit] Published view Mounts must be original registered Mount Definitions.',
                      )
                    }
                  }

                  if (
                    declaredHosts !== undefined &&
                    (authoredImplementation.hostHandlers.length !==
                      declaredHosts.length ||
                      authoredImplementation.hostHandlers.some(
                        handler => !declaredHosts.includes(handler),
                      ))
                  ) {
                    throw new Error(
                      '[foldkit] Family handler selection requires the original host declarations.',
                    )
                  }

                  const implementation =
                    selectedHandlers === undefined
                      ? authoredImplementation
                      : authoredImplementation.provideHandlers(selectedHandlers)

                  if (
                    isOrdinaryDeclaration &&
                    implementation.hostHandlers.length !== 0
                  ) {
                    throw new Error(
                      '[foldkit] A Block implementation must resolve its original host handlers with provideHandlers before acquisition.',
                    )
                  }

                  if (implementation !== authoredImplementation) {
                    copyViewPlanGraph(authoredImplementation, implementation)
                    copyBlockInMessageUpdate(
                      authoredImplementation,
                      implementation,
                    )
                    const bindings = executionBindingsOf(authoredImplementation)

                    if (bindings !== undefined) {
                      registerExecutionBindings(implementation, bindings)
                    }
                  }

                  if (
                    implementation.owner !== contract.owner ||
                    implementation.Model !== contract.Model ||
                    implementation.OutMessage !== contract.OutMessage
                  ) {
                    throw new Error(
                      '[foldkit] The implementation belongs to another independent Block contract.',
                    )
                  }

                  if (
                    isNeverMessage(implementation.Message.ast) !==
                    (config.isMessageFree === true)
                  ) {
                    throw new Error(
                      '[foldkit] The completed dispatch Schema must match the message-free contract declaration.',
                    )
                  }

                  let isActive = true
                  registerRuntimeAcquisition(implementation, () => isActive)
                  yield* Scope.addFinalizer(
                    scope,
                    Effect.sync(() => {
                      isActive = false
                    }),
                  )
                  const executable = wrapExecutable(
                    contract,
                    implementation,
                    true,
                    { graph, isCurrent: () => isActive },
                  )

                  return Context.make(service, executable)
                }),
              ),
            ),
          scope,
        ),
      ),
    )
    const block = Object.freeze({
      ...contract,
      layer,
      provide: (dependencies: Layer.Layer<any, any, any>) =>
        complete(
          constructor,
          current =>
            Layer.provide(Layer.fresh(provision(current)), dependencies),
          selectedHandlers,
          declaredHosts,
        ),
      provideHandlers: (handlers: Layer.Any) =>
        selectContractHandlers(block, handlers, declaredHosts),
    })

    handlerSelections.set(block, (handlers, hosts) =>
      complete(constructor, provision, handlers, hosts),
    )

    registerRootConstruction(block, {
      layer,
      read: Effect.map(
        block.get,
        executable => acquisitionOf(executable).block,
      ),
    })

    return block
  }

  return {
    ...definition,
    InMessage: config.InMessage,
    contract,
    makeComposition: (graph: unknown = {}) => {
      const composition = definition.makeComposition(graph)
      authoringSources.add(authoringSourceOf(composition))

      if (config.InMessage === undefined) {
        return composition
      }

      return Object.assign(composition, {
        makeInMessageUpdate: makeInMessageUpdatePlan(
          authoringSourceOf(composition),
        ),
      })
    },
    makeBlock: complete,
  }
}
