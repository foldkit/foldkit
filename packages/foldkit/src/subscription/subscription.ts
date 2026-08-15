import { type Equivalence, Option, Record, Schema, Stream, pipe } from 'effect'

type SubscriptionBrand = {
  readonly __subscription: never
}

type DependenciesSchema<Dependencies> = Schema.Schema<Dependencies> & {
  readonly fields: Schema.Struct.Fields
}

/**
 * The entry shape produced by helpers like `Subscription.persistent` and
 * `Port.subscription` before branding. Pass values of this shape into
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

/**
 * A single subscription entry produced by `Subscription.make`,
 * `Subscription.lift`, or `Subscription.aggregate`. The brand field is
 * `never`, so application code cannot manually construct a `Subscription`
 * value: it must go through one of those constructors (or a helper like
 * `Subscription.persistent` that returns an entry shape, then through
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

/**
 * Builds a single subscription entry from a field map and callbacks.
 *
 * The field map is the same shape you would pass to `S.Struct`. Reading the
 * schema as a positional argument (rather than a property on the entry
 * literal) lets TypeScript fully resolve the `Dependencies` type before
 * contextually typing `modelToDependencies` and `dependenciesToStream`, so
 * destructuring patterns like `({ maybeMapHostId })` are inferred correctly
 * even when the field schemas use transforms (e.g. `S.Option`).
 *
 * Two overloads, one per `keepAliveEquivalence` presence:
 *
 * - Without `keepAliveEquivalence`, `dependenciesToStream` takes a single
 *   `dependencies` argument.
 * - With `keepAliveEquivalence`, `dependenciesToStream` also receives a
 *   `readDependencies` thunk for accessing the latest value while the Stream
 *   stays running across Model changes the equivalence accepts as equal.
 */
export type EntryBuilder<Model, Message, Services> = <
  const Fields extends Schema.Struct.Fields,
  Callbacks extends
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
      >,
>(
  fields: Fields,
  callbacks: Callbacks,
) => Callbacks extends {
  readonly keepAliveEquivalence: Equivalence.Equivalence<any>
}
  ? EntryWithKeepAlive<Model, Message, Schema.Struct.Type<Fields>, Services>
  : EntryWithoutKeepAlive<Model, Message, Schema.Struct.Type<Fields>, Services>

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
 * Subscription.make<Model, Message>()(entry => ({
 *   tick: entry(
 *     { isRunning: S.Boolean },
 *     {
 *       modelToDependencies: model => ({ isRunning: model.isRunning }),
 *       dependenciesToStream: ({ isRunning }) =>
 *         Stream.when(..., Effect.sync(() => isRunning)),
 *     },
 *   ),
 * }))
 * ```
 */
export const make =
  <Model, Message, Services = never>() =>
  <
    Entries extends Readonly<
      Record<string, Entry<Model, Message, any, Services>>
    >,
  >(
    build: (entry: EntryBuilder<Model, Message, Services>) => Entries,
  ): {
    readonly [K in keyof Entries]: Entries[K] & SubscriptionBrand
  } => {
    /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
    const entryBuilder = ((
      fields: Schema.Struct.Fields,
      callbacks: Record<string, unknown>,
    ) => ({
      dependenciesSchema: Schema.Struct(fields),
      ...callbacks,
    })) as unknown as EntryBuilder<Model, Message, Services>
    /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
    return build(entryBuilder) as any
  }

/**
 * Combines multiple Subscriptions records into one. Throws on duplicate
 * keys so a misconfigured aggregate fails loudly at startup rather than
 * silently overriding.
 */
export const aggregate =
  <Model, Message, Services = never>() =>
  (
    ...records: ReadonlyArray<Subscriptions<Model, Message, Services>>
  ): Subscriptions<Model, Message, Services> => {
    const result: Record<
      string,
      Subscription<Model, Message, any, Services>
    > = {}
    for (const record of records) {
      for (const key of Object.keys(record)) {
        if (Object.hasOwn(result, key)) {
          throw new Error(
            `Subscription.aggregate: duplicate key "${key}" across records`,
          )
        }
        result[key] = record[key]!
      }
    }
    return result
  }

/**
 * Wraps a Stream as a Subscription entry whose lifecycle is independent of
 * the Model. The Stream runs for the lifetime of the Subscriptions record;
 * no Model change tears it down or restarts it. Use for any Stream whose
 * work doesn't depend on Model state, such as system theme listeners,
 * viewport width observers, or route-independent timers.
 *
 * Returns an entry shape, not a branded Subscription. Pass it into `make`
 * as an entry value.
 */
export const persistent = <Message, Services = never>(
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
 * The dependencies of a Subscription lifted through a parent's `when` gate:
 * the child entry's own dependencies under `maybeDependencies`, and `None`
 * for as long as the parent holds the gate closed.
 *
 * A closed gate is a real teardown rather than a paused Stream. The entry's
 * Stream is torn down, and the child's `modelToDependencies` does not run
 * again until the parent reopens the gate, so child state that changes behind
 * a closed gate causes no restarts.
 */
export type GatedDependencies<Dependencies> = Readonly<{
  maybeDependencies: Option.Option<Dependencies>
}>

type WhenPredicate<ParentModel> = (parentModel: ParentModel) => boolean

/**
 * The per-entry form of a lift's `when`: a partial map from entry name to
 * gate. Entries the map names are gated, and entries it omits are lifted
 * ungated.
 */
export type EntryGates<ParentModel, Subscriptions> = Readonly<
  Partial<Record<keyof Subscriptions, WhenPredicate<ParentModel>>>
>

type LiftConfig<ParentModel, ParentMessage, Subscriptions> = Readonly<{
  toChildModel: (parentModel: ParentModel) => ChildModelOf<Subscriptions>
  toParentMessage: (message: ChildMessageOf<Subscriptions>) => ParentMessage
}>

type GatedLiftConfig<ParentModel, ParentMessage, Subscriptions> = LiftConfig<
  ParentModel,
  ParentMessage,
  Subscriptions
> &
  Readonly<{
    when: WhenPredicate<ParentModel>
  }>

type PerEntryGatedLiftConfig<ParentModel, ParentMessage, Subscriptions, Gates> =
  LiftConfig<ParentModel, ParentMessage, Subscriptions> &
    Readonly<{
      when: Gates
    }>

type LiftedSubscriptions<ParentModel, ParentMessage, Subscriptions> = {
  readonly [K in keyof Subscriptions]: Subscriptions[K] extends Subscription<
    any,
    any,
    infer Dependencies,
    infer Services
  >
    ? Subscription<ParentModel, ParentMessage, Dependencies, Services>
    : never
}

type GatedLiftedSubscriptions<ParentModel, ParentMessage, Subscriptions> = {
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
      >
    : never
}

/**
 * The lifted record for a per-entry `when`. An entry the gate map names
 * carries {@link GatedDependencies}; an entry it omits keeps the child's own
 * dependencies. When the gate map's own type is not precise enough to say
 * which is which, because the call passed explicit `ParentModel` and
 * `ParentMessage` type arguments and so suppressed inference on it, the entry
 * carries both possibilities.
 */
type PerEntryGatedLiftedSubscriptions<
  ParentModel,
  ParentMessage,
  Subscriptions,
  Gates,
> = {
  readonly [K in keyof Subscriptions]: Subscriptions[K] extends Subscription<
    any,
    any,
    infer Dependencies,
    infer Services
  >
    ? K extends keyof Gates
      ? undefined extends Gates[K]
        ? Subscription<
            ParentModel,
            ParentMessage,
            Dependencies | GatedDependencies<Dependencies>,
            Services
          >
        : Subscription<
            ParentModel,
            ParentMessage,
            GatedDependencies<Dependencies>,
            Services
          >
      : Subscription<ParentModel, ParentMessage, Dependencies, Services>
    : never
}

type AnyWhen = WhenPredicate<any> | EntryGates<any, any>

type AnyLiftConfig = Readonly<{
  toChildModel: (parentModel: any) => any
  toParentMessage: (message: any) => any
  when?: AnyWhen
}>

const toEntryWhen = (
  when: AnyWhen | undefined,
  key: string,
): Option.Option<WhenPredicate<any>> => {
  if (when === undefined) {
    return Option.none()
  } else if (typeof when === 'function') {
    return Option.some(when)
  } else {
    return pipe(Record.get(when, key), Option.flatMap(Option.fromNullishOr))
  }
}

const toParentStream = (
  config: AnyLiftConfig,
  stream: Stream.Stream<any, never, any>,
) => Stream.map(stream, config.toParentMessage)

const toLiftedEntry = (
  subscription: Subscription<any, any, any, any>,
  config: AnyLiftConfig,
) => {
  const modelToDependencies = (parentModel: any) =>
    subscription.modelToDependencies(config.toChildModel(parentModel))

  if (subscription.keepAliveEquivalence !== undefined) {
    return {
      dependenciesSchema: subscription.dependenciesSchema,
      modelToDependencies,
      keepAliveEquivalence: subscription.keepAliveEquivalence,
      dependenciesToStream: (dependencies: any, readDependencies: () => any) =>
        toParentStream(
          config,
          subscription.dependenciesToStream(dependencies, readDependencies),
        ),
    }
  }

  return {
    dependenciesSchema: subscription.dependenciesSchema,
    modelToDependencies,
    dependenciesToStream: (dependencies: any) =>
      toParentStream(config, subscription.dependenciesToStream(dependencies)),
  }
}

const toGatedEntry = (
  subscription: Subscription<any, any, any, any>,
  config: AnyLiftConfig,
  when: (parentModel: any) => boolean,
) => {
  const dependenciesSchema = Schema.Struct({
    maybeDependencies: Schema.Option(subscription.dependenciesSchema),
  })

  const modelToDependencies = (parentModel: any) => ({
    maybeDependencies: pipe(
      parentModel,
      Option.liftPredicate(when),
      Option.map(config.toChildModel),
      Option.map(subscription.modelToDependencies),
    ),
  })

  if (subscription.keepAliveEquivalence !== undefined) {
    const maybeKeepAliveEquivalence = Option.makeEquivalence(
      subscription.keepAliveEquivalence,
    )

    return {
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
 * Lifts a record of child Subscriptions into a parent's Model and Message
 * context, applying a Model accessor and a Message wrapper uniformly to
 * every entry. Per-entry dependency types, schemas, and `keepAliveEquivalence`
 * settings are preserved; each lifted entry's variant (with or without
 * `readDependencies`) matches its source entry's.
 *
 * The optional `when` is the parent's own gate. The parent writes it here on
 * its `lift` call and answers it from the parent Model, which is what makes
 * it useful: it carries the half of a condition the child cannot see, such as
 * the route a page Submodel sits behind. The child neither declares nor sees
 * the gate, and keeps holding its own half in `modelToDependencies`. A gated
 * entry runs only while its gate returns `true`, and a closed gate tears it
 * down.
 *
 * `when` takes either shape:
 *
 * - One predicate gates every entry in the record, for the common case where
 *   the whole child answers to one parent condition.
 * - An {@link EntryGates} map gates entries by name, for a child whose
 *   Subscriptions answer to different parent conditions. Entries the map
 *   omits are lifted ungated. A child never has to organize its records
 *   around its parent's gating.
 *
 * Gating rewrites a gated entry's dependencies to {@link GatedDependencies},
 * so its `readDependencies` returns the last dependencies seen through an
 * open gate. Ungated entries keep the child's dependencies untouched. Passing
 * `ParentModel` and `ParentMessage` explicitly suppresses inference on the
 * gate map, which leaves each named entry's dependencies as either shape; let
 * both infer from an annotated `toChildModel` when you want the exact per
 * entry types.
 *
 * @example
 * ```ts
 * const homeSubscriptions = Subscription.lift(Home.subscriptions)<
 *   Model,
 *   Message
 * >({
 *   toChildModel: model => model.home,
 *   toParentMessage: message => GotHomeMessage({ message }),
 *   when: ({ route }) => route._tag === 'Home',
 * })
 *
 * const roomSubscriptions = Subscription.lift(Room.subscriptions)({
 *   toChildModel: (model: Model) => model.room,
 *   toParentMessage: (message: Room.Message.Message): Message =>
 *     GotRoomMessage({ message }),
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
  ): {
    <ParentModel, ParentMessage>(
      config: GatedLiftConfig<ParentModel, ParentMessage, Subscriptions>,
    ): GatedLiftedSubscriptions<ParentModel, ParentMessage, Subscriptions>
    <
      ParentModel,
      ParentMessage,
      Gates extends EntryGates<ParentModel, Subscriptions> = EntryGates<
        ParentModel,
        Subscriptions
      >,
    >(
      config: PerEntryGatedLiftConfig<
        ParentModel,
        ParentMessage,
        Subscriptions,
        Gates
      >,
    ): PerEntryGatedLiftedSubscriptions<
      ParentModel,
      ParentMessage,
      Subscriptions,
      Gates
    >
    <ParentModel, ParentMessage>(
      config: LiftConfig<ParentModel, ParentMessage, Subscriptions>,
    ): LiftedSubscriptions<ParentModel, ParentMessage, Subscriptions>
  } =>
  (config: AnyLiftConfig) =>
    /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
    Record.map(subscriptions, (subscription, key) =>
      Option.match(toEntryWhen(config.when, key), {
        onNone: () => toLiftedEntry(subscription, config),
        onSome: entryWhen => toGatedEntry(subscription, config, entryWhen),
      }),
    ) as any
