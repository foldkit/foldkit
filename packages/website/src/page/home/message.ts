import { Schema } from 'effect'
import { defineMessageUnion } from 'foldkit/message'

import { ExampleSlug } from '../example/meta'

export const Message = defineMessageUnion({
  UpdatedNewsletterEmail: { value: Schema.String },
})
export type Message = typeof Message.Type
// OUT MESSAGE

export const OutMessage = defineMessageUnion({
  SelectedPlaygroundExample: { exampleSlug: ExampleSlug },
  UpdatedNewsletterEmail: { value: Schema.String },
})
export type OutMessage = typeof OutMessage.Type
