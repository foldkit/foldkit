import {
  Array,
  Context,
  Effect,
  Fiber,
  Layer,
  Option,
  Predicate,
  Schema,
  Scope,
} from 'effect'

import { assertCompletedBlock } from '../../block/assemblyState.js'
import {
  registerBindingDeclaration,
  registerExecutableHandle,
} from '../../block/bindingConnection.js'
import {
  bindingLowerersOf,
  makeBindingConstructors,
} from '../../block/bindingConstructors.js'
import type { ValidateSelfContainedDefinitionCodecs } from '../../block/childEnvelope.js'
import { canonicalBindingOf } from '../../block/composition.js'
import { defaultViewOf, registerDefaultView } from '../../block/defaultView.js'
import {
  type AuthoringDefinition,
  makeDefinition as makeCoreDefinition,
} from '../../block/define.js'
import type { AnyBlock } from '../../block/definition.js'
import { assemble } from '../../block/fromAssembly.js'
import { LocalMountsTypeId } from '../../block/identity.js'
import {
  blockInMessageUpdateOf,
  registerBlockInMessageUpdate,
} from '../../block/inMessageUpdate.js'
import { CurrentInstance } from '../../block/instanceContext.js'
import { ExecutionEnvironmentTypeId } from '../../block/operationGraph.js'
import {
  registerAuthoringChildContract,
  registerChildLocalMessageContract,
} from '../../block/outMessageHandlers.js'
import {
  assertRuntimeAuthority,
  declareRuntimeCapability,
} from '../../block/runtimeCapability.js'
import {
  IsConstructingHandler,
  isCapabilityContextKey,
} from '../../block/scope.js'
import { type Command, mapEffect } from '../../command/index.js'
import { registerRootConstruction } from '../../runtime/rootBlock.js'
import { isCallableTaggedStruct } from '../../schema/index.js'
import type { OperationEnvironment } from '../../update/operationRecipe.js'
import {
  compilePlan,
  makeAuthoringComposition,
  planComposition,
  registerViewPlanGraph,
} from '../hybrid/authoring.js'
import type {
  ConstructionKind,
  ConstructorBody,
  Definition,
  SourceOf,
} from './authoring.js'
import type {
  Descriptor,
  InternalExecution,
  LayeredDescriptor,
  ProjectFacts,
} from './contract.js'
import {
  type AcquisitionContext,
  acquisitionOf,
  makeSymbolicBinding,
  registerAcquisition,
  registerDescriptorConstructor,
  registerExecutionBindings,
  registerProvidedExecutableResolver,
  symbolicBindingOf,
  symbolicConnectionOf,
  symbolicEmbeddingOf,
  withConstructionGraph,
} from './symbolic.js'

type AnySchema = Schema.Codec<any, any, any, any>
type AnySelfContainedSchema = Schema.Codec<any, any, never, never>
type AnyFunction = (...args: ReadonlyArray<any>) => any
type ConstructedImplementation<Body extends ConstructorBody> = AnyBlock &
  Readonly<{
    Model: SourceOf<Body>['Model']
    Message: SourceOf<Body>['Message']
  }>
type RuntimeReturn = Readonly<{
  model: unknown
  commands?: ReadonlyArray<Command<unknown, never, any>>
  outMessage?: unknown
}>
type StaticInventory = Readonly<{
  definition: any
  bindings: ReadonlyArray<object>
  mounts: ReadonlyArray<object>
}>

const descriptors = new WeakSet<object>()
const inventories = new WeakMap<object, StaticInventory>()
let nextExecutionIdentity = 0

/** @internal Wraps a checked implementation without exposing its private graph. */
export const wrapExecutable = <Implementation extends AnyBlock>(
  descriptor: any,
  implementation: Implementation,
  opaqueRuntime = false,
  acquisition: AcquisitionContext,
): object => {
  assertCompletedBlock(implementation)
  registerChildLocalMessageContract(implementation, descriptor.Message)

  if (Object.hasOwn(implementation.operations, 'then')) {
    throw new Error(
      '[foldkit] Block construction reserves the operation name "then".',
    )
  }

  const execution = Context.Service<
    InternalExecution<typeof descriptor.owner>,
    Readonly<{
      handlers: Context.Context<never>
      capabilities: Context.Context<never>
    }>
  >(
    `foldkit/ConstructedBlock/${descriptor.owner.id}/${nextExecutionIdentity++}`,
  )
  const runtimeCapability = opaqueRuntime
    ? declareRuntimeCapability(implementation, descriptor.owner)
    : undefined
  const EffectsLayer = Layer.effect(
    execution,
    Effect.gen(function* () {
      const inputs = yield* Effect.context<never>()
      const capabilities = Context.makeUnsafe<never>(
        new Map(
          Array.filter(Array.fromIterable(inputs.mapUnsafe), ([key]) =>
            isCapabilityContextKey(key),
          ),
        ),
      )
      const handlers = yield* Layer.build(implementation.EffectsLayer).pipe(
        Effect.provideContext(inputs),
      )

      return { handlers, capabilities }
    }),
  )
  const wrapReturn = (result: RuntimeReturn): RuntimeReturn => {
    if (result.commands === undefined) {
      return result
    }

    return {
      ...result,
      commands: result.commands.map(command =>
        mapEffect(command, effect =>
          Effect.flatMap(execution, ({ handlers, capabilities }) => {
            const provided = Effect.updateContext(effect, invocation =>
              Context.merge(Context.merge(capabilities, invocation), handlers),
            )

            if (runtimeCapability === undefined) {
              return provided
            }

            return Effect.flatMap(runtimeCapability, authority =>
              assertRuntimeAuthority(authority, implementation).pipe(
                Effect.andThen(
                  Effect.acquireUseRelease(
                    Effect.forkIn(authority.node.scope)(
                      Effect.updateContext(provided, invocation =>
                        Context.add(
                          Context.add(
                            Context.merge(invocation, authority.node.resources),
                            CurrentInstance,
                            Context.get(invocation, CurrentInstance) ?? {
                              node: authority.node,
                            },
                          ),
                          IsConstructingHandler,
                          false,
                        ),
                      ),
                    ),
                    Fiber.join,
                    Fiber.interrupt,
                  ),
                ),
              ),
            )
          }),
        ),
      ),
    }
  }
  const Message = Schema.make(implementation.Message.ast)
  const inputUpdate = blockInMessageUpdateOf(implementation)
  const inMessageUpdate =
    inputUpdate === undefined
      ? undefined
      : (...args: ReadonlyArray<unknown>) => {
          const output = Reflect.apply(
            inputUpdate.inMessageUpdate,
            undefined,
            args,
          )

          if (Predicate.isFunction(output)) {
            return (...context: ReadonlyArray<unknown>) =>
              wrapReturn(Reflect.apply(output, undefined, context))
          }

          return wrapReturn(output)
        }

  for (const [name, property] of Object.entries(
    Object.getOwnPropertyDescriptors(descriptor.Message),
  )) {
    if (isCallableTaggedStruct(property.value)) {
      Object.defineProperty(Message, name, property)
    }
  }

  const executable = Object.freeze({
    owner: descriptor.owner,
    Model: descriptor.Model,
    Message,
    OutMessage: descriptor.OutMessage,
    InMessage: inputUpdate?.InMessage,
    inMessageUpdate: inMessageUpdate,
    init: (...args: ReadonlyArray<unknown>) =>
      wrapReturn(implementation.init(...args)),
    update: (...args: ReadonlyArray<unknown>) => {
      const output = implementation.update(...args)

      if (Predicate.isFunction(output)) {
        return (...context: ReadonlyArray<unknown>) =>
          wrapReturn(output(...context))
      }

      return wrapReturn(output)
    },
    operations: Object.fromEntries(
      Object.entries(implementation.operations).map(([name, operation]) => [
        name,
        (...args: ReadonlyArray<unknown>) =>
          wrapReturn(Reflect.apply(operation, undefined, args)),
      ]),
    ),
    EffectsLayer,
  })
  registerExecutableHandle(executable, implementation)
  registerAcquisition(
    executable,
    descriptor,
    implementation,
    acquisition.graph,
    acquisition.isCurrent,
  )
  registerDefaultView(executable, defaultViewOf(implementation))

  return executable
}

/** @internal Registers a passive declaration whose implementation may be supplied by a Service. */
export const registerDeclaredDescriptor = (
  descriptor: object,
  construct: () => Effect.Effect<object, any, any>,
  resolveProvided?: () => Effect.Effect<Option.Option<object>, any, any>,
): void => {
  descriptors.add(descriptor)
  registerAuthoringChildContract(descriptor)
  registerDescriptorConstructor(descriptor, construct)

  if (resolveProvided !== undefined) {
    registerProvidedExecutableResolver(descriptor, resolveProvided)
  }
}

const makeDescriptor = (
  definition: Readonly<{
    owner: object
    Model: AnySchema
    Message: AnySchema
    OutMessage?: AnySchema | undefined
  }>,
  constructor: (graph: object) => Effect.Effect<AnyBlock, any, any>,
  kind: ConstructionKind = 'Effect',
  provideConstruction: (
    layer: Layer.Layer<any, any, any>,
  ) => Layer.Layer<any, any, any> = layer => layer,
): any => {
  if (kind === 'Layer') {
    const output = Context.Service<unknown, object>(
      `foldkit/LayeredBlock/${nextExecutionIdentity++}`,
    )
    const layer: Layer.Layer<unknown, any, any> = provideConstruction(
      Layer.fromBuildMemo((memoMap, scope) =>
        withConstructionGraph(
          graph =>
            Effect.gen(function* () {
              let isActive = true
              yield* Scope.addFinalizer(
                scope,
                Effect.sync(() => {
                  isActive = false
                }),
              )
              const block = yield* constructor(graph).pipe(
                Scope.provide(scope),
                Effect.provideService(Layer.CurrentMemoMap, memoMap),
              )

              return Context.make(
                output,
                wrapExecutable(descriptor, block, false, {
                  graph,
                  isCurrent: () => isActive,
                }),
              )
            }),
          scope,
        ),
      ),
    )
    const descriptor = Object.freeze({
      owner: definition.owner,
      Model: definition.Model,
      Message: definition.Message,
      OutMessage: definition.OutMessage,
      layer,
      get: Effect.map(output, executable => executable),
      provide: (dependencies: Layer.Layer<any, any, any>) =>
        makeDescriptor(definition, constructor, 'Layer', currentLayer =>
          Layer.provide(
            Layer.fresh(provideConstruction(currentLayer)),
            dependencies,
          ),
        ),
    })
    registerDeclaredDescriptor(
      descriptor,
      () =>
        Effect.gen(function* () {
          const memoMap = yield* Layer.CurrentMemoMap
          const scope = yield* Effect.scope
          const context = yield* Layer.buildWithMemoMap(layer, memoMap, scope)

          return Context.get(context, output)
        }),
      () => Effect.serviceOption(output),
    )
    registerRootConstruction(descriptor, {
      layer,
      readForTesting: descriptor.get,
      read: Effect.map(
        descriptor.get,
        executable => acquisitionOf(executable).block,
      ),
    })

    return descriptor
  }

  const descriptor = Object.freeze({
    owner: definition.owner,
    Model: definition.Model,
    Message: definition.Message,
    OutMessage: definition.OutMessage,
    construct: () =>
      withConstructionGraph(graph =>
        Effect.gen(function* () {
          let isActive = true
          const maybeScope = yield* Effect.serviceOption(Scope.Scope)

          if (Option.isSome(maybeScope)) {
            yield* Scope.addFinalizer(
              maybeScope.value,
              Effect.sync(() => {
                isActive = false
              }),
            )
          }

          const block = yield* constructor(graph)

          return wrapExecutable(descriptor, block, false, {
            graph,
            isCurrent: () => isActive,
          })
        }),
      ),
  })
  registerDeclaredDescriptor(descriptor, descriptor.construct)

  return descriptor
}

const makeBuilderAdapter = (
  environment: OperationEnvironment,
): ((builder: object) => object) => {
  const builders = new WeakMap<object, object>()

  return builder => {
    const cached = builders.get(builder)

    if (cached !== undefined) {
      return cached
    }

    const nativeBlock = Reflect.get(builder, 'block')
    const adapted = {
      ...builder,
      block: (embedding: object) => {
        const symbolic = symbolicEmbeddingOf(embedding)

        if (symbolic === undefined) {
          return Reflect.apply(nativeBlock, builder, [embedding])
        }

        const actual = environment.get(symbolic.binding)

        if (actual === undefined) {
          throw new Error('[foldkit] This view uses an unconnected Binding.')
        }

        const resolved = Reflect.apply(
          Reflect.get(actual, 'embedView'),
          actual,
          [symbolic.config],
        )

        return Reflect.apply(nativeBlock, builder, [resolved])
      },
    }

    builders.set(builder, adapted)
    builders.set(adapted, adapted)

    return adapted
  }
}

/** @internal Compiles one declared input protocol against its acquired native graph. */
export type CompileInMessageUpdate = (
  actual: any,
  source: any,
  environment: OperationEnvironment,
) => Readonly<{
  InMessage: Schema.Top
  inMessageUpdate: AnyFunction
  operations: Readonly<Record<string, AnyFunction>>
}>

const constructImplementation = <const Body extends ConstructorBody>(
  definition: any,
  body: Body &
    ValidateSelfContainedDefinitionCodecs<
      SourceOf<Body>['Model'],
      SourceOf<Body>['Message']
    >,
  compileInMessageUpdate?: CompileInMessageUpdate,
  graph?: object,
): ConstructedImplementation<Body> => {
  const source = planComposition<any>(body.init)
  const inventory = inventories.get(source)

  if (inventory === undefined || inventory.definition !== definition) {
    throw new Error('[foldkit] Constructor plans belong to another Definition.')
  }

  const expected = new Set(inventory.bindings)
  const environment = new Map<object, object>()
  const actualBindings: Array<object> = []

  for (const connection of body.children) {
    const { binding, child, canonicalGraph } = symbolicConnectionOf(connection)

    if (!expected.delete(binding)) {
      throw new Error(
        '[foldkit] The constructor contains an unknown or duplicate Binding connection.',
      )
    }

    const declaration = symbolicBindingOf(binding)
    const acquisition = acquisitionOf(child)
    if (!acquisition.isCurrent()) {
      throw new Error(
        '[foldkit] A Binding cannot connect an executable after its acquisition Scope has closed.',
      )
    }

    if (
      graph === undefined ||
      (acquisition.graph !== graph && canonicalGraph !== graph)
    ) {
      throw new Error(
        '[foldkit] A Binding can connect only an executable acquired in this construction graph.',
      )
    }

    const lowerers = bindingLowerersOf(definition)
    const lower = declaration.kind === 'Map' ? lowerers.map : lowerers.direct
    const initial = lower(acquisition.block, declaration.config)
    const selected =
      declaration.policy === undefined
        ? initial
        : Reflect.apply(Reflect.get(initial, 'withOutMessagePolicy'), initial, [
            declaration.policy,
          ])

    if (!Predicate.isObject(selected)) {
      throw new Error('[foldkit] A Binding constructor must return a Binding.')
    }

    const actual = canonicalBindingOf(selected)

    registerBindingDeclaration(actual, declaration.original)
    environment.set(declaration.original, actual)
    actualBindings.push(selected)
  }

  if (expected.size !== 0) {
    throw new Error(
      '[foldkit] The constructor is missing a registered Binding connection.',
    )
  }

  const actual = definition.makeComposition({
    bindings: actualBindings,
    mounts: inventory.mounts,
    [ExecutionEnvironmentTypeId]: environment,
  })
  const adaptBuilder = makeBuilderAdapter(environment)
  const makeView = actual.makeView
  actual.makeView = Object.assign(
    (view: AnyFunction) =>
      makeView((model: unknown, h: object) => view(model, adaptBuilder(h))),
    {
      withInputs: (view: AnyFunction) =>
        makeView.withInputs((model: unknown, inputs: unknown, h: object) =>
          view(model, inputs, adaptBuilder(h)),
        ),
    },
  )

  const {
    children: _connections,
    init,
    update,
    inMessageUpdate: inMessageUpdatePlan,
    view,
    ...implementation
  } = body

  if (
    inMessageUpdatePlan !== undefined &&
    compileInMessageUpdate === undefined
  ) {
    throw new Error(
      '[foldkit] An inMessageUpdate plan requires a declared InMessage Schema.',
    )
  }

  const inputUpdate = compileInMessageUpdate?.(actual, source, environment)
  const operations: Record<string, unknown> = { ...implementation.operations }

  for (const [name, operation] of Object.entries(
    inputUpdate?.operations ?? {},
  )) {
    if (Object.hasOwn(operations, name)) {
      throw new Error(
        `[foldkit] InMessage operation "${name}" conflicts with an explicit operation.`,
      )
    }

    operations[name] = operation
  }

  const compiled = {
    ...implementation,
    operations,
    init: compilePlan(init, actual, source),
    update: compilePlan(update, actual, source),
    ...(view === undefined ? {} : { view: compilePlan(view, actual, source) }),
  }

  const block = Reflect.apply(assemble, undefined, [
    () => actual.prepareBlock(compiled),
  ])

  registerExecutionBindings(block, environment)
  registerViewPlanGraph(block, source, actual)

  if (inputUpdate !== undefined) {
    registerBlockInMessageUpdate(
      block,
      inputUpdate.InMessage,
      inputUpdate.inMessageUpdate,
    )
  }

  return block
}

/** @internal Completes plans using their original Definition and immutable relationship inventory. */
export const constructAuthoredImplementation = <
  const Body extends ConstructorBody,
>(
  body: Body &
    ValidateSelfContainedDefinitionCodecs<
      SourceOf<Body>['Model'],
      SourceOf<Body>['Message']
    >,
  compileInMessageUpdate?: CompileInMessageUpdate,
  graph?: object,
): ConstructedImplementation<Body> => {
  const source = planComposition(body.init)
  const inventory = inventories.get(source)

  if (inventory === undefined) {
    throw new Error(
      '[foldkit] Constructor plans require an original Definition.',
    )
  }

  return constructImplementation(
    inventory.definition,
    body,
    compileInMessageUpdate,
    graph,
  )
}

type DeclaredOutMessage<BlockValue> =
  BlockValue extends Readonly<{ OutMessage: infer Out extends AnySchema }>
    ? Out
    : undefined

type SameContract<Left, Right> = [Left, Right] extends [Right, Left]
  ? true
  : false

type ReplacementArguments<
  Contract extends AnyBlock,
  Selected extends AnyBlock,
> =
  SameContract<
    readonly [
      Contract['owner'],
      Contract['Model'],
      Contract['Message'],
      DeclaredOutMessage<Contract>,
    ],
    readonly [
      Selected['owner'],
      Selected['Model'],
      Selected['Message'],
      DeclaredOutMessage<Selected>,
    ]
  > extends true
    ? readonly []
    : readonly [incompatibleCanonicalContracts: never]

/** Adds a construction recipe to an existing checked Block for the bounded migration proof. */
export function fromBlock<const BlockValue extends AnyBlock>(
  block: BlockValue,
): Descriptor<
  BlockValue['owner'],
  BlockValue['Model'],
  BlockValue['Message'],
  DeclaredOutMessage<BlockValue>,
  ProjectFacts<BlockValue['Message'], BlockValue>,
  never,
  never
>
/** Infers the selected implementation's exact Layer channels while retaining canonical Schemas. */
export function fromBlock<
  const Contract extends AnyBlock,
  const Selected extends AnyBlock,
  Error,
  Requirements,
>(
  block: Contract,
  constructor: Effect.Effect<Selected, Error, Requirements>,
  ...validation: ReplacementArguments<Contract, NoInfer<Selected>>
): Descriptor<
  Contract['owner'],
  Contract['Model'],
  Contract['Message'],
  DeclaredOutMessage<Contract>,
  ProjectFacts<Contract['Message'], Selected>,
  Error,
  Requirements
>
export function fromBlock(
  block: any,
  constructor: Effect.Effect<any, any, any> = Effect.succeed(block),
): any {
  assertCompletedBlock(block)
  const canonical: any = block

  if (Object.hasOwn(canonical.operations, 'then')) {
    throw new Error(
      '[foldkit] Block construction reserves the operation name "then".',
    )
  }

  return makeDescriptor(canonical, () =>
    Effect.map(constructor, selected => {
      if (
        selected.owner !== canonical.owner ||
        selected.Model !== canonical.Model ||
        selected.Message !== canonical.Message ||
        selected.OutMessage !== canonical.OutMessage
      ) {
        throw new Error(
          '[foldkit] An adapted constructor must retain the canonical Block contracts.',
        )
      }

      return selected
    }),
  )
}

/** @internal Selects construction ownership while retaining the same typed authoring surface. */
export const makeDefinitionFactory =
  <const Kind extends ConstructionKind>(kind: Kind) =>
  <
    const Id extends string,
    const ModelSchema extends AnySelfContainedSchema,
    const MessageSchema extends AnySelfContainedSchema,
    const OutMessageSchema extends AnySchema | undefined = undefined,
    const ChildInitContextSchema extends AnySchema | undefined = undefined,
  >(
    id: Id &
      (Id extends '' | `${string}/${string}` | `${string}::${string}`
        ? never
        : unknown) &
      (string extends Id ? never : unknown),
    contracts: Readonly<{
      Model: ModelSchema
      Message: MessageSchema
      OutMessage?: OutMessageSchema
      ChildInitContext?: ChildInitContextSchema
    }>,
    sourceDefinition?: AuthoringDefinition<
      Id,
      ModelSchema,
      MessageSchema,
      OutMessageSchema,
      true,
      ChildInitContextSchema
    >,
  ): Definition<
    Id,
    ModelSchema,
    MessageSchema,
    OutMessageSchema,
    ChildInitContextSchema,
    Kind
  > => {
    const definition: any =
      sourceDefinition ??
      Reflect.apply(makeCoreDefinition, undefined, [id, contracts])

    if (
      definition.owner.id !== id ||
      definition.Model !== contracts.Model ||
      definition.Message !== contracts.Message ||
      definition.OutMessage !== contracts.OutMessage ||
      definition.ChildInitContext !== contracts.ChildInitContext
    ) {
      throw new Error(
        '[foldkit] A constructed Definition requires its original namespace and canonical Schema contracts.',
      )
    }
    const makeComposition = (graph: any = {}) => {
      const bindings: ReadonlyArray<object> = Object.freeze([
        ...(graph.bindings ?? []),
      ])
      const mounts: ReadonlyArray<object> = Object.freeze([
        ...(graph.mounts ?? []),
      ])
      const placements = new Set<string>()

      for (const binding of bindings) {
        const declaration = symbolicBindingOf(binding)

        if (declaration.definition !== definition) {
          throw new Error(
            '[foldkit] A Binding belongs to another parent Definition.',
          )
        }

        const placement = Reflect.get(binding, 'placement')

        if (placements.has(placement)) {
          throw new Error(
            '[foldkit] Bindings require distinct local placements.',
          )
        }

        placements.add(placement)

        if (
          Schema.isSchema(Reflect.get(declaration.child, 'OutMessage')) &&
          declaration.policy === undefined
        ) {
          throw new Error(
            '[foldkit] A Binding requires its parent-owned OutMessage policy.',
          )
        }
      }

      const source: any = {
        owner: definition.owner,
        Model: contracts.Model,
        ...(contracts.OutMessage === undefined
          ? {}
          : { OutMessage: contracts.OutMessage }),
        bindings,
        [LocalMountsTypeId]: mounts,
      }
      inventories.set(source, {
        definition,
        bindings,
        mounts,
      })

      return makeAuthoringComposition(source)
    }

    const assertChild = (child: object): void => {
      if (!descriptors.has(child)) {
        throw new Error(
          '[foldkit] A Binding requires an original registered Block contract.',
        )
      }

      if (kind === 'Layer' && !Layer.isLayer(Reflect.get(child, 'layer'))) {
        throw new Error(
          '[foldkit] Layer-owned Bindings require a child graph Layer.',
        )
      }
    }

    const direct = (child: object, config: Readonly<Record<string, any>>) => {
      assertChild(child)

      return makeSymbolicBinding(definition, child, config)
    }

    const map = (child: object, config: Readonly<Record<string, any>>) => {
      assertChild(child)

      return makeSymbolicBinding(definition, child, config, 'Map')
    }

    const authored = {
      ...definition,
      makeComposition,
      makeBlock: (constructor: Effect.Effect<any, any, any>) =>
        makeDescriptor(
          { owner: definition.owner, ...contracts },
          graph =>
            Effect.map(constructor, body =>
              constructImplementation(definition, body, undefined, graph),
            ),
          kind,
        ),
    }

    return Object.assign(
      authored,
      makeBindingConstructors(authored, direct, map, assertChild),
    )
  }

/** Extends the current Definition with passive typed builders and explicit graph construction. */
export const makeDefinition = makeDefinitionFactory('Effect')

/** Adapts an existing checked Block to Layer-owned graph construction without building its handlers. */
export const fromLayeredBlock = <const BlockValue extends AnyBlock>(
  block: BlockValue,
): LayeredDescriptor<
  BlockValue['owner'],
  BlockValue['Model'],
  BlockValue['Message'],
  DeclaredOutMessage<BlockValue>,
  ProjectFacts<BlockValue['Message'], BlockValue>,
  never,
  never
> => {
  assertCompletedBlock(block)

  return makeDescriptor(block, () => Effect.succeed(block), 'Layer')
}
