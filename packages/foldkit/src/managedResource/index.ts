import { Context, Data, Effect, Option, Ref } from 'effect'

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

declare const ManagedResourceBrand: unique symbol

/** Branded identity type for a managed resource, used in the Effect R channel. */
export interface ManagedResourceService<Key extends string> {
  readonly [ManagedResourceBrand]: Key
}

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

    const get = Effect.gen(function* () {
      const ref = yield* serviceTag
      const maybeValue = yield* Ref.get(ref)
      return yield* maybeValue
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
