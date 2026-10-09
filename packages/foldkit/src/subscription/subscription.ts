import {
  Array,
  type Equivalence,
  Function,
  Option,
  Predicate,
  Record,
  Schema,
  Stream,
  pipe,
} from 'effect'

import {
  type Handler,
  type ToLayerWithKeepAlive,
  type ToLayerWithoutKeepAlive,
  makeHandler,
} from './handler.js'

export type { Handler } from './handler.js'

type SubscriptionBrand = {
  readonly __subscription: never
}

type DependenciesSchema<Dependencies> = Schema.Schema<Dependencies> & {
  readonly fields: Schema.Struct.Fields
}

/**
 * The entry shape produced by helpers like `Subscription.persistentEntry` and
 * `Port.subscriptionEntry` before branding. Pass values of this shape into
 * `Subscription.make` as entry values.
 */
export type EntryWithoutKeepAlive<Model, Message, Dependencies, Services> = {
  readonly dependenciesSchema: DependenciesSchema<Dependencies>
  readonly modelToDependencies: (model: Model) => Dependencies
  readonly keepAliveEquivalence?: never
  readonly dependenciesToStream: (
    dependencies: Dependencies,
  ) => Stream.Stream<Message, never, Services>
}

type EntryWithKeepAlive<Model, Message, Dependencies, Services> = {
  readonly dependenciesSchema: DependenciesSchema<Dependencies>
  readonly modelToDependencies: (model: Model) => Dependencies
  readonly keepAliveEquivalence: Equivalence.Equivalence<Dependencies>
  readonly dependenciesToStream: (
    dependencies: Dependencies,
    readDependencies: () => Dependencies,
  ) => Stream.Stream<Message, never, Services>
}

type Entry<Model, Message, Dependencies, Services = never> =
  | EntryWithoutKeepAlive<Model, Message, Dependencies, Services>
  | EntryWithKeepAlive<Model, Message, Dependencies, Services>

/** A Subscription entry whose Stream implementation is supplied by a Layer.
 * `messages` declares the schemas the handler Stream may emit; `toLayer`
 * accepts only that Message union. */
export type LayeredEntryWithoutKeepAlive<
  Name extends string,
  Model,
  Message,
  Dependencies,
  Messages extends ReadonlyArray<Schema.Top> = ReadonlyArray<Schema.Top>,
> = EntryWithoutKeepAlive<Model, Message, Dependencies, Handler<Name>> &
  Readonly<{
    name: Name
    messages: Messages
    toLayer: ToLayerWithoutKeepAlive<Name, Dependencies, Message>
  }>

/** A keep-alive Subscription entry whose Stream implementation is supplied by
 * a Layer. Its declared `messages` constrain the handler Stream output. */
export type LayeredEntryWithKeepAlive<
  Name extends string,
  Model,
  Message,
  Dependencies,
  Messages extends ReadonlyArray<Schema.Top> = ReadonlyArray<Schema.Top>,
> = EntryWithKeepAlive<Model, Message, Dependencies, Handler<Name>> &
  Readonly<{
    name: Name
    messages: Messages
    toLayer: ToLayerWithKeepAlive<Name, Dependencies, Message>
  }>

/**
 * A single subscription entry produced by `Subscription.make`,
 * `Subscription.lift`, or `Subscription.aggregate`. The brand field is
 * `never`, so application code cannot manually construct a `Subscription`
 * value: it must go through one of those constructors (or a helper like
 * `Subscription.persistentEntry` that returns an entry shape, then through
 * `make`).
 *
 * Two variants by `keepAliveEquivalence` presence:
 *
 * - Without `keepAliveEquivalence` (the common case), every Model change recomputes
 *   the dependencies. Equivalent dependencies leave the Stream alone; any
 *   change tears it down and restarts. `dependenciesToStream` takes a single
 *   argument: the latest dependencies.
 * - With `keepAliveEquivalence` (an escape hatch), Model changes that the
 *   equivalence treats as equal leave the Stream running, but the running
 *   Stream can still read the latest dependencies via the second
 *   `readDependencies` argument. Use this when the Stream needs mid-flight
 *   access to data that changes often but shouldn't trigger restarts
 *   (Foldkit UI's `DragAndDrop.autoScroll` reading the latest pointer
 *   `clientY` each rAF tick is the canonical example).
 *
 * `dependenciesSchema` must be a `Schema.Struct` so every dependency is
 * explicitly named at the schema level.
 */
export type Subscription<
  Model,
  Message,
  Dependencies,
  Services = never,
> = Entry<Model, Message, Dependencies, Services> & SubscriptionBrand

/** A record of named Subscriptions keyed by dependency field name. */
export type Subscriptions<Model, Message, Services = never> = Readonly<
  Record<string, Subscription<Model, Message, any, Services>>
>

/**
 * Callbacks for a subscription entry without `keepAliveEquivalence`. Dependencies
 * are inferred from the field map passed to `entry`.
 */
type EntryCallbacksWithoutKeepAlive<Model, Message, Dependencies, Services> = {
  readonly modelToDependencies: (model: Model) => Dependencies
  readonly keepAliveEquivalence?: never
  readonly dependenciesToStream: (
    dependencies: Dependencies,
  ) => Stream.Stream<Message, never, Services>
}

/**
 * Callbacks for a subscription entry with `keepAliveEquivalence`. Dependencies
 * are inferred from the field map passed to `entry`.
 */
type EntryCallbacksWithKeepAlive<Model, Message, Dependencies, Services> = {
  readonly modelToDependencies: (model: Model) => Dependencies
  readonly keepAliveEquivalence: Equivalence.Equivalence<Dependencies>
  readonly dependenciesToStream: (
    dependencies: Dependencies,
    readDependencies: () => Dependencies,
  ) => Stream.Stream<Message, never, Services>
}

type LayeredEntryCallbacksWithoutKeepAlive<Model, Dependencies> = {
  readonly messages: ReadonlyArray<Schema.Top>
  readonly modelToDependencies: (model: Model) => Dependencies
  readonly keepAliveEquivalence?: never
}

type LayeredEntryCallbacksWithKeepAlive<Model, Dependencies> = {
  readonly messages: ReadonlyArray<Schema.Top>
  readonly modelToDependencies: (model: Model) => Dependencies
  readonly keepAliveEquivalence: Equivalence.Equivalence<Dependencies>
}

type DeclaredMessages<Callbacks> =
  Callbacks extends Readonly<{
    messages: infer Messages extends ReadonlyArray<Schema.Top>
  }>
    ? Messages
    : never

type EmittedMessage<Messages extends ReadonlyArray<Schema.Top>> =
  Schema.Schema.Type<Messages[number]>

type DeclaredEntryCallbacksWithoutKeepAlive<
  Model,
  Dependencies,
  Services,
  Messages extends ReadonlyArray<Schema.Top>,
> = EntryCallbacksWithoutKeepAlive<
  Model,
  EmittedMessage<Messages>,
  Dependencies,
  Services
> &
  Readonly<{ messages: Messages }>

type DeclaredEntryCallbacksWithKeepAlive<
  Model,
  Dependencies,
  Services,
  Messages extends ReadonlyArray<Schema.Top>,
> = EntryCallbacksWithKeepAlive<
  Model,
  EmittedMessage<Messages>,
  Dependencies,
  Services
> &
  Readonly<{ messages: Messages }>

/**
 * Builds a single Subscription entry from a handler name, field map, and
 * lifecycle callbacks. The resulting entry has a `toLayer` method that
 * supplies its Stream implementation. The handler name identifies that Layer
 * requirement; the key returned from `Subscription.make` continues to identify
 * the entry's running fiber.
 *
 * The two-argument inline form puts `dependenciesToStream` in the callbacks
 * when the Stream does not need a separate handler Layer. Its Effect services
 * are provided directly to the application.
 *
 * The field map is the same shape you would pass to `Schema.Struct`. Keeping it
 * positional lets TypeScript fully resolve the `Dependencies` type before
 * contextually typing the callbacks, including fields that use Schema
 * transforms such as `Schema.Option`.
 *
 * - Without `keepAliveEquivalence`, the Layer handler takes a single
 *   `dependencies` argument.
 * - With `keepAliveEquivalence`, the Layer handler also receives a
 *   `readDependencies` thunk for accessing the latest value while the Stream
 *   stays running across Model changes the equivalence accepts as equal.
 * - Named entries declare the Messages their handler Stream can emit. An
 *   empty `messages` collection describes a silent scoped Stream.
 * - Inline entries may declare `messages` too. The Stream remains inline, and
 *   the declaration lets `Scene.Subscription.emit` validate and drive those
 *   Messages. An inline entry without `messages` remains valid at runtime but
 *   declares no Messages to Scene.
 * - With a handler name and Message declarations but no field map, the entry
 *   has no local Model dependencies. Its Stream stays active across Model
 *   updates unless a parent gates it.
 */
export interface EntryBuilder<Model, Message, Services> {
  <const Name extends string, const Messages extends ReadonlyArray<Schema.Top>>(
    name: Name,
    config: Readonly<{ messages: Messages }>,
  ): LayeredEntryWithoutKeepAlive<
    Name,
    Model,
    EmittedMessage<Messages>,
    Record<string, never>,
    Messages
  >

  <
    const Name extends string,
    const Fields extends Schema.Struct.Fields,
    const Callbacks extends
      | LayeredEntryCallbacksWithoutKeepAlive<Model, Schema.Struct.Type<Fields>>
      | LayeredEntryCallbacksWithKeepAlive<Model, Schema.Struct.Type<Fields>>,
  >(
    name: Name,
    fields: Fields,
    callbacks: Callbacks,
  ): Callbacks extends {
    readonly keepAliveEquivalence: Equivalence.Equivalence<any>
  }
    ? LayeredEntryWithKeepAlive<
        Name,
        Model,
        EmittedMessage<DeclaredMessages<Callbacks>>,
        Schema.Struct.Type<Fields>,
        DeclaredMessages<Callbacks>
      >
    : LayeredEntryWithoutKeepAlive<
        Name,
        Model,
        EmittedMessage<DeclaredMessages<Callbacks>>,
        Schema.Struct.Type<Fields>,
        DeclaredMessages<Callbacks>
      >

  <
    const Fields extends Schema.Struct.Fields,
    const Messages extends ReadonlyArray<Schema.Top>,
  >(
    fields: Fields,
    callbacks: DeclaredEntryCallbacksWithKeepAlive<
      Model,
      Schema.Struct.Type<Fields>,
      Services,
      Messages
    >,
  ): EntryWithKeepAlive<
    Model,
    EmittedMessage<Messages>,
    Schema.Struct.Type<Fields>,
    Services
  > &
    Readonly<{ messages: Messages }>

  <
    const Fields extends Schema.Struct.Fields,
    const Messages extends ReadonlyArray<Schema.Top>,
  >(
    fields: Fields,
    callbacks: DeclaredEntryCallbacksWithoutKeepAlive<
      Model,
      Schema.Struct.Type<Fields>,
      Services,
      Messages
    >,
  ): EntryWithoutKeepAlive<
    Model,
    EmittedMessage<Messages>,
    Schema.Struct.Type<Fields>,
    Services
  > &
    Readonly<{ messages: Messages }>

  <
    const Fields extends Schema.Struct.Fields,
    Callbacks extends (
      | EntryCallbacksWithoutKeepAlive<
          Model,
          Message,
          Schema.Struct.Type<Fields>,
          Services
        >
      | EntryCallbacksWithKeepAlive<
          Model,
          Message,
          Schema.Struct.Type<Fields>,
          Services
        >
    ) &
      Readonly<{ messages?: never }>,
  >(
    fields: Fields,
    callbacks: Callbacks,
  ): Callbacks extends {
    readonly keepAliveEquivalence: Equivalence.Equivalence<any>
  }
    ? EntryWithKeepAlive<Model, Message, Schema.Struct.Type<Fields>, Services>
    : EntryWithoutKeepAlive<
        Model,
        Message,
        Schema.Struct.Type<Fields>,
        Services
      >
}

/**
 * Declares a Subscriptions record. The Model, Message, and optional Services
 * generics are provided up front; the entries record follows, built from
 * calls to the `entry` builder passed into the inner function.
 *
 * Reach for `Subscription.aggregate` to combine multiple records, and
 * `Subscription.lift` to translate a child Submodel's record into a parent
 * context.
 *
 * @example
 * ```ts
 * const subscriptions = Subscription.make<Model, Message>()(entry => ({
 *   tick: entry(
 *     'CounterTicks',
 *     { isRunning: Schema.Boolean },
 *     {
 *       messages: [Message.Ticked],
 *       modelToDependencies: model => ({ isRunning: model.isRunning }),
 *     },
 *   ),
 * }))
 *
 * const CounterTicksLayer = subscriptions.tick.toLayer(({ isRunning }) =>
 *   isRunning
 *     ? Stream.tick(Duration.seconds(1)).pipe(
 *         Stream.drop(1),
 *         Stream.map(Message.Ticked),
 *       )
 *     : Stream.empty,
 * )
 * ```
 */
export const make =
  <Model, Message, Services = never>() =>
  <
    Entries extends Readonly<
      Record<string, Entry<Model, Message, any, Services | Handler<string>>>
    >,
  >(
    build: (entry: EntryBuilder<Model, Message, Services>) => Entries,
  ): {
    readonly [K in keyof Entries]: Entries[K] & SubscriptionBrand
  } => {
    /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
    const entryBuilder = ((
      nameOrFields: string | Schema.Struct.Fields,
      fieldsOrCallbacks?: Schema.Struct.Fields | Record<string, unknown>,
      maybeCallbacks?: Record<string, unknown>,
    ) => {
      if (Predicate.isString(nameOrFields)) {
        const handler = makeHandler(nameOrFields)

        if (Predicate.isUndefined(maybeCallbacks)) {
          /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
          const config = fieldsOrCallbacks as Readonly<{
            messages: ReadonlyArray<Schema.Top>
          }>
          return {
            name: nameOrFields,
            messages: config.messages,
            dependenciesSchema: Schema.Struct({}),
            modelToDependencies: () => ({}),
            dependenciesToStream: handler.toStream,
            toLayer: handler.toLayer,
          }
        }

        return {
          name: nameOrFields,
          dependenciesSchema: Schema.Struct(
            /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
            fieldsOrCallbacks as Schema.Struct.Fields,
          ),
          ...maybeCallbacks,
          dependenciesToStream: handler.toStream,
          toLayer: handler.toLayer,
        }
      }

      return {
        dependenciesSchema: Schema.Struct(nameOrFields),
        ...fieldsOrCallbacks,
      }
    }) as unknown as EntryBuilder<Model, Message, Services>
    /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
    return build(entryBuilder) as any
  }

type AnySubscriptions = Readonly<
  Record<string, Subscription<any, any, any, any>>
>

// NOTE: requiring one record keeps `aggregate()` unambiguously curried.
type AnySubscriptionsList = readonly [
  AnySubscriptions,
  ...ReadonlyArray<AnySubscriptions>,
]

type EntriesOfRecord<SubscriptionsRecord> = SubscriptionsRecord extends unknown
  ? SubscriptionsRecord[keyof SubscriptionsRecord]
  : never

type EntriesOf<Records extends AnySubscriptionsList> = EntriesOfRecord<
  Records[number]
>

// NOTE: Model-independent entries use `unknown` because they belong to every Model
// universe, so they must not collapse the inferred reference Model.
type ModelOfEntry<AnyEntry> = [AnyEntry] extends [
  Subscription<infer Model, any, any, any>,
]
  ? unknown extends Model
    ? never
    : Model
  : never

type MessageOfEntry<AnyEntry> =
  AnyEntry extends Subscription<any, infer Message, any, any> ? Message : never

type ServicesOfEntry<AnyEntry> =
  AnyEntry extends Subscription<any, any, any, infer Services>
    ? Services
    : never

type MessageOf<Records extends AnySubscriptionsList> = MessageOfEntry<
  EntriesOf<Records>
>

type ServicesOf<Records extends AnySubscriptionsList> = ServicesOfEntry<
  EntriesOf<Records>
>

// NOTE: anchoring compatibility to the first Model-reading record makes an
// incompatible later record produce the error at its own argument position.
type ReferenceModel<Records extends ReadonlyArray<AnySubscriptions>> =
  Records extends readonly [
    infer Head extends AnySubscriptions,
    ...infer Rest extends ReadonlyArray<AnySubscriptions>,
  ]
    ? [ModelOfEntry<EntriesOfRecord<Head>>] extends [never]
      ? ReferenceModel<Rest>
      : ModelOfEntry<EntriesOfRecord<Head>>
    : never

type CompatibleSubscriptions<Records extends AnySubscriptionsList> = {
  readonly [Index in keyof Records]: Records[Index] &
    Subscriptions<
      ReferenceModel<Records>,
      MessageOf<Records>,
      ServicesOf<Records>
    >
}

type RuntimeKey<Key> = Key extends string
  ? Key
  : Key extends number
    ? `${Key}`
    : never

type RuntimeEntries<RecordType> = {
  readonly [Key in keyof RecordType as RuntimeKey<Key>]: RecordType[Key]
}

type MergeSubscriptions<Records extends ReadonlyArray<unknown>> =
  Records extends readonly [infer Head, ...infer Rest]
    ? RuntimeEntries<Head> &
        (Rest extends ReadonlyArray<unknown> ? MergeSubscriptions<Rest> : {})
    : {}

const mergeSubscriptions = (
  records: ReadonlyArray<AnySubscriptions>,
): Record<string, Subscription<any, any, any, any>> => {
  const result: Record<string, Subscription<any, any, any, any>> = {}
  for (const record of records) {
    for (const key of Object.keys(record)) {
      if (Object.hasOwn(result, key)) {
        throw new Error(
          `Subscription.aggregate: duplicate key "${key}" across records`,
        )
      }
      Object.defineProperty(result, key, {
        configurable: true,
        enumerable: true,
        value: record[key],
        writable: true,
      })
    }
  }
  return result
}

/**
 * Combines multiple Subscriptions records into one. Throws on duplicate
 * keys so a misconfigured aggregate fails loudly at startup rather than
 * silently overriding.
 *
 * Pass the records directly and the Model, Message, and Services are read
 * off them. The Model of the first record with a Model dependency is the one
 * every later record is checked against, so a record from another Model
 * universe fails at its own argument position. Message and Services widen to
 * the union across all records, which is what lets a record that needs an
 * Effect service sit beside records that need none.
 *
 * The direct form keeps each record's keys and each entry's exact dependency
 * type, declared Messages, `toLayer` helper, schema, and
 * `keepAliveEquivalence` variant, so a lifted entry's
 * {@link GatedDependencies} survives aggregation.
 *
 * The curried form remains available for a record that has to be typed before
 * its entries exist, such as a value annotated as
 * `Subscriptions<Model, Message>` at a module boundary. It erases keys and
 * per-entry dependency types, so reach for it only when the explicit contract
 * is the point.
 *
 * @example
 * ```ts
 * const subscriptions = Subscription.aggregate(
 *   homeSubscriptions,
 *   roomSubscriptions,
 * )
 * ```
 *
 * @example Curried, when the record is typed before its entries exist:
 * ```ts
 * export const subscriptions: Subscription.Subscriptions<Model, Message> =
 *   Subscription.aggregate<Model, Message>()(...records)
 * ```
 */
export const aggregate: {
  <Model, Message, Services = never>(): (
    ...records: ReadonlyArray<Subscriptions<Model, Message, Services>>
  ) => Subscriptions<Model, Message, Services>
  <Records extends AnySubscriptionsList>(
    ...records: CompatibleSubscriptions<Records>
  ): MergeSubscriptions<Records>
  /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
} = ((...records: ReadonlyArray<AnySubscriptions>) => {
  return Array.match(records, {
    onEmpty:
      () =>
      (...curriedRecords: ReadonlyArray<AnySubscriptions>) =>
        mergeSubscriptions(curriedRecords),
    onNonEmpty: mergeSubscriptions,
  })
  /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
}) as any

/**
 * Wraps a Stream as a Subscription entry with no dependencies on its own
 * Model. Local Model changes do not restart the Stream. A parent can still
 * gate the entry when lifting it, so the Stream starts and stops with that
 * parent condition. Use for work such as system theme listeners, viewport
 * width observers, or route-independent timers.
 *
 * Returns an entry shape, not a branded Subscription. Pass it into `make`
 * as an entry value.
 */
export const persistentEntry = <Message, Services = never>(
  stream: Stream.Stream<Message, never, Services>,
): EntryWithoutKeepAlive<
  unknown,
  Message,
  Record<string, never>,
  Services
> => ({
  dependenciesSchema: Schema.Struct({}),
  modelToDependencies: () => ({}),
  dependenciesToStream: () => stream,
})

type ChildModelOf<ChildSubscriptions> =
  ChildSubscriptions[keyof ChildSubscriptions] extends Subscription<
    infer ChildModel,
    any,
    any,
    any
  >
    ? ChildModel
    : never

type ChildMessageOf<ChildSubscriptions> =
  ChildSubscriptions[keyof ChildSubscriptions] extends Subscription<
    any,
    infer ChildMessage,
    any,
    any
  >
    ? ChildMessage
    : never

/**
 * The dependencies of a lifted Subscription. `maybeDependencies` holds the
 * child's dependencies while `read` returns `Some` and its `when` gate is
 * open. Otherwise it holds `None`, which tears down the entry's Stream and
 * skips the child's `modelToDependencies`.
 */
export type GatedDependencies<Dependencies> = Readonly<{
  maybeDependencies: Option.Option<Dependencies>
}>

type WhenPredicate<ParentModel> = (parentModel: ParentModel) => boolean

/**
 * Additional parent conditions for named entries in a lift's `when` map.
 * Entries omitted from the map run whenever `read` returns a child Model.
 */
export type EntryGates<ParentModel, Subscriptions> = Readonly<
  Partial<Record<keyof Subscriptions, WhenPredicate<ParentModel>>>
>

type LiftConfig<ParentModel, ParentMessage, Subscriptions> = Readonly<{
  read: (parentModel: ParentModel) => Option.Option<ChildModelOf<Subscriptions>>
  toParentMessage: (message: ChildMessageOf<Subscriptions>) => ParentMessage
  when?: WhenPredicate<ParentModel> | EntryGates<ParentModel, Subscriptions>
}>

type LiftedSubscriptions<ParentModel, ParentMessage, Subscriptions> = {
  readonly [K in keyof Subscriptions]: Subscriptions[K] extends Subscription<
    any,
    any,
    infer Dependencies,
    infer Services
  >
    ? Subscription<
        ParentModel,
        ParentMessage,
        GatedDependencies<Dependencies>,
        Services
      > &
        (Subscriptions[K] extends { readonly messages: infer Messages }
          ? Readonly<{ messages: Messages }>
          : unknown) &
        (Subscriptions[K] extends {
          readonly name: infer Name
          readonly toLayer: infer ToLayer
        }
          ? Readonly<{ name: Name; toLayer: ToLayer }>
          : unknown)
    : never
}

type AnyWhen = WhenPredicate<any> | EntryGates<any, any>

type AnyLiftConfig = Readonly<{
  read: (parentModel: any) => Option.Option<any>
  toParentMessage: (message: any) => any
  when?: AnyWhen
}>

const toEntryWhen = (
  when: AnyWhen | undefined,
  key: string,
): WhenPredicate<any> => {
  if (when === undefined) {
    return Function.constTrue
  } else if (typeof when === 'function') {
    return when
  } else {
    return pipe(
      Record.get(when, key),
      Option.flatMap(Option.fromNullishOr),
      Option.getOrElse(() => Function.constTrue),
    )
  }
}

const toParentStream = (
  config: AnyLiftConfig,
  stream: Stream.Stream<any, never, any>,
) => Stream.map(stream, config.toParentMessage)

const SubscriptionMessageMappersTypeId = Symbol(
  'foldkit/SubscriptionMessageMappers',
)

type SubscriptionWithMessageMetadata = Readonly<{
  messages?: ReadonlyArray<Schema.Top>
  [SubscriptionMessageMappersTypeId]?: ReadonlyArray<
    (message: unknown) => unknown
  >
}>

const toLiftedEntry = (
  subscription: Subscription<any, any, any, any>,
  config: AnyLiftConfig,
  when: (parentModel: any) => boolean,
) => {
  /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
  const messageMetadata = subscription as SubscriptionWithMessageMetadata
  const dependenciesSchema = Schema.Struct({
    maybeDependencies: Schema.Option(subscription.dependenciesSchema),
  })

  const modelToDependencies = (parentModel: any) => ({
    maybeDependencies: pipe(
      parentModel,
      Option.liftPredicate(when),
      Option.flatMap(config.read),
      Option.map(subscription.modelToDependencies),
    ),
  })

  if (subscription.keepAliveEquivalence !== undefined) {
    const maybeKeepAliveEquivalence = Option.makeEquivalence(
      subscription.keepAliveEquivalence,
    )

    return {
      ...subscription,
      [SubscriptionMessageMappersTypeId]: [
        ...(messageMetadata[SubscriptionMessageMappersTypeId] ?? []),
        config.toParentMessage,
      ],
      dependenciesSchema,
      modelToDependencies,
      keepAliveEquivalence: (
        left: GatedDependencies<any>,
        right: GatedDependencies<any>,
      ) =>
        maybeKeepAliveEquivalence(
          left.maybeDependencies,
          right.maybeDependencies,
        ),
      dependenciesToStream: (
        gatedDependencies: GatedDependencies<any>,
        readGatedDependencies: () => GatedDependencies<any>,
      ) =>
        Option.match(gatedDependencies.maybeDependencies, {
          onNone: () => Stream.empty,
          onSome: dependencies =>
            toParentStream(
              config,
              subscription.dependenciesToStream(dependencies, () =>
                Option.getOrElse(
                  readGatedDependencies().maybeDependencies,
                  () => dependencies,
                ),
              ),
            ),
        }),
    }
  }

  return {
    ...subscription,
    [SubscriptionMessageMappersTypeId]: [
      ...(messageMetadata[SubscriptionMessageMappersTypeId] ?? []),
      config.toParentMessage,
    ],
    dependenciesSchema,
    modelToDependencies,
    dependenciesToStream: (gatedDependencies: GatedDependencies<any>) =>
      Option.match(gatedDependencies.maybeDependencies, {
        onNone: () => Stream.empty,
        onSome: dependencies =>
          toParentStream(
            config,
            subscription.dependenciesToStream(dependencies),
          ),
      }),
  }
}

/**
 * Lifts child Subscriptions into a parent's Model and Message context.
 * `read` returns `Some(childModel)` while the child exists and `None` while
 * it is absent, matching `Update.foldChild` and `ManagedResource.lift`.
 * An absent child tears down every entry's Stream without reading the
 * child's dependencies. Use `Option.some` for a child that is always present.
 *
 * The optional `when` adds conditions from the parent Model. One predicate
 * gates every entry; an {@link EntryGates} map adds a gate only to its named
 * entries. An entry runs only while its gate is open and `read` returns
 * `Some`. A closed gate skips `read` as well as the child's dependency
 * projection. Entries omitted from a gate map still stop when the child
 * is absent.
 *
 * Every lifted entry wraps its dependencies in {@link GatedDependencies}.
 * The child's dependency Schema, declared Messages, handler Layer helper,
 * service requirements, and
 * `keepAliveEquivalence` are preserved inside that wrapper. A running child
 * Stream's `readDependencies` receives current child dependencies while
 * active, with its starting dependencies as a fallback during teardown.
 *
 * @example
 * ```ts
 * const homeSubscriptions = Subscription.lift(Home.subscriptions)<
 *   Model,
 *   Message
 * >({
 *   read: model => model.maybeHome,
 *   toParentMessage: message => Message.GotHomeMessage({ message }),
 * })
 *
 * const roomSubscriptions = Subscription.lift(Room.subscriptions)<
 *   Model,
 *   Message
 * >({
 *   read: model => Option.some(model.room),
 *   toParentMessage: message => Message.GotRoomMessage({ message }),
 *   when: { roomKeyboard: ({ route }) => route._tag === 'Room' },
 * })
 * ```
 */
export const lift =
  <
    Subscriptions extends Readonly<
      Record<string, Subscription<any, any, any, any>>
    >,
  >(
    subscriptions: Subscriptions,
  ) =>
  <ParentModel, ParentMessage>(
    config: LiftConfig<ParentModel, ParentMessage, Subscriptions>,
  ): LiftedSubscriptions<ParentModel, ParentMessage, Subscriptions> =>
    /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
    Record.map(subscriptions, (subscription, key) =>
      toLiftedEntry(subscription, config, toEntryWhen(config.when, key)),
    ) as any

/** @internal A declared Subscription Message and the lift chain production
 * applies before dispatching it to the root update. */
export type MessageDeclaration = Readonly<{
  entry: Subscription<any, any, any, any>
  entryKey: string
  schemas: ReadonlyArray<Schema.Top>
  messageMappers: ReadonlyArray<(message: unknown) => unknown>
}>

/** @internal Reads Message declarations retained by `make`, `lift`, and
 * `aggregate` for Scene's Subscription boundary. */
export const __messageDeclarations = (
  subscriptions: Readonly<Record<string, Subscription<any, any, any, any>>>,
): ReadonlyArray<MessageDeclaration> => {
  const declarations: Array<MessageDeclaration> = []

  for (const [entryKey, subscription] of Object.entries(subscriptions)) {
    /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
    const metadata = subscription as SubscriptionWithMessageMetadata

    if (metadata.messages !== undefined) {
      declarations.push({
        entry: subscription,
        entryKey,
        schemas: metadata.messages,
        messageMappers: metadata[SubscriptionMessageMappersTypeId] ?? [],
      })
    }
  }

  return declarations
}
