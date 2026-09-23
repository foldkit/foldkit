import { Schema } from 'effect'
import { defineMessageUnion } from 'foldkit/message'

import * as Child from './child'

const postsQuery = {
  Message: Child.Message,
}

const Message = defineMessageUnion({
  ReceivedWeather: { temperature: Schema.Number, },
  GotChildMessage: {
  id: Schema.String,
  message: Child.Message,
},
  GotPostsMessage: { message: postsQuery.Message },
})
