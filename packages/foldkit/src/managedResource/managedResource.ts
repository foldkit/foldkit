import {
  Array,
  Context,
  Data,
  Effect,
  Layer,
  Option,
  Predicate,
  Ref,
  type Schema,
  type Scope,
} from 'effect'

import {
  copyIdentity,
  registerIdentity,
  registerResource,
} from '../block/identity.js'
import {
  IsConstructingHandler,
  type ValidateConstructionRequirements,
} from '../block/scope.js'
import { type Handler, type ToLayer, makeHandler } from './handler.js'
import type { ManagedResourceService } from './public.js'
import {
  type Registry,
  type RegistryEntries,
  RegistryEntriesTypeId,
} from './registry.js'

export type { Handler, HandlerOf, ToLayer } from './handler.js'
export type { ManagedResourceService } from './public.js'
export { RegistryEntriesTypeId } from './registry.js'
export type { OwnedRegistry, Registry, RegistryEntries } from './registry.js'

/** Typed error raised when a command accesses a managed resource that is not currently acquired. */
export class ResourceNotAvailable extends Data.TaggedError(
  'ResourceNotAvailable',
)<{
  readonly resource: string
}> {}

const ManagedResourceTypeId: unique symbol = Symbol.for(
  '@foldkit/ManagedResource',
)

type ManagedResourceTypeId = typeof ManagedResourceTypeId

type ValidateHandlerConstruction<
  Yielded extends Effect.Effect<unknown, unknown, unknown>,
> = ValidateConstructionRequirements<Effect.Services<Yielded>>

/**
 * A model-driven resource with acquire/release lifecycle. Access the resource
 * value in commands via `.get`, which fails with `ResourceNotAvailable` when
 * the resource is not currently active. The service identity appears in the
 * Effect R channel, providing compile-time enforcement that the resource is
 * registered.
 */
export interface ManagedResource<in out Value, out Service = unknown> {
  readonly [ManagedResourceTypeId]: ManagedResourceTypeId
  readonly key: string
  readonly get: Effect.Effect<Value, ResourceNotAvailable, Service>
  /** @internal */
  readonly _tag: Context.Service<any, any>
}

/** Creates a managed resource identity with a `.get` accessor for use in commands. */
export const tag =
  <Value>() =>
  <const Key extends string>(
    key: Key,
  ): ManagedResource<Value, ManagedResourceService<Key>> => {
    const serviceTag = Context.Service<
      ManagedResourceService<Key>,
      Ref.Ref<Option.Option<Value>>
    >(`@foldkit/ManagedResource/${key}`)
    registerResource(serviceTag.key)

    const get = Effect.gen(function* () {
      const isConstructingHandler = yield* IsConstructingHandler
      if (isConstructingHandler) {
        return yield* Effect.die(
          new Error(
            `[foldkit] ManagedResource "${key}" cannot be read while constructing a handler. Read its value inside the returned operation.`,
          ),
        )
      }

      const ref = yield* serviceTag
      const maybeValue = yield* Ref.get(ref)
      return yield* Effect.fromOption(maybeValue)
    }).pipe(
      Effect.catchTag('NoSuchElementError', () =>
        Effect.fail(new ResourceNotAvailable({ resource: key })),
      ),
    )

    return {
      [ManagedResourceTypeId]: ManagedResourceTypeId,
      key,
      get,
      _tag: serviceTag,
    }
  }

/** Type-level utility to extract the value type from a ManagedResource. */
export type Value<T> = T extends ManagedResource<infer V, any> ? V : never

/** Type-level utility to extract the service identity type from a ManagedResource. */
export type ServiceOf<T> = T extends ManagedResource<any, infer S> ? S : never

/** Runtime-ready contract for one ManagedResource lifecycle. Applications
 * normally create this through {@link make}; custom integrations may inspect
 * the completed entry. */
export type ManagedResourceConfig<Model, Message, LifecycleServices = never> = {
  /** Requirements Schema used to compare consecutive lifecycle inputs. */
  readonly schema: Schema.Schema<any>
  /** Resource identity and Effect accessor installed while acquired. */
  readonly resource: ManagedResource<any>
  /** Derives the current optional acquisition requirements from the Model. */
  readonly modelToMaybeRequirements: (model: Model) => any
  /** Acquires one resource value for the current requirements. */
  readonly acquire: (
    params: any,
  ) => Effect.Effect<any, unknown, Scope.Scope | LifecycleServices>
  /** Releases a previously acquired value when its lifecycle ends. */
  readonly release: (
    value: any,
  ) => Effect.Effect<void, unknown, Scope.Scope | LifecycleServices>
  /** Maps a successful acquisition to an application Message. */
  readonly onAcquired: (value: any) => Message
  /** Produces the Message dispatched after release completes. */
  readonly onReleased: () => Message
  /** Maps an acquisition failure to an application Message. */
  readonly onAcquireError: (error: unknown) => Message
}

/** A record of named ManagedResource configurations, keyed by resource name. */
export type ManagedResources<Model, Message, Services = never> = Record<
  string,
  ManagedResourceConfig<Model, Message, any>
> & {
  readonly __managedResourceServices?: Services
}

type EntryBrand<Model, Message> = {
  readonly __managedResourceEntry: (model: Model) => Message
}

/**
 * The requirements value the runtime hands to `acquire`. When the requirements
 * schema is wrapped in `Schema.Option`, the runtime unwraps the `Some` before
 * calling `acquire`, so the parameter is the inner type.
 */
type AcquireParams<Requirements> =
  Requirements extends Option.Option<infer Params> ? Params : Requirements

type AcquireParamsFromSchema<RequirementsSchema extends Schema.Schema<any>> =
  RequirementsSchema extends Schema.Option<infer ParamsSchema>
    ? ParamsSchema['Type']
    : RequirementsSchema extends Schema.Struct<infer Fields>
      ? Schema.Struct.Type<Fields>
      : AcquireParams<RequirementsSchema['Type']>

/**
 * A single ManagedResource entry produced by `ManagedResource.make`,
 * `ManagedResource.lift`, or `ManagedResource.aggregate`. A private function
 * brand prevents application code from manually constructing one, so an entry
 * must come from a Foldkit constructor.
 *
 * The `Value` parameter is the type the resource holds while active: what
 * `acquire` produces, what `release` and `onAcquired` receive, and what the
 * tag's `.get` yields to commands. It is inferred from the `resource` tag.
 *
 * The `Service` parameter carries the resource tag's identity so `make`,
 * `lift`, and `aggregate` can union the services a record requires. Read the
 * union off a finished record with `ManagedResource.ServicesOf`.
 *
 * The `OnAcquired` parameter preserves the arity of the `onAcquired` handler:
 * an entry whose handler ignores the acquired value keeps that fact in its
 * type, so callers that replay the handler (the Scene test steps) only demand
 * the value when the handler consumes it.
 */
export type Entry<
  Model,
  Message,
  Requirements,
  Value,
  Service = unknown,
  OnAcquired extends (...args: any) => Message = (value: Value) => Message,
  LifecycleServices = never,
  Params = AcquireParams<Requirements>,
> = {
  readonly schema: Schema.Schema<Requirements>
  readonly resource: ManagedResource<Value, Service>
  readonly modelToMaybeRequirements: (model: Model) => Requirements
  readonly acquire: (
    params: Params,
  ) => Effect.Effect<Value, unknown, Scope.Scope | LifecycleServices>
  readonly release: (
    value: Value,
  ) => Effect.Effect<void, unknown, Scope.Scope | LifecycleServices>
  readonly onAcquired: OnAcquired
  readonly onReleased: () => Message
  readonly onAcquireError: (error: unknown) => Message
} & EntryBrand<Model, Message>

/** @internal Identifies a passive keyed Binding inspection template. */
export const KeyedTemplateTypeId = Symbol(
  'foldkit/ManagedResource/KeyedTemplate',
)

/** @internal Identifies an exact keyed occurrence selected for Scene. */
export const KeyedSelectionTypeId = Symbol(
  'foldkit/ManagedResource/KeyedSelection',
)

type SelectedKeyedEntry = Readonly<{
  entry: Entry<any, any, any, any, any, any, any, any>
  isPresent: (model: any) => boolean
}>

type RuntimeKeyedTemplate = Readonly<{
  binding: object
  source: Entry<any, any, any, any, any, any, any, any>
  select: (key: string | number) => SelectedKeyedEntry
}>

/** A passive static registry entry contributed by a keyed child Binding. */
export type KeyedTemplate<
  Model,
  Message,
  Key extends string | number,
  Placement extends string,
  Source,
  Requirements,
  Value,
  Service,
  OnAcquired extends (...args: ReadonlyArray<any>) => Message,
  LifecycleServices,
  Params,
> = Entry<
  Model,
  Message,
  Requirements,
  Value,
  Service,
  OnAcquired,
  LifecycleServices,
  Params
> &
  Readonly<{
    '#ManagedResource.KeyedTemplate': Readonly<{
      key: Key
      placement: Placement
      source: Source
    }>
  }>

/** An exact keyed child ManagedResource occurrence selected for Scene. */
export type KeyedSelection<
  Key extends string | number,
  Placement extends string,
  Source,
> = Readonly<{
  '#ManagedResource.KeyedSelection': Readonly<{
    key: Key
    placement: Placement
    source: Source
  }>
}>

/** @internal Constructs one passive keyed inspection template. */
export const __makeKeyedTemplate = (
  source: Entry<any, any, any, any, any, any, any, any>,
  binding: object,
  select: RuntimeKeyedTemplate['select'],
): Entry<any, any, any, any, any, any, any, any> => {
  const unavailable = () => {
    throw new Error(
      '[foldkit] A keyed child ManagedResource registry entry is a passive template. Select an occurrence with Scene.ManagedResource.at(Binding, key, entry).',
    )
  }
  const template = {
    ...source,
    modelToMaybeRequirements: unavailable,
    acquire: unavailable,
    release: unavailable,
    [KeyedTemplateTypeId]: { binding, source, select },
  }
  copyIdentity(source, template)
  /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
  return template as Entry<any, any, any, any, any, any, any, any>
}

/** @internal Reads a keyed inspection template. */
export const __keyedTemplate = (
  entry: unknown,
): RuntimeKeyedTemplate | undefined => {
  if (!Predicate.isObject(entry)) {
    return undefined
  }
  /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
  return Reflect.get(entry, KeyedTemplateTypeId) as
    | RuntimeKeyedTemplate
    | undefined
}

/** @internal Constructs an exact passive keyed Scene selector. */
export const __selectKeyed = (
  binding: object,
  key: string | number,
  source: object,
): object => ({
  ...source,
  [KeyedSelectionTypeId]: { binding, key, source },
})

/** @internal Reads an exact passive keyed Scene selector. */
export const __keyedSelection = (
  value: unknown,
):
  | Readonly<{ binding: object; key: string | number; source: object }>
  | undefined => {
  if (!Predicate.isObject(value)) {
    return undefined
  }
  /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
  return Reflect.get(value, KeyedSelectionTypeId) as
    | Readonly<{ binding: object; key: string | number; source: object }>
    | undefined
}

/** @internal Materializes a key-specific entry from a registered template. */
export const __selectFromTemplate = (
  template: object,
  key: string | number,
): SelectedKeyedEntry | undefined => {
  const selected = __keyedTemplate(template)?.select(key)
  if (selected !== undefined) {
    Reflect.set(selected.entry, KeyedSelectionTypeId, {
      isPresent: selected.isPresent,
    })
  }
  return selected
}

/** @internal Whether a selected keyed occurrence exists in the current Model. */
export const __selectedKeyIsPresent = (
  entry: object,
  model: unknown,
): boolean | undefined => {
  const selected = Reflect.get(entry, KeyedSelectionTypeId)
  return Predicate.isObject(selected) &&
    Predicate.isFunction(selected['isPresent'])
    ? selected['isPresent'](model)
    : undefined
}

/** A ManagedResource entry whose lifecycle implementation is supplied by a Layer. */
export type LayeredEntry<
  Name extends string,
  Model,
  Message,
  Requirements,
  Value,
  Service,
  OnAcquired extends (...args: any) => Message = (value: Value) => Message,
  Params = AcquireParams<Requirements>,
> = Entry<
  Model,
  Message,
  Requirements,
  Value,
  Service,
  OnAcquired,
  Handler<Name, Params, Value>,
  Params
> &
  Readonly<{
    name: Name
    toLayer: ToLayer<Name, Params, Value>
  }>

/** Type-level utility to extract the service union from a ManagedResources record. */
export type ServicesOf<Resources> =
  RegistryEntries<Resources> extends infer Entries
    ? {
        [Key in keyof Entries]: Entries[Key] extends {
          readonly resource: ManagedResource<any, infer Service>
        }
          ? Service
          : never
      }[keyof Entries]
    : never

type LayeredEntryConfig<
  Model,
  Message,
  RequirementsSchema extends Schema.Schema<any>,
  Resource extends ManagedResource<any, any>,
  OnAcquired extends (value: Value<Resource>) => Message,
> = Readonly<{
  resource: Resource
  modelToMaybeRequirements: (
    model: Model,
  ) => Schema.Schema.Type<RequirementsSchema>
  onAcquired: OnAcquired
  onReleased: () => Message
  onAcquireError: (error: unknown) => Message
  acquire?: never
  release?: never
}>

/**
 * Builds a single ManagedResource entry from a handler name, requirements
 * schema, and config. Supplying a lifecycle `handler` generator in the config
 * attaches its application Layer as `layer`. Omitting it declares a
 * host contract whose required `acquire` and `release` implementation is
 * supplied through `toLayer`. Reading the schema as a positional argument (rather
 * than a property on the config literal) lets TypeScript fully resolve the
 * requirements type before contextually typing `modelToMaybeRequirements` and
 * `acquire`, so destructuring patterns are inferred correctly even when the
 * schema uses transforms like `Schema.Option`.
 *
 * The `onAcquired` field keeps the callback's own arity while its generic
 * constraint supplies the resource value's exact contextual type.
 */
export interface EntryBuilder<Model, Message> {
  <
    const Name extends string,
    RequirementsSchema extends Schema.Schema<any>,
    Resource extends ManagedResource<any, any>,
    OnAcquired extends (value: Value<Resource>) => Message,
    AcquireRequirements = never,
    ReleaseRequirements = never,
    Yielded extends Effect.Effect<unknown, unknown, unknown> = Effect.Effect<
      never,
      never,
      never
    >,
  >(
    name: Name,
    schema: RequirementsSchema,
    config: LayeredEntryConfig<
      Model,
      Message,
      RequirementsSchema,
      Resource,
      OnAcquired
    > &
      Readonly<{
        handler: (() => Generator<
          Yielded,
          Readonly<{
            acquire: (
              params: AcquireParamsFromSchema<RequirementsSchema>,
            ) => Effect.Effect<
              NoInfer<Value<Resource>>,
              unknown,
              AcquireRequirements
            >
            release: (
              value: NoInfer<Value<Resource>>,
            ) => Effect.Effect<void, unknown, ReleaseRequirements>
          }>,
          unknown
        >) &
          ValidateHandlerConstruction<Yielded>
      }>,
  ): LayeredEntry<
    Name,
    Model,
    Message,
    Schema.Schema.Type<RequirementsSchema>,
    Value<Resource>,
    ServiceOf<Resource>,
    OnAcquired,
    AcquireParamsFromSchema<RequirementsSchema>
  > &
    Readonly<{
      layer: Layer.Layer<
        Handler<
          Name,
          AcquireParamsFromSchema<RequirementsSchema>,
          Value<Resource>
        >,
        Effect.Error<Yielded>,
        Exclude<
          AcquireRequirements | ReleaseRequirements | Effect.Services<Yielded>,
          Scope.Scope
        >
      >
    }>

  <
    const Name extends string,
    RequirementsSchema extends Schema.Schema<any>,
    Resource extends ManagedResource<any, any>,
    OnAcquired extends (value: Value<Resource>) => Message,
  >(
    name: Name,
    schema: RequirementsSchema,
    config: LayeredEntryConfig<
      Model,
      Message,
      RequirementsSchema,
      Resource,
      OnAcquired
    > &
      Readonly<{ handler?: never }>,
  ): LayeredEntry<
    Name,
    Model,
    Message,
    Schema.Schema.Type<RequirementsSchema>,
    Value<Resource>,
    ServiceOf<Resource>,
    OnAcquired,
    AcquireParamsFromSchema<RequirementsSchema>
  >
}

/**
 * Low-level builder for a ManagedResource registry. The Model and Message
 * generics are provided up front; the callback builds a record with `entry`.
 *
 * Application features create accessors through `FooBlock.makeResource` and
 * registries through `FooBlock.makeManagedResources`. Return the registry as
 * `managedResources` and compose its attached entry Layers in the local
 * `EffectsLayer` returned by the `FooBlock.makeLayer` constructor. Child
 * Bindings collect their own registries and derive independent occurrence
 * lifetimes.
 *
 * Use this when a resource is expensive or stateful and should only exist while
 * the model is in a particular state: a camera stream during a video call, a
 * WebSocket connection while on a chat page, or a Web Worker pool during a
 * computation. For services that live for the entire application lifetime,
 * supply a Layer through the Program's `provide` method instead.
 *
 * `aggregate` and `lift` transform standalone records. Application Blocks use
 * registered Bindings to collect their resources, handler recipes, and other
 * lifecycle registrations together.
 *
 * Pass a handler name before the requirements schema. An attached lifecycle
 * handler supplies both functions and exposes its Layer as `layer`. The
 * handler name identifies the Layer requirement;
 * the record key continues to identify the lifecycle the runtime watches.
 *
 * **Lifecycle** — The runtime watches each entry's `modelToMaybeRequirements`
 * after every model update, structurally comparing the result against the
 * previous value:
 *
 * - `Option.none()` → `Option.some(params)`: calls `acquire(params)`, then
 *   dispatches `onAcquired(value)`.
 * - `Option.some(paramsA)` → `Option.some(paramsB)` (structurally different):
 *   releases the old resource, then acquires a new one with `paramsB`.
 * - `Option.some(params)` → `Option.none()`: calls `release(value)`, then
 *   dispatches `onReleased()`. No re-acquisition occurs.
 *
 * If `acquire` fails, `onAcquireError` is dispatched and the resource daemon
 * continues watching for the next requirements change: a failed acquisition
 * does not crash the application.
 *
 * **Entry and handler fields:**
 *
 * - `resource` — The identity tag created with `ManagedResource.tag`. Appears
 *   in the Effect R channel so commands that call `.get` are type-checked.
 * - `modelToMaybeRequirements` — Extracts requirements from the model.
 *   `Option.none()` means "release", `Option.some(params)` means
 *   "acquire/re-acquire if params changed". For resources with no
 *   parameters, use `Schema.Option(Schema.Null)` and return `Option.some(null)`.
 * - `acquire` — Creates the resource from the unwrapped params. The returned
 *   Effect should fail when acquisition fails: errors in the error channel
 *   flow to `onAcquireError` as a message instead of crashing the runtime.
 *   `acquire` runs with the resource-lifetime `Scope.Scope` in its context, so
 *   it can build an Effect `Layer` with `Layer.build` or register finalizers
 *   with `Effect.addFinalizer` whose teardown is tied to the resource. Those
 *   finalizers run when the resource is released or re-acquired, after the
 *   explicit `release` callback. Finalizers registered during a partially
 *   completed acquisition also run if `acquire` fails or is interrupted. A
 *   `Layer`-built resource therefore needs only `release: () => Effect.void`:
 *   the `Layer` finalizers run automatically when the scope closes.
 * - `release` — Tears down the resource. Errors thrown here are silently
 *   swallowed, but the runtime still clears the resource reference and
 *   dispatches `onReleased()` so bookkeeping completes. Resources that
 *   register their teardown as scope finalizers in `acquire` leave this as
 *   `() => Effect.void`.
 * - `handler`: An Effect generator for the `acquire` and `release`
 *   callbacks. When present, the entry exposes the resulting Layer as `layer`.
 * - `onAcquired` — Message dispatched when `acquire` succeeds.
 * - `onAcquireError` — Message dispatched when `acquire` fails.
 * - `onReleased` — Message dispatched after `release` and the activation scope's
 *   finalizers complete.
 *
 * @example
 * ```ts
 * const CameraStream = ManagedResource.tag<MediaStream>()('CameraStream')
 *
 * const managedResources = ManagedResource.make<Model, Message>()(entry => ({
 *   camera: entry(
 *     'CameraStream',
 *     Schema.Option(Schema.Struct({ facingMode: Schema.String })),
 *     {
 *       resource: CameraStream,
 *       modelToMaybeRequirements: model =>
 *         pipe(
 *           model.callState,
 *           Option.liftPredicate(
 *             (callState): callState is typeof InCall.Type =>
 *               callState._tag === 'InCall',
 *           ),
 *           Option.map(callState => ({ facingMode: callState.facingMode })),
 *         ),
 *       onAcquired: () => Message.AcquiredCamera(),
 *       onAcquireError: error =>
 *         Message.FailedAcquireCamera({ error: String(error) }),
 *       onReleased: () => Message.ReleasedCamera(),
 *       handler: function* () {
 *         return {
 *           acquire: ({ facingMode }) =>
 *             Effect.tryPromise(() =>
 *               navigator.mediaDevices.getUserMedia({ video: { facingMode } }),
 *             ),
 *           release: stream =>
 *             Effect.sync(() =>
 *               stream.getTracks().forEach(track => track.stop()),
 *             ),
 *         }
 *       },
 *     },
 *   ),
 * }))
 *
 * const EffectsLayer = managedResources.camera.layer
 * ```
 *
 * @see {@link ManagedResource.tag} for creating the resource identity.
 */
export const make =
  <Model, Message>() =>
  // NOTE: the Entries constraint is the brand alone, not Entry. Naming Entry
  // here hands the checker a concrete onAcquired signature through the return
  // position, which poisons contextual typing of destructured onAcquired
  // parameters at every entry call site (their bindings become any).
  <Entries extends Record<string, EntryBrand<Model, Message>>>(
    build: (entry: EntryBuilder<Model, Message>) => Entries,
  ): Entries => {
    /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
    const entry = ((
      name: string,
      schema: Schema.Schema<any>,
      config: Record<string, unknown> & {
        readonly handler?: () => Generator<
          Effect.Effect<any, any, any>,
          any,
          unknown
        >
      },
    ) => {
      const handler = makeHandler(name)
      const { handler: configuredHandler, ...callbacks } = config

      const resource = {
        name,
        schema,
        ...callbacks,
        acquire: handler.acquire,
        release: handler.release,
        toLayer: handler.toLayer,
      }
      registerIdentity(resource, handler.identity)

      if (Predicate.isUndefined(configuredHandler)) {
        return resource
      } else {
        // oxlint-disable-next-line effecttsgo/any-unknown-in-error-context, typescript/consistent-type-assertions
        const layer = handler.toLayer(Effect.gen(configuredHandler) as never)
        // oxlint-disable-next-line effecttsgo/any-unknown-in-error-context
        const implemented = { ...resource, layer }
        registerIdentity(implemented, handler.identity)
        return implemented
      }
    }) as unknown as EntryBuilder<Model, Message>
    return build(entry)
  }

type EntryOfResources<Resources> =
  RegistryEntries<Resources> extends infer Entries
    ? Entries[keyof Entries]
    : never

type ChildModelOf<Resources> =
  EntryOfResources<Resources> extends Entry<
    infer ChildModel,
    any,
    any,
    any,
    any,
    any,
    any,
    any
  >
    ? ChildModel
    : never

type ChildMessageOf<Resources> =
  EntryOfResources<Resources> extends Entry<
    any,
    infer ChildMessage,
    any,
    any,
    any,
    any,
    any,
    any
  >
    ? ChildMessage
    : never

type AnyResourceEntries = Readonly<
  Record<string, Entry<any, any, any, any, any, any, any, any>>
>

type AnyResources = AnyResourceEntries | Registry<AnyResourceEntries>

const registryEntries = (resources: AnyResources): AnyResourceEntries =>
  Object.hasOwn(resources, RegistryEntriesTypeId)
    ? /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
      (Reflect.get(resources, RegistryEntriesTypeId) as AnyResourceEntries)
    : /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
      (resources as AnyResourceEntries)

const resourceEntryKeys = (resources: AnyResourceEntries): Array<string> => {
  const prototype = Object.getPrototypeOf(resources)
  if (prototype !== null && prototype !== Object.prototype) {
    throw new Error(
      '[foldkit] ManagedResource registries must contain own resource entries, not inherited entries.',
    )
  }

  return Array.map(Reflect.ownKeys(resources), key => {
    if (!Predicate.isString(key)) {
      throw new Error(
        '[foldkit] ManagedResource registration keys must be own string properties.',
      )
    }

    return key
  })
}

type RuntimeLiftConfig = Readonly<{
  read: (parentModel: any) => Option.Option<any>
  toParentMessage: (message: any) => any
}>

const toLiftedEntry = (
  resource: Entry<any, any, any, any, any, any, any, any>,
  config: RuntimeLiftConfig,
): Entry<any, any, any, any, any, any, any, any> => {
  const lifted = {
    ...resource,
    schema: resource.schema,
    resource: resource.resource,
    modelToMaybeRequirements: (parentModel: unknown) =>
      Option.flatMap(
        config.read(parentModel),
        resource.modelToMaybeRequirements,
      ),
    acquire: resource.acquire,
    release: resource.release,
    onAcquired: (value: unknown) =>
      config.toParentMessage(resource.onAcquired(value)),
    onReleased: () => config.toParentMessage(resource.onReleased()),
    onAcquireError: (error: unknown) =>
      config.toParentMessage(resource.onAcquireError(error)),
  }
  copyIdentity(resource, lifted)
  const keyedTemplate = __keyedTemplate(resource)
  if (keyedTemplate !== undefined) {
    Reflect.set(lifted, KeyedTemplateTypeId, {
      ...keyedTemplate,
      select: (key: string | number) => {
        const selected = keyedTemplate.select(key)
        const entry = toLiftedEntry(selected.entry, config)
        const isPresent = (model: unknown) =>
          Option.exists(config.read(model), selected.isPresent)
        Reflect.set(entry, KeyedSelectionTypeId, { isPresent })
        return { entry, isPresent }
      },
    })
  }
  return lifted
}

/**
 * Low-level transformation of a ManagedResource record into another Model and
 * Message context. It applies a Model accessor and Message wrapper to every
 * entry, preserving requirements Schemas and resource services.
 *
 * Application Blocks use registered child Bindings. Composition preserves
 * their handler recipes and derives occurrence-owned resource handle slots.
 *
 * `read` returns `Some(childModel)` while the child exists and `None` while
 * it is absent.
 * An absent child releases its resources without reading their requirements.
 * Use `Option.some` for a child that is always present. Each child's
 * requirements must be `Schema.Option`-wrapped so child absence and the
 * child's own release condition follow the same acquire/release lifecycle.
 */
export const lift =
  <
    Resources extends
      | Readonly<
          Record<
            string,
            Entry<any, any, Option.Option<any>, any, any, any, any, any>
          >
        >
      | Registry<
          Readonly<
            Record<
              string,
              Entry<any, any, Option.Option<any>, any, any, any, any, any>
            >
          >
        >,
  >(
    resources: Resources,
  ) =>
  <ParentModel, ParentMessage>(config: {
    readonly read: (
      parentModel: ParentModel,
    ) => Option.Option<ChildModelOf<Resources>>
    readonly toParentMessage: (
      message: ChildMessageOf<Resources>,
    ) => ParentMessage
  }): {
    readonly [
      Key in keyof RegistryEntries<Resources>
    ]: RegistryEntries<Resources>[Key] extends Entry<
      any,
      any,
      infer Requirements,
      infer Value,
      infer Service,
      infer OnAcquired extends (...args: ReadonlyArray<any>) => any,
      infer LifecycleServices,
      infer Params
    >
      ? Entry<
          ParentModel,
          ParentMessage,
          Requirements,
          Value,
          Service,
          (...args: Parameters<OnAcquired>) => ParentMessage,
          LifecycleServices,
          Params
        > &
          (RegistryEntries<Resources>[Key] extends {
            readonly name: infer Name
            readonly toLayer: infer EntryToLayer
          }
            ? Readonly<{ name: Name; toLayer: EntryToLayer }>
            : unknown) &
          (RegistryEntries<Resources>[Key] extends {
            readonly layer: infer EntryLayer
          }
            ? Readonly<{ layer: EntryLayer }>
            : unknown)
      : never
  } =>
    /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
    (() => {
      const entries = registryEntries(resources)
      const liftedResources: Record<string, unknown> = {}

      for (const key of resourceEntryKeys(entries)) {
        const resource = Reflect.get(entries, key)
        const lifted = toLiftedEntry(resource, config)
        Object.defineProperty(liftedResources, key, {
          configurable: true,
          enumerable: true,
          value: lifted,
          writable: true,
        })
      }

      return liftedResources
    })() as any

type RuntimeKey<Key> = Key extends string
  ? Key
  : Key extends number
    ? `${Key}`
    : never

type RuntimeEntries<RecordType> = {
  readonly [Key in keyof RecordType as RuntimeKey<Key>]: RecordType[Key]
}

type MergeRecords<Records extends ReadonlyArray<unknown>> =
  Records extends readonly [infer Head, ...infer Rest]
    ? RuntimeEntries<RegistryEntries<Head>> &
        (Rest extends ReadonlyArray<unknown> ? MergeRecords<Rest> : {})
    : {}

// NOTE: requiring one record keeps `aggregate()` unambiguously curried.
type AnyResourcesList = readonly [AnyResources, ...ReadonlyArray<AnyResources>]

type EntriesOfRecord<ResourcesRecord> =
  RegistryEntries<ResourcesRecord> extends infer Entries
    ? Entries extends unknown
      ? Entries[keyof Entries]
      : never
    : never

type ModelOfEntry<AnyEntry> = [AnyEntry] extends [
  Entry<infer Model, any, any, any, any, any, any, any>,
]
  ? unknown extends Model
    ? never
    : Model
  : never

type MessageOfEntry<AnyEntry> =
  AnyEntry extends Entry<any, infer Message, any, any, any, any, any, any>
    ? Message
    : never

type MessageOf<Records extends AnyResourcesList> = MessageOfEntry<
  EntriesOfRecord<Records[number]>
>

// NOTE: anchoring compatibility to the first record makes an incompatible
// later record produce the error at its own argument position.
type ReferenceModel<Records extends ReadonlyArray<AnyResources>> =
  Records extends readonly [
    infer Head extends AnyResources,
    ...infer Rest extends ReadonlyArray<AnyResources>,
  ]
    ? [ModelOfEntry<EntriesOfRecord<Head>>] extends [never]
      ? ReferenceModel<Rest>
      : ModelOfEntry<EntriesOfRecord<Head>>
    : never

type CompatibleResources<Records extends AnyResourcesList> = {
  readonly [Index in keyof Records]: Records[Index] &
    (RegistryEntries<Records[Index]> extends Readonly<
      Record<
        string,
        Entry<
          ReferenceModel<Records>,
          MessageOf<Records>,
          any,
          any,
          any,
          any,
          any,
          any
        >
      >
    >
      ? unknown
      : never)
}

const mergeResources = (
  records: ReadonlyArray<AnyResources>,
): Record<string, Entry<any, any, any, any, any, any, any, any>> => {
  const result: Record<
    string,
    Entry<any, any, any, any, any, any, any, any>
  > = {}
  for (const record of records) {
    const entries = registryEntries(record)
    for (const key of resourceEntryKeys(entries)) {
      if (Object.hasOwn(result, key)) {
        throw new Error(
          `ManagedResource.aggregate: duplicate key "${key}" across records`,
        )
      }
      Object.defineProperty(result, key, {
        configurable: true,
        enumerable: true,
        value: Reflect.get(entries, key),
        writable: true,
      })
    }
  }
  return result
}

/**
 * Combines multiple ManagedResources records into one. Throws on duplicate
 * keys so a misconfigured aggregate fails loudly at startup rather than
 * silently overriding.
 *
 * Pass the records directly and the Model and Message are read off them. The
 * Model of the first record is the one every later record is checked against,
 * so a record from another Model universe fails at its own argument position.
 * Message widens to the union across all records.
 *
 * The result keeps each record's keys, each entry's requirements schema and
 * resource service, and the arity of each `onAcquired` handler. Read the
 * service union off the result with {@link ServicesOf}.
 *
 * The curried form remains available for a record that has to be typed before
 * its entries exist, such as a value annotated at a module boundary.
 *
 * @example
 * ```ts
 * const managedResources = ManagedResource.aggregate(
 *   playgroundManagedResources,
 *   notePlayerManagedResources,
 * )
 * ```
 */
export const aggregate: {
  <Model, Message>(): <
    Records extends ReadonlyArray<
      Record<string, Entry<Model, Message, any, any, any, any, any, any>>
    >,
  >(
    ...records: Records
  ) => MergeRecords<Records>
  <Records extends AnyResourcesList>(
    ...records: CompatibleResources<Records>
  ): MergeRecords<Records>
  /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
} = ((...records: ReadonlyArray<AnyResources>) => {
  return Array.match(records, {
    onEmpty:
      () =>
      (...curriedRecords: ReadonlyArray<AnyResources>) =>
        mergeResources(curriedRecords),
    onNonEmpty: mergeResources,
  })
  /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
}) as any
