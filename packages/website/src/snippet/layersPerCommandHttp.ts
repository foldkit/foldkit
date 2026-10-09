import { Effect, Layer, Schema } from 'effect'
import { HttpClient } from 'effect/http'
import { Command, Http } from 'foldkit'

import { Message } from './message'

const FetchWeather = Command.define('FetchWeather', {
  args: { city: Schema.String },
  messages: [Message.SucceededFetchWeather, Message.FailedFetchWeather],
})

const FetchWeatherLayer = FetchWeather.toLayer(
  Effect.gen(function* () {
    const client = yield* HttpClient.HttpClient

    return ({ city }) =>
      Effect.gen(function* () {
        const response = yield* client.get(`https://api.weather.com/${city}`)
        const data = yield* Schema.decodeUnknownEffect(WeatherResponse)(
          yield* response.json,
        )
        return Message.SucceededFetchWeather({ weather: data })
      }).pipe(
        Effect.catch(() =>
          Effect.succeed(
            Message.FailedFetchWeather({ error: 'Request failed' }),
          ),
        ),
      )
  }),
)

export const HandlersLayer = FetchWeatherLayer
const ServicesLayer = Http.layer

export const AppLayer = Layer.provide(HandlersLayer, ServicesLayer)
