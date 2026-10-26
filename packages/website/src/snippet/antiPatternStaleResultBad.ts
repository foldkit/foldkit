// ❌ Bad: the result does not identify which search produced it.

import { Schema } from 'effect'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

const Message = defineMessageUnion({
  SucceededSearch: { suggestions: Schema.Array(Schema.String) },
})

const update = ApplicationComposition.makeUpdate({
  SucceededSearch: (model, { suggestions }) => ({
    model: modifyFields(model, { suggestions: () => suggestions }),
  }),
})
