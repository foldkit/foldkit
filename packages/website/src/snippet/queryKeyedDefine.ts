const postQuery = Query.define({
  name: 'Post',
  data: Post,
  error: Schema.String,
  args: { postId: Schema.String },
  handler: function* () {
    return ({ postId }) => fetchPost(postId)
  },
})
