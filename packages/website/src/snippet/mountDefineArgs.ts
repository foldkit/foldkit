import { Effect, Schema } from 'effect'
import { Mount } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

const Message = defineMessageUnion({
  CompletedScrollPanel: {},
})

const ScrollPanel = Mount.define('ScrollPanel', {
  args: { initialScroll: Schema.Number },
  messages: [Message.CompletedScrollPanel],
  handler: function* () {
    return ({ element, initialScroll }) =>
      Effect.sync(() => element.scrollTo({ top: initialScroll })).pipe(
        Effect.as(Message.CompletedScrollPanel()),
      )
  },
})
