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

const makeCallable = <Tag extends string, Fields extends S.Struct.Fields>(
  schema: S.TaggedStruct<Tag, Fields>,
): CallableTaggedStruct<Tag, Fields> =>
  /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
  new Proxy(function () {} as unknown as object, {
    apply(_target, _thisArg, argumentsList) {
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
  return makeCallable(S.TaggedStruct(tag, fields))
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
  return makeCallable(S.TaggedStruct(tag, fields))
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
  return makeCallable(S.TaggedStruct(tag, fields))
}
