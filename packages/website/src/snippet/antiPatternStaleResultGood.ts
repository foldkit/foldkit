// ✅ Good: the result carries the generation that started the search.

import { Schema } from 'effect'
import type { Update } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { evo } from 'foldkit/struct'

const Message = defineMessageUnion({
  SucceededSearch: {
    generation: Schema.Number,
    suggestions: Schema.Array(Schema.String),
  },
})
type Message = typeof Message.Type

const update = (model: Model, message: Message) =>
  Message.match<Update.Return<Model, Message>>(message, {
    SucceededSearch: ({ generation, suggestions }) => {
      if (generation !== model.searchGeneration) {
        return { model }
      }

      return { model: evo(model, { suggestions: () => suggestions }) }
    },
  })
