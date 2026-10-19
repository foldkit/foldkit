import { Update } from 'foldkit'

const posts = postsQuery.lift<Model, Message>({
  parentField: 'posts',
  toParentMessage: message => Message.GotPostsMessage({ message }),
})

const init = () => {
  const model = Model.make({ posts: postsQuery.init() })

  return posts.loadIfMissing(model)
}

const update = (model: Model, message: Message) =>
  Message.match<Update.Return<Model, Message>>(message, {
    GotPostsMessage: ({ message }) => posts.fold(model, message),
    ClickedRefreshPosts: () => posts.revalidateOrLoad(model),
  })
