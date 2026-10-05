import { Effect, Schema } from 'effect'
import { Query } from 'foldkit/experimental'
import { defineMessageUnion } from 'foldkit/message'

import * as Child from './child'

const postsQuery = Query.define({
  name: 'Posts',
  data: Schema.Array(Schema.String),
  error: Schema.String,
  execute: Effect.succeed([]),
})

const Message = defineMessageUnion({
  ReceivedWeather: { temperature: Schema.Number, },
  GotChildMessage: {
  id: Schema.String,
  message: Child.Message,
  },
  GotPostsMessage: { message: postsQuery.Message },
})
