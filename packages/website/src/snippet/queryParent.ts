import { Effect, Layer, Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

import { PostsQuery } from './queryDefine'

const Model = Schema.Struct({
  posts: PostsQuery,
})
type Model = typeof Model.Type

const Message = defineMessageUnion({
  ClickedRefreshPosts: {},
})
type Message = typeof Message.Type

export class Application extends Block<Application>()('Application', {
  Model,
  Message,
}) {}

export const ApplicationLive = Application.make(
  Effect.fn(function* () {
    // The Query starts loading when its instance enters the Model.
    const posts = yield* new PostsQuery('posts', { isLoadingOnStart: true })

    return {
      model: { posts },
      update: {
        // The Query loads or refreshes depending on its current AsyncData.
        ClickedRefreshPosts: model => ({
          model,
          messages: [
            model.posts.send(PostsQuery.Message.RequestedRevalidationOrLoad()),
          ],
        }),
      },
    }
  }),
).pipe(Layer.provide(PostsQuery.Live))
