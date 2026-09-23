const postQuery = Query.define({
  name: 'Post',
  data: Post,
  error: Schema.String,
  args: { postId: Schema.String },
  execute: ({ postId }) => fetchPost(postId),
})
