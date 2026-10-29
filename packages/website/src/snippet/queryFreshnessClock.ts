import { Clock, Effect, Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

const Model = Schema.Struct({ posts: postsQuery.Model })
type Model = typeof Model.Type

const Message = defineMessageUnion({
  EnteredPostsRoute: {},
  CompletedReadCurrentTime: { nowMillis: Schema.Number },
})
type Message = typeof Message.Type

const ApplicationDefinition = Block.makeDefinition('Application', {
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
