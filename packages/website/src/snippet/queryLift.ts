const Message = defineMessageUnion({
  GotPostsMessage: { message: PostsQuery.Message },
})

const postsChild = postsQuery.lift<Model, Message>({
  field: 'posts',
  toParentMessage: message => Message.GotPostsMessage({ message }),
})

Message.match<Update.Return<Model, Message>>(message, {
  GotPostsMessage: ({ message }) => postsChild.fold(model, message),
  ClickedRefresh: () => postsChild.revalidateOrLoad(model),
})
