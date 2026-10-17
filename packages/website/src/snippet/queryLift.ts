import { defineApplication } from 'foldkit'

const Model = Schema.Struct({
  posts: postsQuery.Model,
})
type Model = typeof Model.Type

const Message = defineMessageUnion({
  GotPostsMessage: { message: postsQuery.Message },
  ClickedRefreshPosts: {},
})
type Message = typeof Message.Type

const Application = defineApplication({ Model, Message })

const PostsBinding = Application.bindChild(postsQuery, {
  field: 'posts',
  parentMessage: Message.GotPostsMessage,
})

const ApplicationComposition = Application.makeComposition({
  childBindings: [PostsBinding],
})

const init = ApplicationComposition.makeInit(() => ({
  model: {},
  // Start loading after the Query Model is stored in its parent.
  steps: [PostsBinding.loadIfMissing()],
}))

const update = ApplicationComposition.makeUpdate((model, message) =>
  Message.match(message, {
    // Return the transition and Command for either missing or retained data.
    ClickedRefreshPosts: () => PostsBinding.revalidateOrLoad()(model),
  }),
)
