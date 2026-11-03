import { Clock, Effect, Schema } from 'effect'
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

const ApplicationKey = Symbol('Application')

const ApplicationDefinition = Block.makeDefinition('Application', {
  key: ApplicationKey,
  Init: Schema.Tuple([]),
  Model,
  Message,
})

const PostsBinding = ApplicationDefinition.makeBinding(postsQuery, {
  field: 'posts',
})

const ApplicationComposition = ApplicationDefinition.makeComposition({
  bindings: [PostsBinding],
})

const ReadCurrentTime = ApplicationDefinition.makeCommand('ReadCurrentTime', {
  messages: [Message.CompletedReadCurrentTime],
  handler: function* () {
    return () =>
      Effect.map(Clock.currentTimeMillis, nowMillis =>
        Message.CompletedReadCurrentTime({ nowMillis }),
      )
  },
})

const update = ApplicationComposition.makeUpdate({
  EnteredPostsRoute: ApplicationDefinition.makeCommandsStep(() => [
    ReadCurrentTime(),
  ]),
  CompletedReadCurrentTime: (model, { nowMillis }) =>
    PostsBinding.requestLoadIfStale(nowMillis)(model),
})

const init = ApplicationComposition.makeInit(() => ({ model: {} }))

export const ApplicationBlock = ApplicationDefinition.makeBlock(
  Effect.gen(function* () {
    const posts = yield* PostsBinding

    return {
      children: [posts],
      init,
      update,
      EffectsLayer: ReadCurrentTime.layer,
    }
  }),
).provide(Query.layer)
