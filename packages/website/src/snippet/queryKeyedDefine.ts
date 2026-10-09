const postQuery = Query.define({
  name: 'Post',
  data: Post,
  error: Schema.String,
  args: { postId: Schema.String },
})

const FetchPostLive = postQuery.toLayer(({ postId }) => fetchPost(postId))
