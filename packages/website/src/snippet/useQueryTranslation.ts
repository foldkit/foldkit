import { Effect, Option, Schema, pipe } from 'effect'
import { AsyncData, Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

const Post = Schema.Struct({ id: Schema.String, title: Schema.String })
type Post = typeof Post.Type

const PostsData = AsyncData.Schema(Schema.Array(Post), Schema.String)
type PostsData = typeof PostsData.schema.Type
const Model = Schema.Struct({
  posts: PostsData.schema,
})
type Model = typeof Model.Type

const Message = defineMessageUnion({
  EnteredPostsRoute: {},
  CompletedFetchPosts: {
    result: Schema.Result(Schema.Array(Post), Schema.String),
  },
})
type Message = typeof Message.Type

const ApplicationDefinition = Block.makeDefinition('Application', {
  Model,
  Message,
})

const { makeFieldsStep } = ApplicationDefinition

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

  CompletedFetchPosts: makeFieldsStep.fromMessage(({ result }) => ({
    posts: AsyncData.settle(result),
  })),
})
