// ❌ Bad: the result does not identify which search produced it.

import { Schema } from 'effect'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

const Message = defineMessageUnion({
  SucceededSearch: { suggestions: Schema.Array(Schema.String) },
})
type Message = typeof Message.Type

const update = ApplicationComposition.makeUpdate({
  SucceededSearch: (model, { suggestions }) => ({
    model: modifyFields(model, { suggestions: () => suggestions }),
  }),
})
