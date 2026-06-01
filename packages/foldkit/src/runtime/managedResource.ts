import { type Effect, Option, Record, type Schema } from 'effect'

import type { ManagedResource } from '../managedResource/index.js'

/** Internal configuration for a single Managed Resource, used by the runtime. */
export type ManagedResourceConfig<Model, Message> = {
  readonly schema: Schema.Schema<any>
  readonly resource: ManagedResource<any>
  readonly modelToMaybeRequirements: (model: Model) => any
  readonly acquire: (params: any) => Effect.Effect<any, unknown>
  readonly release: (value: any) => Effect.Effect<void>
  readonly onAcquired: (value: any) => Message
  readonly onReleased: () => Message
  readonly onAcquireError: (error: unknown) => Message
}

/** A record of named Managed Resource configurations, keyed by resource name. */
export type ManagedResources<Model, Message, Services = never> = Record<
  string,
  ManagedResourceConfig<Model, Message>
> & {
  readonly __managedResourceServices?: Services
}

type EntryBrand = {
  readonly __managedResourceEntry: never
}

/**
 * The requirements value the runtime hands to `acquire`. When the requirements
 * schema is wrapped in `S.Option`, the runtime unwraps the `Some` before
 * calling `acquire`, so the parameter is the inner type.
 */
type AcquireParams<Requirements> =
  Requirements extends Option.Option<infer Params> ? Params : Requirements

/**
 * A single Managed Resource entry produced by `ManagedResource.make`,
 * `ManagedResource.lift`, or `ManagedResource.aggregate`. The brand field is
 * `never`, so application code cannot manually construct one: it must go
 * through a constructor.
 *
 * The `Service` parameter carries the resource tag's identity so `make`,
 * `lift`, and `aggregate` can union the services a record requires. Read the
 * union off a finished record with `ManagedResource.ServicesOf`.
 */
export type Entry<Model, Message, Requirements, Service = unknown> = {
  readonly schema: Schema.Schema<Requirements>
  readonly resource: ManagedResource<any, Service>
  readonly modelToMaybeRequirements: (model: Model) => Requirements
  readonly acquire: (
    params: AcquireParams<Requirements>,
  ) => Effect.Effect<any, unknown>
  readonly release: (value: any) => Effect.Effect<void>
  readonly onAcquired: (value: any) => Message
  readonly onReleased: () => Message
  readonly onAcquireError: (error: unknown) => Message
} & EntryBrand

/** Type-level utility to extract the service union from a Managed Resources record. */
export type ServicesOf<Resources> = {
  [Key in keyof Resources]: Resources[Key] extends {
    readonly resource: ManagedResource<any, infer Service>
  }
    ? Service
    : never
}[keyof Resources]

/**
 * Builds a single Managed Resource entry from a requirements schema and a
 * config. Reading the schema as a positional argument (rather than a property
 * on the config literal) lets TypeScript fully resolve the requirements type
 * before contextually typing `modelToMaybeRequirements` and `acquire`, so
 * destructuring patterns are inferred correctly even when the schema uses
 * transforms like `S.Option`.
 */
export type EntryBuilder<Model, Message> = <
  RequirementsSchema extends Schema.Schema<any>,
  Service,
>(
  schema: RequirementsSchema,
  config: {
    readonly resource: ManagedResource<any, Service>
    readonly modelToMaybeRequirements: (
      model: Model,
    ) => Schema.Schema.Type<RequirementsSchema>
    readonly acquire: (
      params: AcquireParams<Schema.Schema.Type<RequirementsSchema>>,
    ) => Effect.Effect<any, unknown>
    readonly release: (value: any) => Effect.Effect<void>
    readonly onAcquired: (value: any) => Message
    readonly onReleased: () => Message
    readonly onAcquireError: (error: unknown) => Message
  },
) => Entry<Model, Message, Schema.Schema.Type<RequirementsSchema>, Service>

/**
 * Declares a Managed Resources record. The Model and Message generics are
 * provided up front; the entries record follows, built from calls to the
 * `entry` builder passed into the inner function.
 *
 * Use this when a resource is expensive or stateful and should only exist while
 * the model is in a particular state: a camera stream during a video call, a
 * WebSocket connection while on a chat page, or a Web Worker pool during a
 * computation. For resources that live for the entire application lifetime, use
 * the static `resources` config instead.
 *
 * Reach for `ManagedResource.aggregate` to combine multiple records, and
 * `ManagedResource.lift` to translate a child Submodel's record into a parent
 * context.
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
 * **Config fields:**
 *
 * - `resource` — The identity tag created with `ManagedResource.tag`. Appears
 *   in the Effect R channel so commands that call `.get` are type-checked.
 * - `modelToMaybeRequirements` — Extracts requirements from the model.
 *   `Option.none()` means "release", `Option.some(params)` means
 *   "acquire/re-acquire if params changed". For resources with no
 *   parameters, use `S.Option(S.Null)` and return `Option.some(null)`.
 * - `acquire` — Creates the resource from the unwrapped params. The returned
 *   Effect should fail when acquisition fails: errors in the error channel
 *   flow to `onAcquireError` as a message instead of crashing the runtime.
 * - `release` — Tears down the resource. Errors thrown here are silently
 *   swallowed: release must not block cleanup.
 * - `onAcquired` — Message dispatched when `acquire` succeeds.
 * - `onAcquireError` — Message dispatched when `acquire` fails.
 * - `onReleased` — Message dispatched after `release` completes.
 *
 * @example
 * ```ts
 * const CameraStream = ManagedResource.tag<MediaStream>()('CameraStream')
 *
 * const managedResources = ManagedResource.make<Model, Message>()(entry => ({
 *   camera: entry(S.Option(S.Struct({ facingMode: S.String })), {
 *     resource: CameraStream,
 *     modelToMaybeRequirements: model =>
 *       pipe(
 *         model.callState,
 *         Option.liftPredicate(
 *           (callState): callState is typeof InCall.Type =>
 *             callState._tag === 'InCall',
 *         ),
 *         Option.map(callState => ({ facingMode: callState.facingMode })),
 *       ),
 *     acquire: ({ facingMode }) =>
 *       Effect.tryPromise(() =>
 *         navigator.mediaDevices.getUserMedia({ video: { facingMode } }),
 *       ),
 *     release: stream =>
 *       Effect.sync(() => stream.getTracks().forEach(track => track.stop())),
 *     onAcquired: () => AcquiredCamera(),
 *     onAcquireError: error => FailedAcquireCamera({ error: String(error) }),
 *     onReleased: () => ReleasedCamera(),
 *   }),
 * }))
 * ```
 *
 * @see {@link ManagedResource.tag} for creating the resource identity.
 */
export const make =
  <Model, Message>() =>
  <Entries extends Record<string, Entry<Model, Message, any, any>>>(
    build: (entry: EntryBuilder<Model, Message>) => Entries,
  ): Entries => {
    /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
    const entry = ((
      schema: Schema.Schema<any>,
      config: Record<string, unknown>,
    ) => ({
      schema,
      ...config,
    })) as unknown as EntryBuilder<Model, Message>
    return build(entry)
  }

type ChildModelOf<Resources> =
  Resources[keyof Resources] extends Entry<infer ChildModel, any, any, any>
    ? ChildModel
    : never

type ChildMessageOf<Resources> =
  Resources[keyof Resources] extends Entry<any, infer ChildMessage, any, any>
    ? ChildMessage
    : never

/**
 * Lifts a record of child Managed Resources into a parent's Model and Message
 * context, applying a Model accessor and a Message wrapper uniformly to every
 * entry. Per-entry requirements schemas and resource services are preserved.
 *
 * Unlike `Subscription.lift`, `toChildModel` returns an `Option`: a managed
 * resource already speaks in `Option` (`modelToMaybeRequirements` returns
 * `Option.none()` to release), and a child Submodel that owns a managed
 * resource is itself something that mounts and unmounts. A missing child is
 * just another `None` and flows through the same acquire/release channel, so
 * each lifted entry's requirements must be `S.Option`-wrapped.
 */
export const lift =
  <Resources extends Record<string, Entry<any, any, Option.Option<any>, any>>>(
    resources: Resources,
  ) =>
  <ParentModel, ParentMessage>(config: {
    readonly toChildModel: (
      parentModel: ParentModel,
    ) => Option.Option<ChildModelOf<Resources>>
    readonly toParentMessage: (
      message: ChildMessageOf<Resources>,
    ) => ParentMessage
  }): {
    readonly [Key in keyof Resources]: Resources[Key] extends Entry<
      any,
      any,
      infer Requirements,
      infer Service
    >
      ? Entry<ParentModel, ParentMessage, Requirements, Service>
      : never
  } =>
    /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
    Record.map(resources, resource => ({
      schema: resource.schema,
      resource: resource.resource,
      modelToMaybeRequirements: (parentModel: ParentModel) =>
        Option.flatMap(
          config.toChildModel(parentModel),
          resource.modelToMaybeRequirements,
        ),
      acquire: resource.acquire,
      release: resource.release,
      onAcquired: (value: unknown) =>
        config.toParentMessage(resource.onAcquired(value)),
      onReleased: () => config.toParentMessage(resource.onReleased()),
      onAcquireError: (error: unknown) =>
        config.toParentMessage(resource.onAcquireError(error)),
    })) as any

type MergeRecords<Records extends ReadonlyArray<unknown>> =
  Records extends readonly [infer Head, ...infer Rest]
    ? Head & (Rest extends ReadonlyArray<unknown> ? MergeRecords<Rest> : {})
    : {}

/**
 * Combines multiple Managed Resources records into one. Throws on duplicate
 * keys so a misconfigured aggregate fails loudly at startup rather than
 * silently overriding.
 */
export const aggregate =
  <Model, Message>() =>
  <
    Records extends ReadonlyArray<
      Record<string, Entry<Model, Message, any, any>>
    >,
  >(
    ...records: Records
  ): MergeRecords<Records> => {
    const result: Record<string, Entry<Model, Message, any, any>> = {}
    for (const record of records) {
      for (const key of Object.keys(record)) {
        if (Object.hasOwn(result, key)) {
          throw new Error(
            `ManagedResource.aggregate: duplicate key "${key}" across records`,
          )
        }
        /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
        result[key] = record[key] as Entry<Model, Message, any, any>
      }
    }
    /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
    return result as MergeRecords<Records>
  }
