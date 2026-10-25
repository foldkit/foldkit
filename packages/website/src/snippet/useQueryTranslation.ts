import { Effect, Option, Schema, pipe } from 'effect'
import { AsyncData, Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

const Post = Schema.Struct({ id: Schema.String, title: Schema.String })

const PostsData = AsyncData.Schema(Schema.Array(Post), Schema.String)

const Model = Schema.Struct({
  posts: PostsData.schema,
})

const Message = defineMessageUnion({
  EnteredPostsRoute: {},
  CompletedFetchPosts: {
    result: Schema.Result(Schema.Array(Post), Schema.String),
  },
})

const ApplicationDefinition = Block.makeDefinition('Application', {
  Model,
  Message,
})

const ApplicationComposition = ApplicationDefinition.makeComposition()

const FetchPosts = ApplicationDefinition.makeCommand('FetchPosts', {
  messages: [Message.CompletedFetchPosts],
  handler: function* () {
    return () =>
      pipe(
        fetchPosts,
        Effect.result,
        Effect.map(result => Message.CompletedFetchPosts({ result })),
      )
  },
})

const update = ApplicationComposition.makeUpdate({
  EnteredPostsRoute: model =>
    Option.match(AsyncData.revalidateOrLoad(model.posts), {
      onNone: () => ({ model }),
      onSome: nextPosts => ({
        model: modifyFields(model, { posts: () => nextPosts }),
        commands: [FetchPosts()],
      }),
    }),

  CompletedFetchPosts: ApplicationDefinition.makeFieldsStep.fromMessage(
    ({ result }) => ({ posts: AsyncData.settle(result) }),
  ),
})
