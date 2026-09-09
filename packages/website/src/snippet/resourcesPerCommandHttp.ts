import { Effect, Schema } from 'effect'
import { HttpClient } from 'effect/unstable/http'
import { Command, Http } from 'foldkit'

const FetchWeather = Command.define('FetchWeather', {
  args: { city: Schema.String },
  messages: [SucceededFetchWeather, FailedFetchWeather],
  execute: ({ city }) =>
    Effect.gen(function* () {
      const client = yield* HttpClient.HttpClient
      const response = yield* client.get(`https://api.weather.com/${city}`)
      const data = yield* Schema.decodeUnknownEffect(WeatherResponse)(
        yield* response.json,
      )
      return SucceededFetchWeather({ weather: data })
    }).pipe(
      Effect.catch(() =>
        Effect.succeed(FailedFetchWeather({ error: 'Request failed' })),
      ),
      Effect.provide(Http.layer),
    ),
})
