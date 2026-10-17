import { Schema } from 'effect'
import { AsyncData } from 'foldkit'

export const WeatherData = Schema.Struct({
  zipCode: Schema.String,
  temperature: Schema.Number,
  description: Schema.String,
  humidity: Schema.Number,
  windSpeed: Schema.Number,
  locationName: Schema.String,
  region: Schema.String,
})
export type WeatherData = typeof WeatherData.Type

export const WeatherAsyncData = AsyncData.Schema(WeatherData, Schema.String)

export const Model = Schema.Struct({
  zipCodeInput: Schema.String,
  weather: WeatherAsyncData.schema,
})
export type Model = typeof Model.Type
