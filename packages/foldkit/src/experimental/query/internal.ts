import { Effect, Option, Predicate, Schema, pipe } from 'effect'

import * as AsyncData from '../../asyncData/index.js'
import * as Command from '../../command/index.js'
import * as Update from '../../update/index.js'

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

export type ParentFieldOf<ParentModel, ChildModel> = Extract<
  {
    [K in keyof ParentModel]-?: ParentModel[K] extends ChildModel ? K : never
  }[keyof ParentModel],
  string
>

export type ParentFieldConfig<
  ParentModel,
  ParentMessage,
  ChildModel,
  ChildMessage,
> = Readonly<{
  parentField: ParentFieldOf<ParentModel, ChildModel>
  toParentMessage: (message: ChildMessage) => ParentMessage
}>

export type LiftConfig<ParentModel, ParentMessage, ChildModel, ChildMessage> =
  | ParentFieldConfig<ParentModel, ParentMessage, ChildModel, ChildMessage>
  | FoldLens<ParentModel, ParentMessage, ChildModel, ChildMessage>

export type LiftQuery<ChildModel, ChildMessage, R> = {
  <ParentModel, ParentMessage>(
    config: ParentFieldConfig<
      ParentModel,
      ParentMessage,
      ChildModel,
      ChildMessage
    >,
  ): LiftedQuery<ParentModel, ParentMessage, ChildMessage, R>
  <ParentModel, ParentMessage>(
    config: FoldLens<ParentModel, ParentMessage, ChildModel, ChildMessage>,
  ): LiftedQuery<ParentModel, ParentMessage, ChildMessage, R>
}

export type LiftKeyedQuery<ChildModel, ChildMessage, Args, R> = {
  <ParentModel, ParentMessage>(
    config: ParentFieldConfig<
      ParentModel,
      ParentMessage,
      ChildModel,
      ChildMessage
    >,
  ): LiftedKeyedQuery<ParentModel, ParentMessage, ChildMessage, Args, R>
  <ParentModel, ParentMessage>(
    config: FoldLens<ParentModel, ParentMessage, ChildModel, ChildMessage>,
  ): LiftedKeyedQuery<ParentModel, ParentMessage, ChildMessage, Args, R>
}

export const isParentFieldConfig = <
  ParentModel,
  ParentMessage,
  ChildModel,
  ChildMessage,
>(
  config: LiftConfig<ParentModel, ParentMessage, ChildModel, ChildMessage>,
): config is Extract<
  LiftConfig<ParentModel, ParentMessage, ChildModel, ChildMessage>,
  { readonly parentField: string }
> => Predicate.hasProperty(config, 'parentField')

const setField = <
  Field extends string,
  Value,
  Struct extends Record<Field, Value>,
>(
  model: Struct,
  field: Field,
  value: Value,
): Struct => ({ ...model, [field]: value })

export const parentFieldToLens = <
  ParentModel extends Record<
    ParentFieldOf<ParentModel, ChildModel>,
    ChildModel
  >,
  ParentMessage,
  ChildModel,
  ChildMessage,
>(
  config: ParentFieldConfig<
    ParentModel,
    ParentMessage,
    ChildModel,
    ChildMessage
  >,
): FoldLens<ParentModel, ParentMessage, ChildModel, ChildMessage> => ({
  read: (model: ParentModel) => Option.some(model[config.parentField]),
  write: (model: ParentModel, nextChild: ChildModel) =>
    setField(model, config.parentField, nextChild),
  toParentMessage: config.toParentMessage,
})

export const liftChildFold = <
  ParentModel,
  ParentMessage,
  ChildModel,
  ChildMessage,
  Input,
  R,
>(
  childFold: Update.Fold<ChildModel, ChildMessage, Input, R>,
  lens: FoldLens<ParentModel, ParentMessage, ChildModel, ChildMessage>,
): Update.Fold<ParentModel, ParentMessage, Input, R> =>
  Update.foldChild({
    update: (childModel: ChildModel, input: Input) =>
      childFold(childModel, input),
    ...lens,
  })

export type AsyncDataTransition = <A, E>(
  data: AsyncData.AsyncData<A, E>,
) => Option.Option<AsyncData.AsyncData<A, E>>

export type QueryStore<Model, Args, A, E, Message, R> = Readonly<{
  read: (model: Model, args: Args) => AsyncData.AsyncData<A, E>
  start: (
    model: Model,
    args: Args,
    data: AsyncData.AsyncData<A, E>,
  ) => Readonly<{ model: Model; generation: number }>
  fetch: (args: Args, generation: number) => Command.Command<Message, never, R>
}>

export const applyTransition = <Model, Args, A, E, Message, R>(
  store: QueryStore<Model, Args, A, E, Message, R>,
  model: Model,
  args: Args,
  transition: AsyncDataTransition,
): Update.Return<Model, Message, R> =>
  Option.match(transition(store.read(model, args)), {
    onNone: () => ({ model }),
    onSome: nextData => {
      const queryStart = store.start(model, args, nextData)

      return {
        model: queryStart.model,
        commands: [store.fetch(args, queryStart.generation)],
      }
    },
  })

export const runExecute = <A, E, R>(
  execute: Effect.Effect<A, E, R>,
): Effect.Effect<AsyncData.AsyncData<A, E>, never, R> =>
  pipe(
    execute,
    Effect.result,
    Effect.map(result => AsyncData.settle(AsyncData.Loading(), result)),
  )

export type CompletedFetchOf<Message extends Schema.Top> = Extract<
  Message['Type'],
  { readonly _tag: 'CompletedFetch' }
>

export type KeyedArgs<Fields extends Schema.Struct.Fields> = Schema.Schema.Type<
  Schema.Struct<Fields>
>

type LiftedQuery<ParentModel, ParentMessage, ChildMessage, R> = Readonly<{
  fold: Update.Fold<ParentModel, ParentMessage, ChildMessage>
  reset: Update.Step<ParentModel, ParentMessage>
  revalidate: Update.Step<ParentModel, ParentMessage, R>
  revalidateOrLoad: Update.Step<ParentModel, ParentMessage, R>
  loadIfMissing: Update.Step<ParentModel, ParentMessage, R>
}>

type LiftedKeyedQuery<ParentModel, ParentMessage, ChildMessage, Args, R> =
  Readonly<{
    fold: Update.Fold<ParentModel, ParentMessage, ChildMessage>
    reset: Update.Step<ParentModel, ParentMessage>
    revalidate: Update.Fold<ParentModel, ParentMessage, Args, R>
    revalidateOrLoad: Update.Fold<ParentModel, ParentMessage, Args, R>
    loadIfMissing: Update.Fold<ParentModel, ParentMessage, Args, R>
  }>
