const postQuery = Query.define({
  name: 'Post',
  data: Post,
  error: Schema.String,
  args: { postId: Schema.String },
  staleTime: '1 minute',
  maxSettledEntries: 100,
  notifyOnCompletion: true,
  handler: function* () {
    return ({ postId }) => fetchPost(postId)
  },
})
