// ✅ Good: the result carries the generation that started the search.

import { Schema } from 'effect'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

const Message = defineMessageUnion({
  SucceededSearch: {
    generation: Schema.Number,
    suggestions: Schema.Array(Schema.String),
  },
})

const update = ApplicationComposition.makeUpdate({
  SucceededSearch: (model, { generation, suggestions }) => {
    if (generation !== model.searchGeneration) {
      return { model }
    }

    return { model: modifyFields(model, { suggestions: () => suggestions }) }
  },
})
