import { Array, Match, Schema, SchemaAST, Types } from 'effect'

/** A `TaggedStruct` schema that can be called directly as a constructor: `Foo({ count: 1 })` instead of `Foo.make({ count: 1 })`. */
export type CallableTaggedStruct<
  Tag extends string,
  Fields extends Schema.Struct.Fields,
> = Schema.TaggedStruct<Tag, Fields> &
  (keyof Fields extends never
    ? (
        value?: Parameters<Schema.TaggedStruct<Tag, Fields>['make']>[0] | void,
      ) => Types.Simplify<
        Schema.Struct.Type<{ readonly _tag: Schema.tag<Tag> } & Fields>
      >
    : (
        value: Parameters<Schema.TaggedStruct<Tag, Fields>['make']>[0],
      ) => Types.Simplify<
        Schema.Struct.Type<{ readonly _tag: Schema.tag<Tag> } & Fields>
      >)

const assignPlainProperty = (
  output: Record<PropertyKey, unknown>,
  name: PropertyKey,
  value: unknown,
): void => {
  if (name === '__proto__') {
    Object.defineProperty(output, name, {
      value,
      writable: true,
      enumerable: true,
      configurable: true,
    })
  } else {
    output[name] = value
  }
}

const isDirectlyCopyable = (ast: SchemaAST.AST): boolean => {
  if (
    ast.checks !== undefined ||
    ast.encoding !== undefined ||
    ast.context !== undefined ||
    ast.annotations?.['parseOptions'] !== undefined
  ) {
    return false
  }

  return Match.value(ast).pipe(
    Match.withReturnType<boolean>(),
    Match.tagsExhaustive({
      Declaration: () => false,
      Null: () => true,
      Undefined: () => true,
      Void: () => true,
      Never: () => true,
      Unknown: () => true,
      Any: () => true,
      String: () => true,
      Number: () => true,
      Boolean: () => true,
      BigInt: () => true,
      Symbol: () => true,
      Literal: () => true,
      UniqueSymbol: () => true,
      ObjectKeyword: () => true,
      Enum: () => true,
      TemplateLiteral: ({ parts }) => parts.every(isDirectlyCopyable),
      Arrays: () => false,
      Objects: () => false,
      Union: ({ mode, types }) =>
        mode !== 'oneOf' && types.every(isDirectlyCopyable),
      Suspend: () => false,
    }),
  )
}

const getDirectPropertyNames = (
  propertySignatures: ReadonlyArray<SchemaAST.PropertySignature>,
): Array<PropertyKey> | undefined => {
  const names: Array<PropertyKey> = []

  for (const { name, type } of propertySignatures) {
    if (name !== '_tag' && !isDirectlyCopyable(SchemaAST.toType(type))) {
      return undefined
    }

    names.push(name)
  }

  return names
}

const makeCallable = <Tag extends string, Fields extends Schema.Struct.Fields>(
  tag: Tag,
  fields: Fields,
): CallableTaggedStruct<Tag, Fields> => {
  const schema = Schema.TaggedStruct(tag, fields)
  const propertyNames = Object.hasOwn(fields, '_tag')
    ? undefined
    : getDirectPropertyNames(schema.ast.propertySignatures)
  const make = (value: unknown) =>
    schema.make(
      /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
      (value ?? {}) as Parameters<typeof schema.make>[0],
    )
  const construct =
    propertyNames !== undefined
      ? (value: unknown): Record<PropertyKey, unknown> => {
          /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
          const input = (value ?? {}) as Record<PropertyKey, unknown>
          if (Object(input) !== input) {
            return make(value)
          }

          const output: Record<PropertyKey, unknown> = {}

          for (const name of propertyNames) {
            const descriptor = Object.getOwnPropertyDescriptor(input, name)

            if (
              name !== '_tag' &&
              descriptor === undefined &&
              Reflect.has(input, name)
            ) {
              return make(value)
            }

            if (descriptor !== undefined && !('value' in descriptor)) {
              return make(value)
            }

            const inputValue =
              descriptor === undefined ? undefined : input[name]

            if (name === '_tag') {
              if (inputValue !== undefined && inputValue !== tag) {
                return make(value)
              }

              assignPlainProperty(output, name, tag)
            } else {
              assignPlainProperty(output, name, inputValue)
            }
          }

          return output
        }
      : make

  /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
  return new Proxy(function () {} as unknown as object, {
    apply(_target, _thisArg, argumentsList) {
      return construct(argumentsList[0])
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
}

type TaggedUnionProperty = keyof Schema.TaggedUnion<{}>

type UnionProperty = TaggedUnionProperty | 'members' | 'subset'

const reservedUnionPropertyNames = new Set<string>(['members', 'subset'])

const taggedUnionTypeOnlyPropertyNames = new Set<string>([
  'Rebuild',
  '~type.parameters',
  'Type',
  'Encoded',
  'DecodingServices',
  'EncodingServices',
  '~type.make.in',
  '~type.make',
  '~type.constructor.default',
  'Iso',
  '~type.mutability',
  '~type.optionality',
  '~encoded.mutability',
  '~encoded.optionality',
] satisfies ReadonlyArray<TaggedUnionProperty>)

type VariantNameCollision<Name extends PropertyKey> = Readonly<{
  'Variant names must not conflict with union properties': Name
}>

type ValidateVariantNames<
  CasesByTag extends Record<string, Schema.Struct.Fields>,
> =
  Extract<keyof CasesByTag, UnionProperty> extends infer Name
    ? [Name] extends [never]
      ? unknown
      : VariantNameCollision<Name & PropertyKey>
    : never

type BaseTaggedUnion<CasesByTag extends Record<string, Schema.Struct.Fields>> =
  Schema.TaggedUnion<{
    readonly [Tag in keyof CasesByTag & string]: Schema.TaggedStruct<
      Tag,
      CasesByTag[Tag]
    >
  }>

type TaggedUnionType<CasesByTag extends Record<string, Schema.Struct.Fields>> =
  BaseTaggedUnion<CasesByTag>['Type']

type TaggedUnionMatchCases<
  CasesByTag extends Record<string, Schema.Struct.Fields>,
  Input extends TaggedUnionType<CasesByTag>,
  Output,
> = {
  readonly [Tag in keyof CasesByTag & string]: (
    value: Extract<Input, { readonly _tag: Tag }>,
  ) => Output
}

type TaggedUnionMatch<CasesByTag extends Record<string, Schema.Struct.Fields>> =
  {
    <
      Output,
      Input extends TaggedUnionType<CasesByTag> = TaggedUnionType<CasesByTag>,
    >(
      cases: TaggedUnionMatchCases<CasesByTag, Input, Output>,
    ): (value: Input) => Output
    <
      Output,
      Input extends TaggedUnionType<CasesByTag> = TaggedUnionType<CasesByTag>,
    >(
      value: Input,
      cases: TaggedUnionMatchCases<CasesByTag, Input, Output>,
    ): Output
  }

interface UnionSchema<
  CasesByTag extends Record<string, Schema.Struct.Fields>,
> extends Schema.BottomLazy<
  BaseTaggedUnion<CasesByTag>['ast'],
  UnionSchema<CasesByTag>
> {
  readonly Type: BaseTaggedUnion<CasesByTag>['Type']
  readonly Encoded: BaseTaggedUnion<CasesByTag>['Encoded']
  readonly DecodingServices: BaseTaggedUnion<CasesByTag>['DecodingServices']
  readonly EncodingServices: BaseTaggedUnion<CasesByTag>['EncodingServices']
  readonly '~type.make.in': BaseTaggedUnion<CasesByTag>['~type.make.in']
  readonly '~type.make': BaseTaggedUnion<CasesByTag>['~type.make']
  readonly Iso: BaseTaggedUnion<CasesByTag>['Iso']
  readonly match: TaggedUnionMatch<CasesByTag>
}

type TaggedUnionMemberFor<
  CasesByTag extends Record<string, Schema.Struct.Fields>,
  Tag extends keyof CasesByTag & string,
> = CallableTaggedStruct<Tag, CasesByTag[Tag]>

type TaggedUnionMember<
  CasesByTag extends Record<string, Schema.Struct.Fields>,
> = {
  readonly [Tag in keyof CasesByTag & string]: TaggedUnionMemberFor<
    CasesByTag,
    Tag
  >
}[keyof CasesByTag & string]

type TaggedUnionSubsetMembers<
  CasesByTag extends Record<string, Schema.Struct.Fields>,
  Tags extends ReadonlyArray<keyof CasesByTag & string>,
> = {
  readonly [Index in keyof Tags]: Tags[Index] extends keyof CasesByTag & string
    ? TaggedUnionMemberFor<CasesByTag, Tags[Index]>
    : never
}

interface RichUnionSchema<
  CasesByTag extends Record<string, Schema.Struct.Fields>,
> extends UnionSchema<CasesByTag> {
  readonly guards: BaseTaggedUnion<CasesByTag>['guards']
  readonly isAnyOf: BaseTaggedUnion<CasesByTag>['isAnyOf']
  readonly members: ReadonlyArray<TaggedUnionMember<CasesByTag>>
  /** Returns a Schema that accepts only the named variants. */
  readonly subset: <
    const Tags extends ReadonlyArray<keyof CasesByTag & string>,
  >(
    tags: Tags,
  ) => Schema.Union<TaggedUnionSubsetMembers<CasesByTag, Tags>>
}

/** The Schema returned by `defineTaggedUnion`. It includes callable variant
 * constructors, exhaustive `match`, `guards`, `isAnyOf`, `subset`, and
 * `members`. */
export type TaggedUnion<
  CasesByTag extends Record<string, Schema.Struct.Fields>,
> = RichUnionSchema<CasesByTag> & {
  readonly [Tag in keyof CasesByTag & string]: CallableTaggedStruct<
    Tag,
    CasesByTag[Tag]
  >
}

/** The Schema returned by `defineMessageUnion`. Each variant is a callable
 * property on the union, and `match` handles the union exhaustively. Pass a
 * structurally refined union as `match`'s optional second type argument to
 * preserve narrower payload fields in each handler. */
export type MessageUnion<
  CasesByTag extends Record<string, Schema.Struct.Fields>,
> = UnionSchema<CasesByTag> & {
  readonly [Tag in keyof CasesByTag & string]: CallableTaggedStruct<
    Tag,
    CasesByTag[Tag]
  >
}

/** The Schema returned by `defineRouteUnion`. It has the same constructors and
 * helpers as `TaggedUnion`, with a Route-specific name for public signatures. */
export type RouteUnion<
  CasesByTag extends Record<string, Schema.Struct.Fields>,
> = TaggedUnion<CasesByTag>

const defineUnion = <CasesByTag extends Record<string, Schema.Struct.Fields>>(
  variantLabel: string,
  casesByTag: Record<string, Schema.Struct.Fields>,
): TaggedUnion<CasesByTag> => {
  const union = Schema.TaggedUnion(casesByTag)

  const conflictingNames = Array.filter(
    Object.keys(casesByTag),
    name =>
      Reflect.has(union, name) ||
      taggedUnionTypeOnlyPropertyNames.has(name) ||
      reservedUnionPropertyNames.has(name),
  )
  if (Array.isArrayNonEmpty(conflictingNames)) {
    throw new Error(
      `${variantLabel} names conflict with union properties: ${conflictingNames.join(', ')}`,
    )
  }

  const callables: Record<
    string,
    CallableTaggedStruct<string, Schema.Struct.Fields>
  > = {}
  for (const [tag, fields] of Object.entries<Schema.Struct.Fields>(
    casesByTag,
  )) {
    callables[tag] = makeCallable(tag, fields)
  }

  const subset = (tags: ReadonlyArray<string>) => {
    const members: Array<CallableTaggedStruct<string, Schema.Struct.Fields>> =
      []

    for (const tag of tags) {
      const member = callables[tag]
      if (!Object.hasOwn(callables, tag) || member === undefined) {
        throw new Error(`Union subset contains an unknown variant: ${tag}`)
      }

      members.push(member)
    }

    return Schema.Union(members)
  }

  /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
  return Object.assign(union, callables, {
    // NOTE: Schema.TaggedUnion does not expose the member list that Schema.Union
    // does. Machine.define uses that list to enumerate the state tags.
    members: Object.values(callables),
    subset,
  }) as unknown as TaggedUnion<CasesByTag>
}

/**
 * Declares every Message variant in one object. Each key is a tag, and its
 * value lists that Message's fields.
 *
 * The result is both a Schema and a namespace. Construct a Message with a
 * variant such as `Message.ClickedReset()`, and handle every variant with
 * `Message.match`. Each constructor is also a Schema, so it can appear in a
 * `Command.define` `messages` list.
 *
 * Message unions intentionally expose only constructors and exhaustive
 * `match`. Use Effect `Match` when only some tags need handling or several tags
 * share one handler.
 *
 * Declare a Submodel's OutMessages in their own `defineMessageUnion`. Messages
 * are facts the Submodel handles; OutMessages are facts it reports to its
 * parent. Keep the two unions separate even when two variants carry the same
 * fields.
 *
 * A tag cannot use a name already owned by the union, such as `make`, `match`,
 * `cases`, `ast`, `members`, or `subset`. TypeScript rejects these names, and
 * untyped calls throw an error.
 *
 * @example
 * ```typescript
 * export const Message = defineMessageUnion({
 *   ClickedReset: {},
 *   ChangedCount: { count: Schema.Number },
 * })
 * export type Message = typeof Message.Type
 *
 * Message.ClickedReset() // { _tag: 'ClickedReset' }
 * Message.ChangedCount({ count: 1 }) // { _tag: 'ChangedCount', count: 1 }
 * ```
 */
export function defineMessageUnion<
  const CasesByTag extends Record<string, Schema.Struct.Fields>,
>(
  casesByTag: CasesByTag & ValidateVariantNames<CasesByTag>,
): MessageUnion<CasesByTag> {
  return defineUnion<CasesByTag>('Message variant', casesByTag)
}

/**
 * Declares every variant of a domain union in one object. Use it for Model
 * states, submission results, filter modes, and other unions that are not
 * Messages or Routes.
 *
 * The result is both a Schema and a namespace. It provides:
 *
 * - One callable Schema constructor per variant.
 * - `match` for exhaustive handling.
 * - `guards` and `isAnyOf` for variant checks.
 * - `subset` for a Schema that accepts only the named variants.
 * - `members` for APIs such as `Machine.define` that enumerate the union.
 *
 * Use `taggedStruct` when the variants cannot be declared together. Recursive
 * unions and standalone tagged structs are the common cases.
 *
 * A tag cannot use a name already owned by the union, such as `make`, `match`,
 * `cases`, `ast`, `members`, or `subset`. TypeScript rejects these names, and
 * untyped calls throw an error.
 *
 * @example
 * ```typescript
 * export const Submission = defineTaggedUnion({
 *   NotSubmitted: {},
 *   Submitting: {},
 *   Succeeded: {},
 *   Failed: { error: Schema.String },
 * })
 * export type Submission = typeof Submission.Type
 *
 * Submission.NotSubmitted() // { _tag: 'NotSubmitted' }
 * Submission.Failed({ error: 'timeout' })
 * ```
 */
export function defineTaggedUnion<
  const CasesByTag extends Record<string, Schema.Struct.Fields>,
>(
  casesByTag: CasesByTag & ValidateVariantNames<CasesByTag>,
): TaggedUnion<CasesByTag> {
  return defineUnion<CasesByTag>('Variant', casesByTag)
}

/**
 * Declares every application Route in one object. Each key is a tag, and its
 * value lists the fields parsed from the URL.
 *
 * The result is both a Schema and the `AppRoute` namespace. Each variant is a
 * callable Schema, so `AppRoute.Person` works with `mapTo` and
 * `parseUrlWithFallback`, while `AppRoute.Person({ personId: 42 })` constructs
 * a value.
 *
 * Use `match` to handle every Route, `guards` or `isAnyOf` to check selected
 * tags, and `subset` when another Schema accepts only some Routes. A subset
 * includes only the tags named in the call. Adding a Route to `AppRoute` does
 * not change an existing subset.
 *
 * Routers remain separate. A Route is the parsed value; a Router describes the
 * URL that produces it.
 *
 * A tag cannot use a name already owned by the union, such as `make`, `match`,
 * `cases`, `ast`, `members`, or `subset`. TypeScript rejects these names, and
 * untyped calls throw an error.
 *
 * @example
 * ```typescript
 * export const AppRoute = defineRouteUnion({
 *   Home: {},
 *   Person: { personId: Schema.Number },
 *   NotFound: { path: Schema.String },
 * })
 * export type AppRoute = typeof AppRoute.Type
 *
 * export const homeRouter = pipe(root, mapTo(AppRoute.Home))
 * export const personRouter = pipe(
 *   literal('people'),
 *   slash(int('personId')),
 *   mapTo(AppRoute.Person),
 * )
 *
 * export const urlToAppRoute = parseUrlWithFallback(
 *   oneOf(personRouter, homeRouter),
 *   AppRoute.NotFound,
 * )
 * ```
 */
export function defineRouteUnion<
  const CasesByTag extends Record<string, Schema.Struct.Fields>,
>(
  casesByTag: CasesByTag & ValidateVariantNames<CasesByTag>,
): RouteUnion<CasesByTag> {
  return defineUnion<CasesByTag>('Route variant', casesByTag)
}

/**
 * Declares one tagged struct as a callable Schema. Call `Loading()` instead of
 * `Loading.make()`.
 *
 * Prefer `defineTaggedUnion` when every variant can be declared together. Use
 * `taggedStruct` for a recursive union, a union assembled across modules, a
 * tagged child struct that is not a union variant, or a variant created inside
 * a generic Schema factory.
 *
 * @example
 * ```typescript
 * const Loading = taggedStruct('Loading')
 * Loading() // { _tag: 'Loading' }
 *
 * const Ok = taggedStruct('Ok', { data: Schema.String })
 * Ok({ data: 'hello' }) // { _tag: 'Ok', data: 'hello' }
 * ```
 */
export function taggedStruct<Tag extends string>(
  tag: Tag,
): CallableTaggedStruct<Tag, {}>
export function taggedStruct<
  Tag extends string,
  Fields extends Schema.Struct.Fields,
>(tag: Tag, fields: Fields): CallableTaggedStruct<Tag, Fields>
export function taggedStruct(
  tag: string,
  fields: Schema.Struct.Fields = {},
): any {
  return makeCallable(tag, fields)
}
