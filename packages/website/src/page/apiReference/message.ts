import { Schema } from 'effect'
import { defineMessageUnion } from 'foldkit/message'

import { ApiData } from './domain'

export const Message = defineMessageUnion({
  InformedOfRouteChange: {},
  SucceededLoadApiData: { apiData: ApiData },
  FailedLoadApiData: { error: Schema.String },
  ToggledSignature: {
    id: Schema.String,
    isOpen: Schema.Boolean,
  },
})
export type Message = typeof Message.Type
