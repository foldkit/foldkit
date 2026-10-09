const postQuery = Query.define({
  name: 'Post',
  data: Post,
  error: Schema.String,
  args: { postId: Schema.String },
})

const FetchPostLayer = postQuery.toLayer(({ postId }) => fetchPost(postId))
