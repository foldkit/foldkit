import { Clock, Effect, Layer, Schema } from 'effect'
import { Block, Command } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

import { PostsQuery, PostsQueryLive } from './queryDefine'

const Message = defineMessageUnion({
  EnteredPostsRoute: {},
  CompletedReadCurrentTime: { nowMillis: Schema.Number },
})

const ReadCurrentTime = Command.define('ReadCurrentTime', {
  messages: [Message.CompletedReadCurrentTime],
})

export class Application extends Block<Application>()('Application', {
  Model: Schema.Struct({ posts: PostsQuery }),
  Message,
  Command: [ReadCurrentTime],
}) {}

export const ApplicationLive = Application.toLayer(() => ({
  init: () => ({ posts: new PostsQuery('posts', {}) }),
  update: {
    EnteredPostsRoute: model => ({
      model,
      commands: [ReadCurrentTime()],
    }),
    CompletedReadCurrentTime: (model, { nowMillis }) => ({
      model,
      messages: [
        model.posts.send(
          PostsQuery.Message.RequestedLoadIfStale({ nowMillis }),
        ),
      ],
    }),
  },
  commands: {
    ReadCurrentTime: () =>
      Effect.map(Clock.currentTimeMillis, nowMillis =>
        Message.CompletedReadCurrentTime({ nowMillis }),
      ),
  },
})).pipe(Layer.provide(PostsQueryLive))
