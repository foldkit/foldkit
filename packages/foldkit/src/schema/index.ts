import { Array, Cause, Match, Predicate, Schema, SchemaAST } from 'effect'

/** A `TaggedStruct` schema that can be called directly as a constructor: `Foo({ count: 1 })` instead of `Foo.make({ count: 1 })`. */
export interface CallableTaggedStruct<
  Tag extends string,
  Fields extends Schema.Struct.Fields,
> extends Schema.TaggedStruct<Tag, Fields> {
  (value: Omit<this['Type'], '_tag'> & Readonly<{ _tag?: Tag }>): this['Type']
  (
    ...args: keyof Fields extends never
      ? readonly [value?: this['~type.make.in'] | void]
      : readonly [value: this['~type.make.in']]
  ): this['Type']
}

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

const runConstructorOperation = <Value>(operation: () => Value): Value => {
  try {
    return operation()
  } catch (error) {
    throw new Error('Constructor adapter can only throw schema issues', {
      cause: Cause.die(error),
    })
  }
}

const isDirectlyCopyable = (ast: SchemaAST.AST): boolean => {
  if (
    ast.checks !== undefined ||
    ast.encoding !== undefined ||
    ast.context !== undefined
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
      Union: ({ options, types }) =>
        options?.mode !== 'oneOf' && types.every(isDirectlyCopyable),
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

const callableTaggedStructs = new WeakSet<object>()

/** @internal Recognizes callable tagged constructors created by Foldkit. */
export const isCallableTaggedStruct = (value: unknown): boolean =>
  Predicate.isFunction(value) && callableTaggedStructs.has(value)

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
            const inputValue = runConstructorOperation(() => {
              const hasProperty =
                name === '__proto__'
                  ? Object.hasOwn(input, name)
                  : Reflect.has(input, name)
              return hasProperty ? input[name] : undefined
            })

            if (name === '_tag') {
              if (inputValue !== undefined && inputValue !== tag) {
                return make(value)
              }

              runConstructorOperation(() =>
                assignPlainProperty(output, name, tag),
              )
            } else {
              runConstructorOperation(() =>
                assignPlainProperty(output, name, inputValue),
              )
            }
          }

          return output
        }
      : make

  /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
  const callable = new Proxy(function () {} as unknown as object, {
    apply(_target, _thisArg, argumentsList) {
      return construct(argumentsList[0])
    },
    get(_target, property) {
      return Reflect.get(schema, property)
    },
    has(_target, property) {
      return Reflect.has(schema, property)
    },
    getPrototypeOf() {
      return Reflect.getPrototypeOf(schema)
    },
  }) as unknown as CallableTaggedStruct<Tag, Fields>

  callableTaggedStructs.add(callable)
  return callable
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
  readonly [
    Tag in keyof CasesByTag & string as Extract<
      Input,
      { readonly _tag: Tag }
    > extends never
      ? never
      : Tag
  ]-?: (value: Extract<Input, { readonly _tag: Tag }>) => Output
} & {
  readonly [
    Tag in keyof CasesByTag & string as Extract<
      Input,
      { readonly _tag: Tag }
    > extends never
      ? Tag
      : never
  ]?: never
}

type TaggedUnionMatchOrElseCases<
  CasesByTag extends Record<string, Schema.Struct.Fields>,
  Input extends TaggedUnionType<CasesByTag>,
  Output,
> = {
  readonly [Tag in keyof CasesByTag & string]?: (
    value: Extract<Input, { readonly _tag: Tag }>,
  ) => Output
}

type TaggedUnionExplicitMatchCases<
  CasesByTag extends Record<string, Schema.Struct.Fields>,
  Input extends TaggedUnionType<CasesByTag>,
  Output,
> = {
  readonly [Tag in keyof CasesByTag & string]: (
    value: Extract<Input, { readonly _tag: Tag }>,
  ) => Output
}

declare const OmittedMatchOutputTypeId: unique symbol

type OmittedMatchOutput = Readonly<{
  [OmittedMatchOutputTypeId]: true
}>

type IsAny<Value> = 0 extends 1 & Value ? true : false

type IsOmittedMatchOutput<Output> =
  IsAny<Output> extends true
    ? false
    : [Output, OmittedMatchOutput] extends [OmittedMatchOutput, Output]
      ? true
      : false

type ValidateExplicitMatchOutput<Output, Return> =
  IsAny<Output> extends true
    ? IsAny<Return> extends true
      ? unknown
      : never
    : IsAny<Return> extends true
      ? never
      : [Output, Return] extends [Return, Output]
        ? unknown
        : never

type TaggedUnionExplicitCases<
  CasesByTag extends Record<string, Schema.Struct.Fields>,
  Input extends TaggedUnionType<CasesByTag>,
  Output,
> =
  IsOmittedMatchOutput<Output> extends true
    ? never
    : TaggedUnionExplicitMatchCases<CasesByTag, Input, NoInfer<Output>>

type TaggedUnionExplicitMatchOrElseCases<
  CasesByTag extends Record<string, Schema.Struct.Fields>,
  Input extends TaggedUnionType<CasesByTag>,
  Output,
> =
  IsOmittedMatchOutput<Output> extends true
    ? never
    : TaggedUnionMatchOrElseCases<CasesByTag, Input, NoInfer<Output>>

type TaggedUnionCaseReturns<Cases> = {
  [Tag in keyof Cases]-?: NonNullable<Cases[Tag]> extends (
    ...args: never
  ) => infer Output
    ? Output
    : never
}[keyof Cases]

type TaggedUnionMatchOrElseOutput<Cases, OrElse> =
  | TaggedUnionCaseReturns<Cases>
  | (OrElse extends (...args: never) => infer Output ? Output : never)

type TaggedUnionMatchOrElseHandledTags<
  CasesByTag extends Record<string, Schema.Struct.Fields>,
  Cases,
> = Extract<
  {
    [Tag in keyof Cases]-?: {} extends Pick<Cases, Tag> ? never : Tag
  }[keyof Cases],
  keyof CasesByTag & string
>

type ValidateTaggedUnionCases<
  CasesByTag extends Record<string, Schema.Struct.Fields>,
  Cases,
> = {
  readonly [Tag in Exclude<keyof Cases, keyof CasesByTag & string>]: never
}

type TaggedUnionMatch<CasesByTag extends Record<string, Schema.Struct.Fields>> =
  {
    <
      Input extends TaggedUnionType<CasesByTag>,
      const Cases extends TaggedUnionMatchCases<CasesByTag, Input, any>,
    >(
      value: Input,
      cases: Cases & ValidateTaggedUnionCases<CasesByTag, Cases>,
    ): TaggedUnionCaseReturns<Cases>
    <
      const Cases extends TaggedUnionMatchCases<
        CasesByTag,
        TaggedUnionType<CasesByTag>,
        any
      >,
    >(
      cases: Cases &
        ValidateTaggedUnionCases<CasesByTag, Cases> &
        (IsAny<Cases> extends true ? never : unknown),
    ): (value: TaggedUnionType<CasesByTag>) => TaggedUnionCaseReturns<Cases>
    <
      Output = OmittedMatchOutput,
      Input extends TaggedUnionType<CasesByTag> = TaggedUnionType<CasesByTag>,
      Return extends NoInfer<Output> = Output,
    >(
      cases: TaggedUnionExplicitCases<CasesByTag, Input, Output> &
        ValidateExplicitMatchOutput<Output, Return>,
    ): (value: Input) => Return
    <
      Output = OmittedMatchOutput,
      Input extends TaggedUnionType<CasesByTag> = TaggedUnionType<CasesByTag>,
      Return extends NoInfer<Output> = Output,
    >(
      value: Input,
      cases: TaggedUnionExplicitCases<CasesByTag, Input, Output> &
        ValidateExplicitMatchOutput<Output, Return>,
    ): Return
  }

type TaggedUnionMatchOrElse<
  CasesByTag extends Record<string, Schema.Struct.Fields>,
> = {
  <
    Input extends TaggedUnionType<CasesByTag>,
    const Cases extends TaggedUnionMatchOrElseCases<CasesByTag, Input, unknown>,
    OrElse extends (
      value: Exclude<
        Input,
        {
          readonly _tag: TaggedUnionMatchOrElseHandledTags<CasesByTag, Cases>
        }
      >,
    ) => unknown,
  >(
    value: Input,
    cases: Cases & ValidateTaggedUnionCases<CasesByTag, Cases>,
    orElse: OrElse,
  ): TaggedUnionMatchOrElseOutput<Cases, OrElse>
  <
    const Cases extends TaggedUnionMatchOrElseCases<
      CasesByTag,
      TaggedUnionType<CasesByTag>,
      unknown
    >,
    OrElse extends (
      value: Exclude<
        TaggedUnionType<CasesByTag>,
        {
          readonly _tag: TaggedUnionMatchOrElseHandledTags<CasesByTag, Cases>
        }
      >,
    ) => unknown,
  >(
    cases: Cases & ValidateTaggedUnionCases<CasesByTag, Cases>,
    orElse: OrElse,
  ): (
    value: TaggedUnionType<CasesByTag>,
  ) => TaggedUnionMatchOrElseOutput<Cases, OrElse>
  <
    Output = OmittedMatchOutput,
    Input extends TaggedUnionType<CasesByTag> = TaggedUnionType<CasesByTag>,
    Return extends NoInfer<Output> = Output,
  >(
    cases: TaggedUnionExplicitMatchOrElseCases<CasesByTag, Input, Output> &
      ValidateExplicitMatchOutput<Output, Return>,
    orElse: (value: Input) => NoInfer<Output>,
  ): (value: Input) => Return
  <
    Output = OmittedMatchOutput,
    Input extends TaggedUnionType<CasesByTag> = TaggedUnionType<CasesByTag>,
    Return extends NoInfer<Output> = Output,
  >(
    value: Input,
    cases: TaggedUnionExplicitMatchOrElseCases<CasesByTag, Input, Output> &
      ValidateExplicitMatchOutput<Output, Return>,
    orElse: (value: Input) => NoInfer<Output>,
  ): Return
}

/** The common Schema contract of a tagged union, including decoded/encoded
 * types and its exhaustive matcher. Usually inferred through defineTaggedUnion
 * or defineMessageUnion; the named interface also supports declaration emission. */
export interface TaggedUnionBaseSchema<
  CasesByTag extends Record<string, Schema.Struct.Fields>,
> extends Schema.BottomLazy<
  BaseTaggedUnion<CasesByTag>['ast'],
  TaggedUnionBaseSchema<CasesByTag>
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

/** The Schema capabilities of defineTaggedUnion: guards, partial matching,
 * members, and subset selection. TaggedUnion also carries callable variants. */
export interface TaggedUnionSchema<
  CasesByTag extends Record<string, Schema.Struct.Fields>,
> extends TaggedUnionBaseSchema<CasesByTag> {
  readonly guards: BaseTaggedUnion<CasesByTag>['guards']
  readonly isAnyOf: BaseTaggedUnion<CasesByTag>['isAnyOf']
  readonly matchOrElse: TaggedUnionMatchOrElse<CasesByTag>
  readonly members: ReadonlyArray<TaggedUnionMember<CasesByTag>>
  /** Returns a Schema that accepts only the named variants. */
  readonly subset: <
    const Tags extends ReadonlyArray<keyof CasesByTag & string>,
  >(
    tags: Tags,
  ) => Schema.Union<TaggedUnionSubsetMembers<CasesByTag, Tags>>
}

/** The Schema returned by `defineTaggedUnion`. It includes callable variant
 * constructors, exhaustive `match`, partial `matchOrElse`, `guards`,
 * `isAnyOf`, `subset`, and `members`. With no output type argument, `match`
 * returns the union of the handler results. Pass an output type argument when
 * every handler must return that type. Pass a structurally refined union as
 * the optional second type argument to preserve narrower payload fields in
 * each handler. */
export type TaggedUnion<
  CasesByTag extends Record<string, Schema.Struct.Fields>,
> = TaggedUnionSchema<CasesByTag> & {
  readonly [Tag in keyof CasesByTag & string]: CallableTaggedStruct<
    Tag,
    CasesByTag[Tag]
  >
}

/** The Schema returned by `defineMessageUnion`. Each variant is a callable
 * property on the union, and `match` handles the union exhaustively. With no
 * output type argument, `match` returns the union of the handler results. Pass
 * an output type argument when every handler must return that type. Pass a
 * structurally refined union as `match`'s optional second type argument to
 * preserve narrower payload fields in each handler. */
export type MessageUnion<
  CasesByTag extends Record<string, Schema.Struct.Fields>,
> = TaggedUnionBaseSchema<CasesByTag> & {
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
 * Declare a Block's OutMessages in their own `defineMessageUnion`. Messages
 * are facts the Block handles; OutMessages are facts it reports to its
 * parent. Keep the two unions separate even when two variants carry the same
 * fields.
 *
 * A tag cannot use a name already owned by the union, such as `make`, `match`,
 * `matchOrElse`, `cases`, `ast`, `members`, or `subset`. TypeScript rejects
 * these names, and untyped calls throw an error.
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
 * - `matchOrElse` for selected variants with a fallback for the rest.
 * - `guards` and `isAnyOf` for variant checks.
 * - `subset` for a Schema that accepts only the named variants.
 * - `members` for APIs such as `Machine.define` that enumerate the union.
 *
 * Use `taggedStruct` when the variants cannot be declared together. Recursive
 * unions and standalone tagged structs are the common cases.
 *
 * A tag cannot use a name already owned by the union, such as `make`, `match`,
 * `matchOrElse`, `cases`, `ast`, `members`, or `subset`. TypeScript rejects
 * these names, and untyped calls throw an error.
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
 * The result is both a Schema and the `ApplicationRoute` namespace. Each
 * variant is a callable Schema, so `ApplicationRoute.Person` works with
 * `mapTo` and `parseUrlWithFallback`, while
 * `ApplicationRoute.Person({ personId: 42 })` constructs a value.
 *
 * Use `match` to handle every Route, `matchOrElse` to handle selected Routes
 * with a fallback, `guards` or `isAnyOf` to check selected tags, and `subset`
 * when another Schema accepts only some Routes. A subset includes only the
 * tags named in the call. Adding a Route to `ApplicationRoute` does not change
 * an existing subset.
 *
 * Routers remain separate. A Route is the parsed value; a Router describes the
 * URL that produces it.
 *
 * A tag cannot use a name already owned by the union, such as `make`, `match`,
 * `matchOrElse`, `cases`, `ast`, `members`, or `subset`. TypeScript rejects
 * these names, and untyped calls throw an error.
 *
 * @example
 * ```typescript
 * export const ApplicationRoute = defineRouteUnion({
 *   Home: {},
 *   Person: { personId: Schema.Number },
 *   NotFound: { path: Schema.String },
 * })
 * export type ApplicationRoute = typeof ApplicationRoute.Type
 *
 * export const homeRouter = pipe(root, mapTo(ApplicationRoute.Home))
 * export const personRouter = pipe(
 *   literal('people'),
 *   slash(int('personId')),
 *   mapTo(ApplicationRoute.Person),
 * )
 *
 * export const urlToApplicationRoute = parseUrlWithFallback(
 *   oneOf(personRouter, homeRouter),
 *   ApplicationRoute.NotFound,
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
