import { Effect, Layer, Schema } from 'effect'
import { HttpClient } from 'effect/http'
import { Command, Http } from 'foldkit'

import { Message } from './message'

const FetchWeather = Command.define('FetchWeather', {
  args: { city: Schema.String },
  messages: [Message.SucceededFetchWeather, Message.FailedFetchWeather],
})

const FetchWeatherLive = FetchWeather.toLayer(({ city }) =>
  Effect.gen(function* () {
    const client = yield* HttpClient.HttpClient
    const response = yield* client.get(`https://api.weather.com/${city}`)
    const data = yield* Schema.decodeUnknownEffect(WeatherResponse)(
      yield* response.json,
    )
    return Message.SucceededFetchWeather({ weather: data })
  }).pipe(
    Effect.catch(() =>
      Effect.succeed(Message.FailedFetchWeather({ error: 'Request failed' })),
    ),
  ),
)

export const HandlersLive = FetchWeatherLive
export const Live = Layer.provideMerge(HandlersLive, Http.layer)
