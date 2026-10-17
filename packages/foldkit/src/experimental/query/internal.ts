import { Option, Schema } from 'effect'

import * as AsyncData from '../../asyncData/index.js'
import * as Command from '../../command/index.js'
import * as Update from '../../update/index.js'

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

export type CompletedFetchOf<Message extends Schema.Top> = Extract<
  Message['Type'],
  { readonly _tag: 'CompletedFetch' }
>

export type KeyedArgs<Fields extends Schema.Struct.Fields> = Schema.Schema.Type<
  Schema.Struct<Fields>
>
