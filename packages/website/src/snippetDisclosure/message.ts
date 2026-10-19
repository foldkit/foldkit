import { Schema } from 'effect'
import { defineMessageUnion } from 'foldkit/message'

import { SnippetSize } from './model'

export const Message = defineMessageUnion({
  ToggledCodeDisclosure: {
    disclosureId: Schema.String,
    isOpen: Schema.Boolean,
  },
  CompletedMeasureSnippetHeight: {
    snippetId: Schema.String,
    snippetSize: SnippetSize,
  },
})
export type Message = typeof Message.Type
