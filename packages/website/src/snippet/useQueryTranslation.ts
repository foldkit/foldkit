import { Effect, Option, Schema, pipe } from 'effect'
import { HttpClient } from 'effect/http'
import { AsyncData, Block, Command } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

const Post = Schema.Struct({ id: Schema.String, title: Schema.String })
type Post = typeof Post.Type

const PostsData = AsyncData.Schema(Schema.Array(Post), Schema.String)

const Message = defineMessageUnion({
  EnteredPostsRoute: {},
  CompletedFetchPosts: {
    result: Schema.Result(Schema.Array(Post), Schema.String),
  },
})

const FetchPosts = Command.define('FetchPosts', {
  messages: [Message.CompletedFetchPosts],
})

export class Application extends Block<Application>()('Application', {
  Model: Schema.Struct({ posts: PostsData.schema }),
  Message,
  Command: [FetchPosts],
}) {}

export const ApplicationLive = Application.make(
  Effect.fn(function* () {
    const client = yield* HttpClient.HttpClient

    return {
      model: { posts: PostsData.Idle() },
      update: {
        EnteredPostsRoute: model =>
          Option.match(AsyncData.revalidateOrLoad(model.posts), {
            onNone: () => ({ model }),
            onSome: nextPosts => ({
              model: modifyFields(model, { posts: () => nextPosts }),
              commands: [FetchPosts()],
            }),
          }),
        CompletedFetchPosts: (model, { result }) => ({
          model: modifyFields(model, { posts: AsyncData.settle(result) }),
        }),
      },
      commands: {
        FetchPosts: () =>
          pipe(
            client.get('/api/posts'),
            Effect.flatMap(response => response.json),
            Effect.flatMap(Schema.decodeUnknownEffect(Schema.Array(Post))),
            Effect.mapError(() => 'Could not load posts'),
            Effect.result,
            Effect.map(result => Message.CompletedFetchPosts({ result })),
          ),
      },
    }
  }),
)
