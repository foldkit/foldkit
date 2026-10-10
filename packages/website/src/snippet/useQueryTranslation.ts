import { Effect, Match, Option, Schema, pipe } from 'effect'
import { AsyncData, Command, Update } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

// MODEL

const Post = Schema.Struct({ id: Schema.String, title: Schema.String })

const PostsData = AsyncData.Schema(Schema.Array(Post), Schema.String)

const Model = Schema.Struct({
  posts: PostsData.schema,
})
type Model = typeof Model.Type

// MESSAGE

const Message = defineMessageUnion({
  EnteredPostsRoute: {},
  CompletedFetchPosts: {
    result: Schema.Result(Schema.Array(Post), Schema.String),
  },
})
type Message = typeof Message.Type

// COMMAND

const FetchPosts = Command.define(
  'FetchPosts',
  {
    messages: [Message.CompletedFetchPosts],
  },
  Effect.succeed(() =>
    pipe(
      fetchPosts,
      Effect.result,
      Effect.map(result => Message.CompletedFetchPosts({ result })),
    ),
  ),
)

// UPDATE

const update = Update.make((model: Model, message: Message) =>
  Match.value(message).pipe(
    Match.tagsExhaustive({
      EnteredPostsRoute: () =>
        Option.match(AsyncData.revalidateOrLoad(model.posts), {
          onNone: () => ({ model }),
          onSome: nextPosts => ({
            model: modifyFields(model, { posts: () => nextPosts }),
            commands: [FetchPosts()],
          }),
        }),

      CompletedFetchPosts: ({ result }) => ({
        model: modifyFields(model, { posts: AsyncData.settle(result) }),
      }),
    }),
  ),
)
