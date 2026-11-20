const failedPostModel = Model.make({
  posts: postsQuery.seed(AsyncData.Success({ data: fixturePosts })),
  postDetails: postQuery.seed([
    {
      args: { postId: 'first-post' },
      data: AsyncData.Failure({ error: 'The connection dropped.' }),
    },
  ]),
})

test('retrying a failed post fetches it again', () => {
  story(
    update,
    given(failedPostModel),
    message(Message.ClickedRetryPost({ postId: 'first-post' })),
    Command.resolve(
      postQuery.Fetch,
      postQuery.Message.CompletedFetch({
        args: { postId: 'first-post' },
        // The first Fetch started from a seeded Model has generation 1.
        generation: 1,
        result: Result.succeed(firstPost),
      }),
    ),
    model(model => {
      expect(
        postQuery.read(model.postDetails, { postId: 'first-post' }),
      ).toEqual(AsyncData.Success({ data: firstPost }))
    }),
  )
})
