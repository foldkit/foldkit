import { Effect, Schema } from 'effect'
import * as Query from 'foldkit/experimental/query'
import { defineMessageUnion } from 'foldkit/message'

const commentsQuery = Query.define({
  name: 'Comments',
  data: Schema.Array(Schema.String),
  error: Schema.String,
  handler: function* () { return [] },
})

const Message = defineMessageUnion({
  GotCommentsMessage: { message: commentsQuery.Message },
})
