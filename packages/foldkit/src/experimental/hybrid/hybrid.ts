import { Context, Effect, Layer, Predicate, Schema } from 'effect'

import type {
  AnyBinding,
  BindableBlock,
  BlockOfBinding,
} from '../../block/binding.js'
import type { NativeRelationshipConstructors } from '../../block/bindingAuthoring.js'
import {
  type BindingConnection,
  ConnectBindingTypeId,
  type ConstructedChild,
  bindingViewRecipeOf,
  isBindingConnection,
  makeConstructedChild,
  reconnectBinding,
} from '../../block/bindingConnection.js'
import {
  bindingLowerersOf,
  makeBindingConstructors,
} from '../../block/bindingConstructors.js'
import { copyBindingOutMessagePolicy } from '../../block/bindingOutMessagePolicy.js'
import {
  canonicalBindingOf,
  registerBindingAlias,
} from '../../block/composition.js'
import {
  type AuthoringDefinition,
  makeDefinition as makeCoreDefinition,
} from '../../block/define.js'
import type {
  Completed,
  Composition,
  ImplementationRecipeArguments,
  ImplementationRecipeValidation,
  ValidateChildBindings,
} from '../../block/definition.js'
import type { CompositionDeliveryArguments } from '../../block/delivery.js'
import { assemble } from '../../block/fromAssembly.js'
import { LocalMountsTypeId } from '../../block/identity.js'
import type { ValidateChildInitContext } from '../../block/initialization.js'
import { ExecutionEnvironmentTypeId } from '../../block/operationGraph.js'
import type { Owner } from '../../block/owner.js'
import type * as Mount from '../../mount/index.js'
import type { OperationEnvironment } from '../../update/operationRecipe.js'
import {
  type AuthoringCompositionOf,
  type AuthoringSource,
  type CompositionOfPlan,
  type Plan,
  type PlanOutput,
  compilePlan,
  makeAuthoringComposition,
  planComposition,
} from './authoring.js'
import type { ConnectableRelationshipConstructors } from './binding.js'

type AnySchema = Schema.Codec<any, any, any, any>
type AnySelfContainedSchema = Schema.Codec<any, any, never, never>
type AnyFunction = (...args: ReadonlyArray<any>) => any

type StaticComposition = Readonly<{
  owner: Owner<string>
  Model: AnySelfContainedSchema
  Message: AnySelfContainedSchema
  OutMessage?: AnySchema | undefined
  bindings: ReadonlyArray<AnyBinding>
  [LocalMountsTypeId]: ReadonlyArray<Mount.LayeredMountDefinition>
}>

/** One ordinary Layer service supplying a passive constructor recipe. */
export interface ConstructorProvider<Id extends string, BlockValue> {
  readonly id: Id
  readonly block: (_: BlockValue) => BlockValue
}

/** A construction-capable child descriptor. Its contract is already completed. */
export interface ChildConstructor<
  Id extends string,
  BlockValue extends BindableBlock,
  Error,
  Requirements,
> {
  <const Placement extends string>(
    placement: Placement,
  ): Effect.Effect<
    ConstructedChild<BlockValue, Placement>,
    Error,
    Requirements | ConstructorProvider<Id, BlockValue>
  >
  readonly contract: BlockValue
  readonly build: Effect.Effect<BlockValue, Error, Requirements>
  readonly layer: Layer.Layer<ConstructorProvider<Id, BlockValue>>
  readonly toLayer: (
    constructor: Effect.Effect<BlockValue, Error, Requirements>,
  ) => Layer.Layer<ConstructorProvider<Id, BlockValue>>
}

/** A completed authoring product whose executable must be acquired in a Scope. */
export interface ConstructedBlock<BlockValue, Error, Requirements> {
  readonly build: Effect.Effect<BlockValue, Error, Requirements>
}

type IsUnion<Value, Whole = Value> = Value extends unknown
  ? [Whole] extends [Value]
    ? false
    : true
  : never

type LiteralConstructorId<Id extends string> = [Id] extends ['']
  ? never
  : {} extends Record<Id, unknown>
    ? never
    : true extends IsUnion<Id>
      ? never
      : Id

const constructorContracts = new Map<string, BindableBlock>()

/** Selects a real child implementation through a normal Layer-held recipe. */
export const fromBlock = <
  const Id extends string,
  const BlockValue extends BindableBlock,
  Error = never,
  Requirements = never,
>(
  id: Id & LiteralConstructorId<Id>,
  contract: BlockValue,
  construct: Effect.Effect<
    NoInfer<BlockValue>,
    Error,
    Requirements
  > = Effect.succeed(contract),
): ChildConstructor<Id, BlockValue, Error, Requirements> => {
  if (!Predicate.isString(id) || id.length === 0) {
    throw new Error(
      '[foldkit] A constructor provider requires a nonempty literal Id.',
    )
  }

  const previous = constructorContracts.get(id)
  if (previous !== undefined && previous !== contract) {
    throw new Error(
      '[foldkit] A constructor provider Id must name one canonical Block contract.',
    )
  }

  constructorContracts.set(id, contract)
  const provider = Context.Service<
    ConstructorProvider<Id, BlockValue>,
    Effect.Effect<BlockValue, Error, Requirements>
  >(`foldkit/Hybrid/${id}/Constructor`)
  const child = <const Placement extends string>(placement: Placement) =>
    Effect.gen(function* () {
      const recipe = yield* provider
      const block = yield* recipe
      return makeConstructedChild(block, placement)
    })

  return Object.assign(child, {
    contract,
    build: construct,
    layer: Layer.succeed(provider, construct),
    toLayer: (constructor: Effect.Effect<BlockValue, Error, Requirements>) =>
      Layer.succeed(provider, constructor),
  })
}

type ExpectedConnection<Binding> =
  Binding extends Readonly<{ placement: infer Placement extends string }>
    ? BindingConnection<BlockOfBinding<Binding>, Placement>
    : never

type BodyFor<Static extends StaticComposition> = Readonly<{
  bindings: ReadonlyArray<ExpectedConnection<Static['bindings'][number]>>
  init: Plan<AnyFunction, 'Init', Static>
  update: Plan<AnyFunction, 'Update', Static>
  view?: Plan<unknown, 'View', Static>
  operations?: Readonly<Record<string, AnyFunction>>
  subscriptions?: object
  managedResources?: object
  EffectsLayer?: Layer.Any
}>

/** Resolves passive authoring products without widening their exact channels. */
export type ExecutableImplementation<Body> = {
  readonly [
    Key in Exclude<keyof Body, 'bindings' | 'children'>
  ]: Body[Key] extends Plan<unknown> ? PlanOutput<Body[Key]> : Body[Key]
}

type MissingConnections<
  Static extends StaticComposition,
  Body extends BodyFor<Static>,
> = Exclude<
  Static['bindings'][number]['placement'],
  Body['bindings'][number]['child']['placement']
>

type MakeValidation<
  Static extends StaticComposition,
  Body extends BodyFor<Static>,
> = [MissingConnections<Static, Body>] extends [never]
  ? ImplementationRecipeArguments<
      ExecutableImplementation<Body>,
      ImplementationRecipeValidation<
        Static['owner'],
        Static['Model'],
        Static['Message'],
        Static extends { readonly OutMessage: infer Out extends AnySchema }
          ? Out
          : undefined,
        Static[typeof LocalMountsTypeId],
        Static['bindings'],
        ExecutableImplementation<Body>
      >
    >
  : [missingConnections: MissingConnections<Static, Body>]

/** Finishes typed plans against the children acquired by an Effect constructor. */
export interface MakeBlock<Static extends StaticComposition> {
  <const Body extends BodyFor<Static>, Error, Requirements>(
    constructor: Effect.Effect<Body, Error, Requirements>,
    ...validation: MakeValidation<Static, NoInfer<Body>>
  ): ConstructedBlock<
    Completed<Static, ExecutableImplementation<Body>>,
    Error,
    Requirements
  >
}

type ConstructorBody = Readonly<{
  bindings: ReadonlyArray<BindingConnection<unknown, string>>
  init: Plan<AnyFunction, 'Init', AuthoringSource>
  update: Plan<AnyFunction, 'Update', AuthoringSource>
  view?: Plan<unknown, 'View', AuthoringSource>
  operations?: Readonly<Record<string, AnyFunction>>
  subscriptions?: object
  managedResources?: object
  EffectsLayer?: Layer.Any
}>

type CompositionOfBody<Body extends ConstructorBody> = Extract<
  CompositionOfPlan<Body['init']>,
  StaticComposition
>

type Equal<Left, Right> = [Left, Right] extends [Right, Left] ? true : false

type DefinitionMakeValidation<
  Id extends string,
  ModelSchema,
  Body extends ConstructorBody,
> =
  Equal<CompositionOfBody<Body>['owner'], Owner<Id, true>> extends true
    ? Equal<CompositionOfBody<Body>['Model'], ModelSchema> extends true
      ? Body extends BodyFor<CompositionOfBody<Body>>
        ? MakeValidation<CompositionOfBody<Body>, Body>
        : readonly [incompatiblePlansOrConnections: never]
      : readonly [incorrectModelContract: never]
    : readonly [incorrectDefinitionOwner: never]

/** Infers the static graph from exact plans while construction owns executable connections. */
export interface MakeBlockFromDefinition<Id extends string, ModelSchema> {
  <const Body extends ConstructorBody, Error, Requirements>(
    constructor: Effect.Effect<Body, Error, Requirements>,
    ...validation: DefinitionMakeValidation<Id, ModelSchema, NoInfer<Body>>
  ): ConstructedBlock<
    Completed<CompositionOfBody<Body>, ExecutableImplementation<Body>>,
    Error,
    Requirements
  >
}

/** Static authoring graph plus effectful, checked executable construction. */
export type HybridComposition<Static extends StaticComposition> =
  AuthoringCompositionOf<Static> &
    Readonly<{
      makeBlock: MakeBlock<Static>
    }>

/** Contextual graph registration before executable children are acquired. */
export interface MakeComposition<
  Id extends string,
  ModelSchema extends AnySelfContainedSchema,
  MessageSchema extends AnySelfContainedSchema,
  OutMessageSchema extends AnySchema | undefined,
  ChildInitContextSchema extends AnySchema | undefined,
> {
  (
    ...validation: CompositionDeliveryArguments<
      MessageSchema['Type'],
      readonly []
    >
  ): HybridComposition<
    Composition<
      Owner<Id, true>,
      ModelSchema,
      MessageSchema,
      OutMessageSchema,
      readonly [],
      readonly []
    >
  >
  <
    const Mounts extends ReadonlyArray<Mount.LayeredMountDefinition> =
      readonly [],
    const Bindings extends ReadonlyArray<AnyBinding> = readonly [],
  >(
    graph: Readonly<{
      mounts?: Mounts & Mount.PreciseMountRegistry<Mounts>
      bindings?: Bindings
    }> &
      ValidateChildInitContext<
        Bindings,
        ChildInitContextSchema extends AnySchema
          ? ChildInitContextSchema['Type']
          : never
      > &
      ValidateChildBindings<
        Bindings,
        ModelSchema['Type'],
        MessageSchema['Type'],
        OutMessageSchema extends AnySchema ? OutMessageSchema['Type'] : never
      >,
  ): HybridComposition<
    Composition<
      Owner<Id, true>,
      ModelSchema,
      MessageSchema,
      OutMessageSchema,
      Mounts,
      Bindings
    >
  >
}

/** Familiar Definition authorship with construction owned by its static Composition. */
export type Definition<
  Id extends string,
  ModelSchema extends AnySelfContainedSchema,
  MessageSchema extends AnySelfContainedSchema,
  OutMessageSchema extends AnySchema | undefined,
  ChildInitContextSchema extends AnySchema | undefined,
> = Omit<
  AuthoringDefinition<
    Id,
    ModelSchema,
    MessageSchema,
    OutMessageSchema,
    true,
    ChildInitContextSchema
  >,
  | 'makeComposition'
  | keyof NativeRelationshipConstructors<
      ModelSchema,
      MessageSchema,
      OutMessageSchema,
      never
    >
> &
  ConnectableRelationshipConstructors<
    ModelSchema,
    MessageSchema,
    OutMessageSchema,
    ChildInitContextSchema extends AnySchema
      ? ChildInitContextSchema['Type']
      : never
  > &
  Readonly<{
    makeBlock: MakeBlockFromDefinition<Id, ModelSchema>
    makeComposition: MakeComposition<
      Id,
      ModelSchema,
      MessageSchema,
      OutMessageSchema,
      ChildInitContextSchema
    >
  }>

const connectionDeclarations = new WeakMap<
  object,
  Readonly<{ placement: string }>
>()

const withConnection = (binding: Readonly<{ placement: string }>): object => {
  if (Object.hasOwn(binding, 'connect')) {
    throw new Error(
      '[foldkit] Experimental Binding operations cannot be named "connect".',
    )
  }

  const selectPolicy = Reflect.get(binding, 'withOutMessagePolicy')
  const connected = Object.create(Object.getPrototypeOf(binding), {
    ...Object.getOwnPropertyDescriptors(binding),
    connect: {
      enumerable: true,
      value(
        this: Readonly<{ placement: string }>,
        child: ConstructedChild<unknown, string>,
      ) {
        return Reflect.apply(Reflect.get(binding, ConnectBindingTypeId), this, [
          child,
        ])
      },
    },
    ...(Predicate.isFunction(selectPolicy)
      ? {
          withOutMessagePolicy: {
            enumerable: false,
            value: (policy: unknown) =>
              withConnection(Reflect.apply(selectPolicy, binding, [policy])),
          },
        }
      : {}),
  })

  registerBindingAlias(connected, binding)
  connectionDeclarations.set(connected, binding)

  return Object.freeze(connected)
}

const viewBuilder = (
  builder: object,
  environment: OperationEnvironment,
): object =>
  new Proxy(builder, {
    get(target, key, receiver) {
      if (key !== 'block') {
        return Reflect.get(target, key, receiver)
      }

      const block = Reflect.get(target, key)
      return (config: object) => {
        const declaration = bindingViewRecipeOf(config)
        if (declaration === undefined) {
          return Reflect.apply(block, target, [config])
        }

        const actual = environment.get(canonicalBindingOf(declaration.binding))
        if (actual === undefined) {
          throw new Error('[foldkit] View references an unconnected Binding.')
        }

        const embedded = Reflect.apply(
          Reflect.get(actual, 'embedView'),
          actual,
          [declaration.config],
        )
        return Reflect.apply(block, target, [embedded])
      }
    },
  })

const runtimeMake =
  (definition: any, staticComposition: any): AnyFunction =>
  (constructor: Effect.Effect<any, any, any>) => ({
    build: Effect.map(constructor, body => {
      const environment = new Map<object, object>()
      const connections = body.bindings
      const actualBindings: Array<object> = []
      const expected = new Set(
        staticComposition.bindings.map((binding: object) =>
          canonicalBindingOf(binding),
        ),
      )

      for (const connection of connections) {
        if (!isBindingConnection(connection)) {
          throw new Error(
            '[foldkit] Hybrid construction requires Binding connections.',
          )
        }

        const declaration = canonicalBindingOf(connection.binding)
        if (!expected.delete(declaration)) {
          throw new Error(
            '[foldkit] Hybrid construction has an unknown or duplicate connection.',
          )
        }

        const actual = reconnectBinding(
          connection.binding,
          connection.child.block,
        )
        const selected = copyBindingOutMessagePolicy(
          connectionDeclarations.get(connection.binding) ?? connection.binding,
          actual,
        )
        environment.set(declaration, canonicalBindingOf(actual))
        environment.set(connection.binding, canonicalBindingOf(actual))
        actualBindings.push(selected)
      }

      if (expected.size !== 0) {
        throw new Error(
          '[foldkit] Hybrid construction is missing a child connection.',
        )
      }

      const actual = definition.makeComposition({
        mounts: staticComposition[LocalMountsTypeId],
        bindings: actualBindings,
        [ExecutionEnvironmentTypeId]: environment,
      })
      const originalMakeView = actual.makeView
      const adapt =
        (view: AnyFunction) =>
        (model: unknown, h: object, ...inputs: ReadonlyArray<unknown>) =>
          view(model, viewBuilder(h, environment), ...inputs)
      actual.makeView = Object.assign(
        (view: AnyFunction) => originalMakeView(adapt(view)),
        {
          withInputs: (view: AnyFunction) =>
            originalMakeView.withInputs(
              (model: unknown, inputs: unknown, h: object) =>
                view(model, inputs, viewBuilder(h, environment)),
            ),
        },
      )

      const {
        bindings: _connections,
        init,
        update,
        view,
        ...implementation
      } = body
      const compiled = {
        ...implementation,
        init: compilePlan(init, actual, staticComposition),
        update: compilePlan(update, actual, staticComposition),
        ...(view === undefined
          ? {}
          : { view: compilePlan(view, actual, staticComposition) }),
      }

      return Reflect.apply(assemble, undefined, [
        () => actual.prepareBlock(compiled),
      ])
    }),
  })

/** Establishes Schema contracts once for typed Block builders. */
export const makeDefinition = <
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
): Definition<
  Id,
  ModelSchema,
  MessageSchema,
  OutMessageSchema,
  ChildInitContextSchema
> => {
  const definition = Reflect.apply(makeCoreDefinition, undefined, [
    id,
    contracts,
  ])
  const makeComposition = (graph: object = {}) => {
    const bindings = Reflect.get(graph, 'bindings')
    const composition = definition.makeComposition(
      globalThis.Array.isArray(bindings)
        ? {
            ...graph,
            bindings: bindings.map(
              binding => connectionDeclarations.get(binding) ?? binding,
            ),
          }
        : graph,
    )
    return Object.assign(makeAuthoringComposition(composition), {
      makeBlock: runtimeMake(definition, composition),
    })
  }

  const makeBlock = (constructor: Effect.Effect<any, any, any>) => ({
    build: Effect.flatMap(constructor, body => {
      const composition = planComposition<any>(body.init)
      if (
        composition.owner !== definition.owner ||
        composition.Model !== definition.Model
      ) {
        throw new Error(
          '[foldkit] Constructor plans must belong to this Definition.',
        )
      }

      return runtimeMake(definition, composition)(Effect.succeed(body)).build
    }),
  })

  const lowerers = bindingLowerersOf(definition)
  const authored = {
    ...definition,
    makeComposition,
    makeBlock,
  }

  return Object.assign(
    authored,
    makeBindingConstructors(
      authored,
      (child, config) =>
        Reflect.apply(withConnection, undefined, [
          lowerers.direct(child, config),
        ]),
      (child, config) =>
        Reflect.apply(withConnection, undefined, [lowerers.map(child, config)]),
    ),
  )
}
