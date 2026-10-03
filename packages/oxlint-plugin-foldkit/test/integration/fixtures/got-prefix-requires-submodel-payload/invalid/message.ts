import { Schema } from 'effect'
import { Message as MessageApi } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

import { ValidationMessage } from './validation'

const weather = { Message: Schema.String }

const Message = defineMessageUnion({
  GotWeather: { temperature: Schema.Number, },
  GotValidation: { message: ValidationMessage, },
  GotWeatherMessage: { message: weather.Message },
})

const RootMessage = MessageApi.defineMessageUnion({
  GotRootApi: { message: Schema.String },
})
