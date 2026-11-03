import { Schema } from 'effect'
import { defineMessageUnion } from 'foldkit/message'

import { ExampleSources } from './sources'

export const Message = defineMessageUnion({
  ChangedExampleUrl: { url: Schema.String },
  ToggledLivePreview: { isOpen: Schema.Boolean },
  SucceededLoadExampleSources: { sources: ExampleSources },
  FailedLoadExampleSources: { error: Schema.String },
})
export type Message = typeof Message.Type
export type ChangedExampleUrl = typeof Message.ChangedExampleUrl.Type
