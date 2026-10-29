import { Schema } from 'effect'
import { defineMessageUnion } from 'foldkit/message'

import { WeatherData } from './model'

export const Message = defineMessageUnion({
  UpdatedZipCodeInput: { value: Schema.String },
  SubmittedWeatherForm: {},
  SucceededFetchWeather: { weather: WeatherData },
  FailedFetchWeather: { error: Schema.String },
})
export type Message = typeof Message.Type
