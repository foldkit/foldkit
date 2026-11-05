import { Clock, Effect, Layer, Schema } from 'effect'
import { Block } from 'foldkit'
import { Query } from 'foldkit/experimental'
import { defineMessageUnion } from 'foldkit/message'

import { postsQuery } from './queryDefine'

const Model = Schema.Struct({ posts: postsQuery.Model })
type Model = typeof Model.Type

const Message = defineMessageUnion({
  EnteredPostsRoute: {},
  CompletedReadCurrentTime: { nowMillis: Schema.Number },
})
type Message = typeof Message.Type

export const ApplicationKey = Symbol('Application')
export const ApplicationBlock = Block.make('Application', {
  key: ApplicationKey,
  Init: Schema.Tuple([]),
  Model,
  Message,
})

const { makeBinding, makeComposition, makeCommand, makeCommandsStep } =
  ApplicationBlock

const PostsBinding = makeBinding(postsQuery, {
  field: 'posts',
})

const ApplicationComposition = makeComposition({
  bindings: [PostsBinding],
})

const ReadCurrentTime = makeCommand('ReadCurrentTime', {
  messages: [Message.CompletedReadCurrentTime],
  handler: function* () {
    return () =>
      Effect.map(Clock.currentTimeMillis, nowMillis =>
        Message.CompletedReadCurrentTime({ nowMillis }),
      )
  },
})

const update = ApplicationComposition.makeUpdate({
  EnteredPostsRoute: makeCommandsStep(() => [ReadCurrentTime()]),
  CompletedReadCurrentTime: (model, { nowMillis }) =>
    PostsBinding.requestLoadIfStale(nowMillis)(model),
})

const init = ApplicationComposition.makeInit(() => ({ model: {} }))

export const layer = ApplicationBlock.makeLayer(
  Effect.gen(function* () {
    const posts = yield* PostsBinding

    return {
      children: [posts],
      init,
      update,
      EffectsLayer: ReadCurrentTime.layer,
    }
  }),
).pipe(Layer.provide(Query.layer))
