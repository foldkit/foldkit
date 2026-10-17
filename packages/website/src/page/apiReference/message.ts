import { Schema } from 'effect'
import { defineMessageUnion } from 'foldkit/message'

import { ApiData } from './model'

export const Message = defineMessageUnion({
  SucceededLoadApiData: { apiData: ApiData },
  FailedLoadApiData: { error: Schema.String },
  ToggledSignature: {
    id: Schema.String,
    isOpen: Schema.Boolean,
  },
})
export type Message = typeof Message.Type
