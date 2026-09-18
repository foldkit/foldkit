const Message = defineMessageUnion({
  GotPostsMessage: postsQuery.ParentMessage,
})

const postsChild = postsQuery.lift<Model, Message>({
  field: 'posts',
  parentMessage: Message.GotPostsMessage,
})

Message.match<Update.Return<Model, Message>>(message, {
  GotPostsMessage: postsChild.fold(model),
  ClickedRefresh: () => postsChild.revalidateOrLoad(model),
})
