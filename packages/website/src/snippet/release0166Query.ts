import { Schema } from 'effect'
import { Query } from 'foldkit/experimental'
import { defineMessageUnion } from 'foldkit/message'

const postsQuery = Query.define({
  name: 'Posts',
  data: Schema.Array(Post),
  error: Schema.String,
  execute: fetchPosts,
})

const Model = Schema.Struct({
  posts: postsQuery.Model,
})
type Model = typeof Model.Type

const Message = defineMessageUnion({
  GotPostsMessage: { message: postsQuery.Message },
  ClickedRefreshPosts: {},
})
type Message = typeof Message.Type
