const postsView = (model: Model, h: HtmlBuilder<Message>): Html => {
  // Read the value through Query's public API.
  const postsAsyncData = postsQuery.read(model.posts)

  // Render it with the ordinary AsyncData helpers.
  return AsyncData.matchData(postsAsyncData, {
    onEmpty: () => h.p([], ['Loading posts…']),
    onFailure: error => h.p([], [error]),
    onData: posts =>
      h.ul(
        [],
        Array.map(posts, post => h.keyed('li')(post.id, [], [post.title])),
      ),
  })
}
