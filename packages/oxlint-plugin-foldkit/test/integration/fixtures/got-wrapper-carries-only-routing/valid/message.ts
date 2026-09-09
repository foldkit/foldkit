import { Schema } from 'effect'
import { defineMessageUnion } from 'foldkit/message'
import { Counter } from './counter'

// MESSAGE

const Message = defineMessageUnion({
  GotCounterMessage: {
  id: Schema.String,
  message: Counter.Message,
},
})
