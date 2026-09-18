import { Effect, Match, Option, Predicate, Schema, pipe } from 'effect'

import * as AsyncData from '../asyncData/index.js'
import * as Command from '../command/index.js'
import * as Interruptible from '../command/interruptible/index.js'
import { defineMessageUnion } from '../message/index.js'
import { defineTaggedUnion } from '../schema/index.js'
import * as Subscription from '../subscription/subscription.js'
import * as Update from '../update/index.js'

export type Policy = 'loadIfMissing' | 'revalidate' | 'revalidateOrLoad'

export type FoldLens<ParentModel, ParentMessage, ChildModel, ChildMessage> =
  Pick<
    Update.ChildFold<
      ParentModel,
      ParentMessage,
      ChildModel,
      never,
      ChildMessage
    >,
    'read' | 'write' | 'toParentMessage'
  >

export type ParentMessage<Message extends Schema.Top> = {
  readonly message: Message
}

export type ParentMessageValue<ChildMessage> = {
  readonly message: ChildMessage
}

type GotWrapper<ChildMessage, ParentMessage> = (
  fields: ParentMessageValue<ChildMessage>,
) => ParentMessage

export type Lift<ParentModel, ParentMessage, ChildMessage, R> = {
  (
    model: ParentModel,
    fields: ParentMessageValue<ChildMessage>,
  ): Update.Return<ParentModel, ParentMessage, R>
  (
    model: ParentModel,
  ): (
    fields: ParentMessageValue<ChildMessage>,
  ) => Update.Return<ParentModel, ParentMessage, R>
}

export type FieldOf<ParentModel, ChildModel> = Extract<
  {
    [K in keyof ParentModel]-?: ParentModel[K] extends ChildModel ? K : never
  }[keyof ParentModel],
  string
>

export type ParentKeyFoldConfig<
  ParentModel,
  ParentMessage,
  ChildModel,
  ChildMessage,
> = Readonly<{
  field: FieldOf<ParentModel, ChildModel>
  parentMessage: GotWrapper<ChildMessage, ParentMessage>
}>

export type LiftConfig<ParentModel, ParentMessage, ChildModel, ChildMessage> =
  | ParentKeyFoldConfig<ParentModel, ParentMessage, ChildModel, ChildMessage>
  | FoldLens<ParentModel, ParentMessage, ChildModel, ChildMessage>

export type LiftQuery<ChildModel, ChildMessage, R> = {
  <ParentModel, ParentMessage>(
    config: ParentKeyFoldConfig<
      ParentModel,
      ParentMessage,
      ChildModel,
      ChildMessage
    >,
  ): Lifted.Query<ParentModel, ParentMessage, ChildMessage, R>
  <ParentModel, ParentMessage>(
    config: FoldLens<ParentModel, ParentMessage, ChildModel, ChildMessage>,
  ): Lifted.Query<ParentModel, ParentMessage, ChildMessage, R>
}

export type LiftKeyedQuery<ChildModel, ChildMessage, Args, R> = {
  <ParentModel, ParentMessage>(
    config: ParentKeyFoldConfig<
      ParentModel,
      ParentMessage,
      ChildModel,
      ChildMessage
    >,
  ): Lifted.KeyedQuery<ParentModel, ParentMessage, ChildMessage, Args, R>
  <ParentModel, ParentMessage>(
    config: FoldLens<ParentModel, ParentMessage, ChildModel, ChildMessage>,
  ): Lifted.KeyedQuery<ParentModel, ParentMessage, ChildMessage, Args, R>
}

export function isParentKeyFoldConfig<
  ParentModel,
  ParentMessage,
  ChildModel,
  ChildMessage,
>(
  config: LiftConfig<ParentModel, ParentMessage, ChildModel, ChildMessage>,
): config is Extract<
  LiftConfig<ParentModel, ParentMessage, ChildModel, ChildMessage>,
  { readonly field: string }
> {
  return Predicate.hasProperty(config, 'field')
}

function setField<O extends Record<K, V>, K extends string, V>(
  model: O,
  key: K,
  value: V,
): O {
  return { ...model, [key]: value }
}

export function parentKeyToLens<
  ParentModel extends Record<FieldOf<ParentModel, ChildModel>, ChildModel>,
  ParentMessage,
  ChildModel,
  ChildMessage,
>(
  config: ParentKeyFoldConfig<
    ParentModel,
    ParentMessage,
    ChildModel,
    ChildMessage
  >,
): FoldLens<ParentModel, ParentMessage, ChildModel, ChildMessage> {
  return {
    read: function (model: ParentModel) {
      return Option.some(model[config.field])
    },
    write: function (model: ParentModel, nextChild: ChildModel) {
      return setField(model, config.field, nextChild)
    },
    toParentMessage: function (childMessage: ChildMessage) {
      return config.parentMessage({ message: childMessage })
    },
  }
}

export function asLift<ParentModel, ParentMessage, ChildMessage, R>(
  fold: Update.Fold<ParentModel, ParentMessage, ChildMessage, R>,
): Lift<ParentModel, ParentMessage, ChildMessage, R> {
  function foldCall(
    model: ParentModel,
    fields: ParentMessageValue<ChildMessage>,
  ): Update.Return<ParentModel, ParentMessage, R>
  function foldCall(
    model: ParentModel,
  ): (
    fields: ParentMessageValue<ChildMessage>,
  ) => Update.Return<ParentModel, ParentMessage, R>
  function foldCall(
    model: ParentModel,
    fields?: ParentMessageValue<ChildMessage>,
  ) {
    if (fields !== undefined) return fold(model, fields.message)

    return (nextFields: ParentMessageValue<ChildMessage>) =>
      fold(model, nextFields.message)
  }

  return foldCall
}

export const foldChildFromInform = <
  ParentModel,
  ParentMessage,
  ChildModel,
  ChildMessage,
  Input,
  R,
>(
  inform: Update.Fold<ChildModel, ChildMessage, Input, R>,
  lens: FoldLens<ParentModel, ParentMessage, ChildModel, ChildMessage>,
): Update.Fold<ParentModel, ParentMessage, Input, R> =>
  Update.foldChild({
    update: (childModel: ChildModel, input: Input) => inform(childModel, input),
    ...lens,
  })

// NOTE: Nested Command.Interruptible.Outcome in defineMessageUnion collapses
// through tsup to `node_modules/foldkit/dist/schema` (and sometimes
// `outcome?: any`). Tags match Outcome.
export const FetchInterruptOutcome = defineMessageUnion({
  Interrupted: {},
  NotFound: {},
})

export const CancelIntent = defineTaggedUnion({
  Replace: {},
  Forget: {},
})
export type CancelIntent = typeof CancelIntent.Type

type Transition = <A, E>(
  data: AsyncData.AsyncData<A, E>,
) => Option.Option<AsyncData.AsyncData<A, E>>

const transitionFor = (policy: Policy): Transition =>
  Match.value(policy).pipe(
    Match.when('loadIfMissing', () => AsyncData.loadIfMissing),
    Match.when('revalidate', () => AsyncData.revalidate),
    Match.when('revalidateOrLoad', () => AsyncData.revalidateOrLoad),
    Match.exhaustive,
  )

export type CacheStore<Model, Args, A, E, Message, R> = Readonly<{
  read: (model: Model, args: Args) => AsyncData.AsyncData<A, E>
  write: (model: Model, args: Args, data: AsyncData.AsyncData<A, E>) => Model
  load: (args: Args) => Command.Command<Message, never, R>
  interrupt: (
    args: Args,
    intent: CancelIntent,
  ) => Command.Command<Message, never, R>
}>

export const applyPolicy = <Model, Args, A, E, Message, R>(
  store: CacheStore<Model, Args, A, E, Message, R>,
  model: Model,
  args: Args,
  policy: Policy,
): Update.Return<Model, Message, R> =>
  Option.match(transitionFor(policy)(store.read(model, args)), {
    onNone: () => ({ model }),
    onSome: nextData => ({
      model: store.write(model, args, nextData),
      commands: [store.load(args)],
    }),
  })

export function replaceSlot<Model, Args, A, E, Message, R>(
  store: CacheStore<Model, Args, A, E, Message, R>,
  model: Model,
  args: Args,
): Update.Return<Model, Message, R> {
  if (!AsyncData.isPending(store.read(model, args)))
    return applyPolicy(store, model, args, 'revalidateOrLoad')

  return {
    model,
    commands: [store.interrupt(args, CancelIntent.Replace())],
  }
}

export const completeCancel = <Model, Args, A, E, Message, R>(
  store: CacheStore<Model, Args, A, E, Message, R>,
  model: Model,
  args: Args,
  outcome: Interruptible.Outcome,
  intent: CancelIntent,
): Update.Return<Model, Message, R> =>
  Interruptible.Outcome.match<Update.Return<Model, Message, R>>(outcome, {
    Interrupted: () =>
      CancelIntent.match<Update.Return<Model, Message, R>>(intent, {
        Replace: () => ({ model, commands: [store.load(args)] }),
        Forget: () => ({ model }),
      }),
    NotFound: () => ({ model }),
  })

export const runExecute = <A, E, R>(
  execute: Effect.Effect<A, E, R>,
): Effect.Effect<AsyncData.AsyncData<A, E>, never, R> =>
  pipe(
    execute,
    Effect.result,
    Effect.map(result => AsyncData.settle(AsyncData.Loading(), result)),
  )

export type SettledFetchOf<Message extends Schema.Top> = Extract<
  Message['Type'],
  { readonly _tag: 'SettledFetch' }
>

export type KeyedArgs<Fields extends Schema.Struct.Fields> = Schema.Schema.Type<
  Schema.Struct<Fields>
>

export namespace Lifted {
  export type Query<
    ParentModel,
    ParentMessage,
    ChildMessage,
    R = never,
  > = Readonly<{
    fold: Lift<ParentModel, ParentMessage, ChildMessage, R>
    revalidate: Update.Step<ParentModel, ParentMessage, R>
    revalidateOrLoad: Update.Step<ParentModel, ParentMessage, R>
    loadIfMissing: Update.Step<ParentModel, ParentMessage, R>
    replace: Update.Step<ParentModel, ParentMessage, R>
    watch: Update.Step<ParentModel, ParentMessage, R>
    forget: Update.Step<ParentModel, ParentMessage, R>
    watchSubscription: (
      entry: Subscription.EntryBuilder<ParentModel, ParentMessage, R>,
      modelToIsWatching: (model: ParentModel) => boolean,
    ) => Subscription.EntryWithoutKeepAlive<
      ParentModel,
      ParentMessage,
      { readonly isWatching: boolean },
      R
    >
  }>

  export type KeyedQuery<
    ParentModel,
    ParentMessage,
    ChildMessage,
    Args,
    R = never,
  > = Readonly<{
    fold: Lift<ParentModel, ParentMessage, ChildMessage, R>
    revalidate: Update.Fold<ParentModel, ParentMessage, Args, R>
    revalidateOrLoad: Update.Fold<ParentModel, ParentMessage, Args, R>
    loadIfMissing: Update.Fold<ParentModel, ParentMessage, Args, R>
    replace: Update.Fold<ParentModel, ParentMessage, Args, R>
    watch: Update.Fold<ParentModel, ParentMessage, ReadonlyArray<Args>, R>
    forget: Update.Fold<ParentModel, ParentMessage, Args, R>
    watchSubscription: (
      entry: Subscription.EntryBuilder<ParentModel, ParentMessage, R>,
      modelToArgs: (model: ParentModel) => ReadonlyArray<Args>,
    ) => Subscription.EntryWithoutKeepAlive<
      ParentModel,
      ParentMessage,
      { readonly args: ReadonlyArray<Args> },
      R
    >
  }>
}
