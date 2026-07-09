import { Schema as S, Types } from 'effect'

/** A `TaggedStruct` schema that can be called directly as a constructor: `Foo({ count: 1 })` instead of `Foo.make({ count: 1 })`. */
export type CallableTaggedStruct<
  Tag extends string,
  Fields extends S.Struct.Fields,
> = S.TaggedStruct<Tag, Fields> &
  (keyof Fields extends never
    ? (
        value?: Parameters<S.TaggedStruct<Tag, Fields>['make']>[0] | void,
      ) => Types.Simplify<S.Struct.Type<{ readonly _tag: S.tag<Tag> } & Fields>>
    : (
        value: Parameters<S.TaggedStruct<Tag, Fields>['make']>[0],
      ) => Types.Simplify<
        S.Struct.Type<{ readonly _tag: S.tag<Tag> } & Fields>
      >)

let isConstructingProbe = false

/** @internal Runs `thunk` with the callable tagged-struct constructors (`m`,
 *  `r`, `ts`) in a non-validating probe mode: each constructor returns a
 *  shallow tagged object without decoding its payload against the schema.
 *
 *  DevTools uses this to replay a Command's recorded message-mapping chain over
 *  a probe leaf and recover the destination Submodel's `Got*Message` wrapper
 *  tags. Running the real constructors would throw, because a wrapper validates
 *  its `message` field via `Schema.make` and rejects the structurally-invalid
 *  probe. In probe mode the constructor still stamps the correct `_tag`, so the
 *  wrapper structure the chain produces is recoverable while the payload is
 *  left untouched.
 *
 *  The toggle is synchronous and restored in a `finally`, so it never leaks past
 *  `thunk`. The saved-and-restored previous value keeps nested calls correct. */
export const withConstructorProbe = <A>(thunk: () => A): A => {
  const previous = isConstructingProbe
  isConstructingProbe = true
  try {
    return thunk()
  } finally {
    isConstructingProbe = previous
  }
}

const makeCallable = <Tag extends string, Fields extends S.Struct.Fields>(
  schema: S.TaggedStruct<Tag, Fields>,
  tag: Tag,
): CallableTaggedStruct<Tag, Fields> =>
  /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
  new Proxy(function () {} as unknown as object, {
    apply(_target, _thisArg, argumentsList) {
      if (isConstructingProbe) {
        return { ...(argumentsList[0] ?? {}), _tag: tag }
      }
      return schema.make(argumentsList[0] ?? {})
    },
    get(_target, property, receiver) {
      return Reflect.get(schema, property, receiver)
    },
    has(_target, property) {
      return Reflect.has(schema, property)
    },
    getPrototypeOf() {
      return Reflect.getPrototypeOf(schema)
    },
  }) as unknown as CallableTaggedStruct<Tag, Fields>

/**
 * Wraps `Schema.TaggedStruct` to create a message variant you can call directly as a constructor.
 * Use `m` for message types — enabling `ClickedReset()` instead of `ClickedReset.make()`.
 *
 * @example
 * ```typescript
 * const ClickedReset = m('ClickedReset')
 * ClickedReset() // { _tag: 'ClickedReset' }
 *
 * const ChangedCount = m('ChangedCount', { count: S.Number })
 * ChangedCount({ count: 1 }) // { _tag: 'ChangedCount', count: 1 }
 * ```
 */
export function m<Tag extends string>(tag: Tag): CallableTaggedStruct<Tag, {}>
export function m<Tag extends string, Fields extends S.Struct.Fields>(
  tag: Tag,
  fields: Fields,
): CallableTaggedStruct<Tag, Fields>
export function m(tag: string, fields: S.Struct.Fields = {}): any {
  return makeCallable(S.TaggedStruct(tag, fields), tag)
}

/**
 * Wraps `Schema.TaggedStruct` to create a route variant you can call directly as a constructor.
 * Use `r` for route types — enabling `Home()` instead of `Home.make()`.
 *
 * @example
 * ```typescript
 * const Home = r('Home')
 * Home() // { _tag: 'Home' }
 *
 * const UserProfile = r('UserProfile', { id: S.String })
 * UserProfile({ id: 'abc' }) // { _tag: 'UserProfile', id: 'abc' }
 * ```
 */
export function r<Tag extends string>(tag: Tag): CallableTaggedStruct<Tag, {}>
export function r<Tag extends string, Fields extends S.Struct.Fields>(
  tag: Tag,
  fields: Fields,
): CallableTaggedStruct<Tag, Fields>
export function r(tag: string, fields: S.Struct.Fields = {}): any {
  return makeCallable(S.TaggedStruct(tag, fields), tag)
}

/**
 * Wraps `Schema.TaggedStruct` to create a callable tagged struct you can call directly as a constructor.
 * Use `ts` for non-message, non-route tagged structs — enabling `Loading()`
 * instead of `Loading.make()`.
 *
 * @example
 * ```typescript
 * const Loading = ts('Loading')
 * Loading() // { _tag: 'Loading' }
 *
 * const Ok = ts('Ok', { data: S.String })
 * Ok({ data: 'hello' }) // { _tag: 'Ok', data: 'hello' }
 * ```
 */
export function ts<Tag extends string>(tag: Tag): CallableTaggedStruct<Tag, {}>
export function ts<Tag extends string, Fields extends S.Struct.Fields>(
  tag: Tag,
  fields: Fields,
): CallableTaggedStruct<Tag, Fields>
export function ts(tag: string, fields: S.Struct.Fields = {}): any {
  return makeCallable(S.TaggedStruct(tag, fields), tag)
}
