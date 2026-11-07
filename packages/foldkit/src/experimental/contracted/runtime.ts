import {
  Context,
  Effect,
  Layer,
  Option,
  Predicate,
  Schema,
  SchemaAST,
  Scope,
} from 'effect'

import type { AnyBlock } from '../../block/definition.js'
import { copyBlockInMessageUpdate } from '../../block/inMessageUpdate.js'
import { makeInstanceSchema } from '../../block/instanceSchema.js'
import { isOperationMessageConstructor } from '../../block/operation.js'
import { compositionOperationGraphOf } from '../../block/operationGraph.js'
import { registerRuntimeAcquisition } from '../../block/runtimeCapability.js'
import {
  type DeclaredRootBlock,
  type RootConstruction,
  type SelectedLayeredRoot,
  registerRootConstruction,
  rootConstructionOf,
  selectLayeredRoot,
} from '../../runtime/rootBlock.js'
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
  DefinitionConfigurationArguments,
} from './contract.js'
import {
  assertInMessageConfiguration,
  compileInputs,
  makeInMessageUpdateDispatcher,
  makeInMessageUpdatePlan,
} from './inMessageUpdate.js'

type AnySchema = Schema.Codec<any, any, any, any>
type AnySelfContainedSchema = Schema.Codec<any, any, never, never>
type AnyFunction = (...args: ReadonlyArray<any>) => any
/** @internal Retains the shared exact declaration configuration. */
export type Declaration = ContractConfiguration &
  Readonly<{
    Model: AnySelfContainedSchema
    Message: AnySelfContainedSchema
    OutMessage?: AnySchema
    ChildInitContext?: AnySchema
  }>
/** @internal Selects the original optional Schema contract. */
export type OptionalSchema<Config, Key extends PropertyKey> =
  Config extends Readonly<Record<Key, infer Value extends AnySchema>>
    ? Value
    : undefined

/** @internal Retains the declaration key and identifier restrictions. */
export type IsUnion<Value, Whole = Value> = Value extends unknown
  ? [Whole] extends [Value]
    ? false
    : true
  : never
/** @internal Retains the original literal identifier restriction. */
export type LiteralContractId<Id extends string> = [Id] extends ['']
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
const layerHandlerSelections = new WeakMap<
  object,
  (
    layer: Layer.Layer<any, any, any>,
    handlers: Layer.Any,
    hosts: ReadonlyArray<unknown>,
  ) => Layer.Layer<any, any, any>
>()

/** @internal Carries original family host declarations into existing graph construction. */
export const selectDeclaredLayerHandlers = (
  declaration: object,
  layer: Layer.Layer<any, any, any>,
  handlers: Layer.Any,
  hosts: ReadonlyArray<unknown>,
): Layer.Layer<any, any, any> => {
  const select = layerHandlerSelections.get(declaration)

  if (
    select === undefined ||
    !Layer.isLayer(layer) ||
    !Layer.isLayer(handlers)
  ) {
    throw new Error(
      '[foldkit] Family handler selection requires an original Block and Effect Layers.',
    )
  }

  return select(layer, handlers, hosts)
}

let nextServiceKey = 0
const declaredBlockReaders = new WeakMap<
  object,
  Effect.Effect<AnyBlock, never, any>
>()
const declaredExecutableReaders = new WeakMap<
  object,
  Effect.Effect<object, never, unknown>
>()

/** @internal Registers an authenticated family reader for explicit Layer selection. */
export const registerDeclaredLayerReader = (
  block: object,
  read: Effect.Effect<AnyBlock, never, any>,
  executable: Effect.Effect<object, never, any>,
): void => {
  declaredBlockReaders.set(block, read)
  declaredExecutableReaders.set(block, executable)
}

const declaredLayerSelections = new WeakMap<
  object,
  (layer: Layer.Layer<any, any, any>) => RootConstruction
>()
/** @internal A family's exact paired selector inspects only the selected Layer's outputs. */
export const registerDeclaredLayerSelection = (
  block: object,
  select: (layer: Layer.Layer<any, any, any>) => RootConstruction,
): void => {
  declaredLayerSelections.set(block, select)
}

const fixedProviderGuards = new WeakMap<
  object,
  Effect.Effect<Option.Option<object>>
>()
/** @internal Registers the once-only capture check for one original closed family. */
export const registerFixedProviderGuard = (
  descriptor: object,
  expected: Effect.Effect<Option.Option<object>>,
): void => {
  if (
    !declaredBlockReaders.has(descriptor) ||
    fixedProviderGuards.has(descriptor)
  ) {
    throw new Error(
      '[foldkit] A fixed provider guard requires one unguarded original Block.',
    )
  }

  fixedProviderGuards.set(descriptor, expected)
}
const checkFixedProviderAcquisition = (
  descriptor: object,
  executable: object,
): Effect.Effect<object> => {
  const expected = fixedProviderGuards.get(descriptor)

  if (expected === undefined) {
    return Effect.succeed(executable)
  }

  return Effect.flatMap(expected, maybeExpected =>
    Option.match(maybeExpected, {
      onNone: () => Effect.succeed(executable),
      onSome: captured =>
        Effect.sync(() => {
          const expectedAcquisition = acquisitionOf(captured)
          const actualAcquisition = acquisitionOf(executable)

          if (
            !expectedAcquisition.isCurrent() ||
            !actualAcquisition.isCurrent()
          ) {
            throw new Error(
              '[foldkit] A fixed provider cannot attest an expired acquisition Scope.',
            )
          }

          if (expectedAcquisition.block !== actualAcquisition.block) {
            throw new Error(
              '[foldkit] A fixed family provider cannot attest another acquired implementation.',
            )
          }

          return executable
        }),
    }),
  )
}

const acquireCompositionChildren = (
  bindings: ReadonlyArray<object>,
): Effect.Effect<ReadonlyArray<object>, any, any> =>
  Effect.suspend(() =>
    Effect.map(
      Effect.forEach(
        bindings,
        binding => {
          const construct = Reflect.get(binding, 'construct')

          if (!Predicate.isFunction(construct)) {
            throw new Error(
              '[foldkit] Composition.acquireChildren requires original registered Bindings.',
            )
          }

          const acquisition = Reflect.apply(construct, binding, [])
          if (!Effect.isEffect(acquisition)) {
            throw new Error(
              '[foldkit] Composition.acquireChildren requires original registered Binding constructors.',
            )
          }

          return Effect.map(acquisition, child => {
            if (!Predicate.isObject(child)) {
              throw new Error(
                '[foldkit] Composition.acquireChildren received an invalid child acquisition.',
              )
            }

            return child
          })
        },
        { concurrency: 1 },
      ),
      children => Object.freeze(children),
    ),
  )

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

  if (Object.hasOwn(record, 'resources')) {
    throw new Error(
      `[foldkit] ${name}.resources has been renamed to ${name}.managedResources.`,
    )
  }

  for (const key of ['services', 'managedResources']) {
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

  if (Object.hasOwn(snapshot, 'codec')) {
    throw new Error(
      '[foldkit] Block codec declarations are no longer supported. Model and complete Message Codecs must not require Services.',
    )
  }

  if (Object.hasOwn(snapshot, 'effects') && snapshot['effects'] !== undefined) {
    const declaration = snapshotRecord(snapshot['effects'], 'effects')

    if (Object.hasOwn(declaration, 'resources')) {
      throw new Error(
        '[foldkit] effects.resources has been renamed to effects.managedResources.',
      )
    }

    for (const member of ['services', 'managedResources']) {
      if (Object.hasOwn(declaration, member)) {
        Object.defineProperty(declaration, member, {
          configurable: false,
          enumerable: true,
          value: snapshotArray(declaration[member], `effects.${member}`),
          writable: false,
        })
      }
    }

    Object.defineProperty(snapshot, 'effects', {
      configurable: false,
      enumerable: true,
      value: Object.freeze(declaration),
      writable: false,
    })
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
    ...DefinitionConfigurationArguments<
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
      ...DefinitionConfigurationArguments<
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
  publicDescriptor: 'Contract' | 'Block' = 'Contract',
): any => {
  config = snapshotDefinitionConfiguration(config)

  if (config.InitArgs === undefined) {
    throw new Error(
      '[foldkit] A Block contract requires an InitArgs contract for its positional initializer arguments.',
    )
  }

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
  const hostSelectionService = Context.Service<
    Layer.Any,
    Readonly<{
      handlers: Layer.Any
      declaredHosts: ReadonlyArray<unknown> | undefined
    }>
  >(`foldkit/HostSelection/${nextServiceKey++}/${id}`)
  const implementationFactsService = Context.Service<unknown, object>(
    `foldkit/ImplementationFacts/${nextServiceKey++}/${id}`,
  )
  const contract = Object.freeze({
    owner: definition.owner,
    Model: config.Model,
    Message: config.Message,
    OutMessage: config.OutMessage,
    Instance: makeInstanceSchema(definition.owner, config.Model),
    InMessage: config.InMessage,
    get: Effect.flatMap(service, executable =>
      checkFixedProviderAcquisition(declaredBlock, executable),
    ),
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
    () =>
      Effect.flatMap(Effect.serviceOption(service), maybeExecutable =>
        Option.match(maybeExecutable, {
          onNone: () => Effect.succeed(Option.none()),
          onSome: executable =>
            Effect.map(
              checkFixedProviderAcquisition(declaredBlock, executable),
              Option.some,
            ),
        }),
      ),
  )

  let declaredBlock: object

  const complete = (
    constructor: Effect.Effect<any, any, any>,
    provision: (
      layer: Layer.Layer<any, any, any>,
    ) => Layer.Layer<any, any, any> = layer => layer,
    selectedHandlers?: Layer.Any,
    declaredHosts?: ReadonlyArray<unknown>,
    allowPendingHandlers = false,
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
                  const maybeLayerHandlers =
                    yield* Effect.serviceOption(hostSelectionService)
                  const layerSelection =
                    Option.getOrUndefined(maybeLayerHandlers)
                  const effectiveHandlers =
                    selectedHandlers ?? layerSelection?.handlers
                  const expectedDeclaredHosts =
                    declaredHosts ?? layerSelection?.declaredHosts

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
                    expectedDeclaredHosts !== undefined &&
                    (authoredImplementation.hostHandlers.length !==
                      expectedDeclaredHosts.length ||
                      authoredImplementation.hostHandlers.some(
                        handler => !expectedDeclaredHosts.includes(handler),
                      ))
                  ) {
                    throw new Error(
                      '[foldkit] Family handler selection requires the original host declarations.',
                    )
                  }

                  const implementation =
                    effectiveHandlers === undefined
                      ? authoredImplementation
                      : authoredImplementation.provideHandlers(
                          effectiveHandlers,
                        )

                  if (
                    isOrdinaryDeclaration &&
                    implementation.hostHandlers.length !== 0 &&
                    !allowPendingHandlers
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
                    publicDescriptor === 'Block' ? declaredBlock : contract,
                    implementation,
                    true,
                    { graph, isCurrent: () => isActive },
                  )

                  return Context.add(
                    Context.make(service, executable),
                    implementationFactsService,
                    executable,
                  )
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
          allowPendingHandlers,
        ),
      provideHandlers: (handlers: Layer.Any) =>
        selectContractHandlers(block, handlers, declaredHosts),
    })

    handlerSelections.set(block, (handlers, hosts) =>
      complete(constructor, provision, handlers, hosts, allowPendingHandlers),
    )

    registerRootConstruction(block, {
      layer,
      readForTesting: block.get,
      read: Effect.map(
        block.get,
        executable => acquisitionOf(executable).block,
      ),
    })

    return block
  }

  const block = {
    ...definition,
    Instance: contract.Instance,
    InMessage: config.InMessage,
    contract,
    makeComposition: (graph: unknown = {}) => {
      const composition = definition.makeComposition(graph)
      const source = authoringSourceOf(composition)
      authoringSources.add(source)
      Object.assign(composition, {
        acquireChildren: () => acquireCompositionChildren(source.bindings),
      })

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
    makeLayer: (implementation: Effect.Effect<any, any, any> | object) => {
      if (Effect.isEffect(implementation)) {
        if ('init' in implementation && 'update' in implementation) {
          throw new Error(
            '[foldkit] A Block constructor Effect must return its implementation fields, not carry them. Pass an implementation record or an Effect constructor separately.',
          )
        }

        return complete(implementation).layer
      }

      for (const field of ['children', 'bindings', 'operations']) {
        if (Object.hasOwn(implementation, field)) {
          throw new Error(
            field === 'children'
              ? '[foldkit] Record Block completion cannot declare "children"; use an Effect constructor for explicit child acquisition.'
              : `[foldkit] Record Block completion cannot declare "${field}"; declare Bindings on the Composition and operations on the Block.`,
          )
        }
      }

      const body = Object.freeze({ ...implementation })
      const constructor = Effect.gen(function* () {
        const source = planComposition<any>(Reflect.get(body, 'init'))

        if (!authoringSources.has(source)) {
          throw new Error(
            '[foldkit] Constructor plans belong to another Definition.',
          )
        }

        const children = yield* acquireCompositionChildren(source.bindings)

        return { ...body, children }
      })

      return complete(constructor).layer
    },
    provideHandlers: (handlers: Layer.Any) => (layer: Layer.Any) => {
      if (!Layer.isLayer(handlers) || !Layer.isLayer(layer)) {
        throw new Error(
          '[foldkit] Block handler selection requires Effect Layers.',
        )
      }

      return Layer.provide(
        layer,
        Layer.succeed(hostSelectionService, {
          handlers,
          declaredHosts: undefined,
        }),
      )
    },
  }

  declaredBlock = block
  layerHandlerSelections.set(block, (layer, handlers, declaredHosts) =>
    Layer.provide(
      layer,
      Layer.succeed(hostSelectionService, { handlers, declaredHosts }),
    ),
  )

  registerDeclaredDescriptor(
    block,
    () => contract.get,
    () =>
      Effect.flatMap(Effect.serviceOption(service), maybeExecutable =>
        Option.match(maybeExecutable, {
          onNone: () => Effect.succeed(Option.none()),
          onSome: executable =>
            Effect.map(
              checkFixedProviderAcquisition(declaredBlock, executable),
              Option.some,
            ),
        }),
      ),
  )
  declaredBlockReaders.set(
    block,
    Effect.map(contract.get, executable => acquisitionOf(executable).block),
  )
  declaredExecutableReaders.set(block, contract.get)

  return block
}

/** @internal Pairs an original public Block with one selected ordinary Layer. */
export const selectLayer = <
  const BlockValue extends DeclaredRootBlock,
  const LayerValue extends Layer.Layer<any, any, any>,
>(
  block: BlockValue,
  layer: LayerValue,
): SelectedLayeredRoot<BlockValue, LayerValue> => {
  const read = declaredBlockReaders.get(block)

  if (read === undefined) {
    throw new Error('[foldkit] Layer selection requires an original Block.')
  }

  const select = declaredLayerSelections.get(block)

  if (select === undefined) {
    return selectLayeredRoot(block, layer, read)
  }

  const construction = select(layer)
  const selected = selectLayeredRoot(block, layer, construction.read)

  registerRootConstruction(selected, construction)

  return selected
}

/** @internal Selects the wrapped executable for scoped Story and Scene fixtures. */
export const selectLayerForTesting = <
  const BlockValue extends DeclaredRootBlock,
  const LayerValue extends Layer.Layer<any, any, any>,
>(
  block: BlockValue,
  layer: LayerValue,
): SelectedLayeredRoot<BlockValue, LayerValue> => {
  const selected = selectLayer(block, layer)
  const read = declaredExecutableReaders.get(block)
  const construction = rootConstructionOf(selected)

  if (read === undefined || construction === undefined) {
    throw new Error('[foldkit] Layer selection requires an original Block.')
  }

  registerRootConstruction(selected, {
    ...construction,
    readForTesting: construction.readForTesting ?? read,
  })

  return selected
}
