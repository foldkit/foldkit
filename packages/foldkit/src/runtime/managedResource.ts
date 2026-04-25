import { type Effect, type Option, Record, type Schema } from 'effect'

import type { ManagedResource } from '../managedResource/index.js'

/** Internal configuration for a single managed resource, used by the runtime. */
export type ManagedResourceConfig<Model, Message> = {
  readonly schema: Schema.Schema<any>
  readonly resource: ManagedResource<any>
  readonly modelToMaybeRequirements: (model: Model) => unknown
  readonly acquire: (params: unknown) => Effect.Effect<unknown, unknown>
  readonly release: (value: unknown) => Effect.Effect<void>
  readonly onAcquired: (value: unknown) => Message
  readonly onReleased: () => Message
  readonly onAcquireError: (error: unknown) => Message
}

declare const ManagedResourceServicesPhantom: unique symbol

/** A record of named managed resource configurations, keyed by dependency field name. */
export type ManagedResources<Model, Message, Services = never> = Record<
  string,
  ManagedResourceConfig<Model, Message>
> & {
  readonly [ManagedResourceServicesPhantom]?: Services
}

/** Type-level utility to extract the service union from a ManagedResources type. */
export type ManagedResourceServicesOf<MR> =
  MR extends ManagedResources<any, any, infer S> ? S : never

/**
 * Creates type-safe managed resource configurations from a dependency schema.
 *
 * Use this when a resource is expensive or stateful and should only exist while
 * the model is in a particular state — a camera stream during a video call, a
 * WebSocket connection while on a chat page, or a Web Worker pool during a
 * computation. For resources that live for the entire application lifetime, use
 * the static `resources` config instead.
 *
 * **Lifecycle** — The runtime watches each config's `modelToMaybeRequirements`
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
 * continues watching for the next deps change — a failed acquisition does not
 * crash the application.
 *
 * **Config fields:**
 *
 * - `resource` — The identity tag created with `ManagedResource.tag`. Appears
 *   in the Effect R channel so commands that call `.get` are type-checked.
 * - `modelToMaybeRequirements` — Extracts requirements from the model.
 *   `Option.none()` means "release", `Option.some(params)` means
 *   "acquire/re-acquire if params changed". For resources with no
 *   parameters, use `S.Option(S.Null)` and return `Option.some(null)` —
 *   not `S.Struct({})`, which has no fields for equivalence comparison.
 * - `acquire` — Creates the resource from the unwrapped params. The returned
 *   Effect should fail when acquisition fails — errors in the error channel
 *   flow to `onAcquireError` as a message instead of crashing the runtime.
 * - `release` — Tears down the resource. Errors thrown here are silently
 *   swallowed — release must not block cleanup.
 * - `onAcquired` — Message dispatched when `acquire` succeeds.
 * - `onAcquireError` — Message dispatched when `acquire` fails.
 * - `onReleased` — Message dispatched after `release` completes.
 *
 * @example
 * ```ts
 * const CameraStream = ManagedResource.tag<MediaStream>()('CameraStream')
 *
 * const ManagedResourceDeps = S.Struct({
 *   camera: S.Option(S.Struct({ facingMode: S.String })),
 * })
 *
 * const managedResources = ManagedResource.makeManagedResources(
 *   ManagedResourceDeps,
 * )<Model, Message>({
 *   camera: {
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
 *   },
 * })
 * ```
 *
 * @param ManagedResourceDeps - An Effect Schema struct where each field's type
 * drives the requirements for one managed resource. Wrap in `S.Option(...)` for
 * resources that can be released (most cases).
 *
 * @see {@link ManagedResource.tag} for creating the resource identity.
 */
export const makeManagedResources =
  <ManagedResourceDeps extends Schema.Struct<any>>(
    ManagedResourceDeps: ManagedResourceDeps,
  ) =>
  <Model, Message>(configs: {
    [K in keyof Schema.Schema.Type<ManagedResourceDeps>]: {
      readonly resource: ManagedResource<any, any>
      readonly modelToMaybeRequirements: (
        model: Model,
      ) => Schema.Schema.Type<ManagedResourceDeps>[K]
      readonly acquire: (
        params: Schema.Schema.Type<ManagedResourceDeps>[K] extends Option.Option<
          infer P
        >
          ? P
          : Schema.Schema.Type<ManagedResourceDeps>[K],
      ) => Effect.Effect<any, unknown>
      readonly release: (value: any) => Effect.Effect<void>
      readonly onAcquired: (value: any) => Message
      readonly onReleased: () => Message
      readonly onAcquireError: (error: unknown) => Message
    }
  }): ManagedResources<Model, Message> =>
    /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
    Record.map(
      configs,
      (config, key) =>
        /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
        ({
          schema: ManagedResourceDeps.fields[key],
          ...config,
        }) as ManagedResourceConfig<Model, Message>,
    ) as ManagedResources<Model, Message>
