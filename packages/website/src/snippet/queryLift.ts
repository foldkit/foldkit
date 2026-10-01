const Message = defineMessageUnion({
  GotPostsMessage: { message: postsQuery.Message },
  ClickedRefreshPosts: {},
})

const posts = postsQuery.lift<Model, Message>({
  field: 'posts',
  toParentMessage: message => Message.GotPostsMessage({ message }),
})

Message.match<Update.Return<Model, Message>>(message, {
  GotPostsMessage: ({ message }) => posts.fold(model, message),
  ClickedRefreshPosts: () => posts.revalidateOrLoad(model),
})
