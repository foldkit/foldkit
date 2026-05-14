import { Effect, Schema as S } from 'effect'
import { FetchHttpClient, HttpClient } from 'effect/unstable/http'
import { Command } from 'foldkit'

const withHttp = <A, E>(effect: Effect.Effect<A, E, HttpClient.HttpClient>) =>
  Effect.provide(effect, FetchHttpClient.layer)

const FetchWeather = Command.define(
  'FetchWeather',
  { city: S.String },
  SucceededFetchWeather,
  FailedFetchWeather,
)(({ city }) =>
  Effect.gen(function* () {
    const client = yield* HttpClient.HttpClient
    const response = yield* client.get(`https://api.weather.com/${city}`)
    const data = yield* S.decodeUnknownEffect(WeatherResponse)(
      yield* response.json,
    )
    return SucceededFetchWeather({ data })
  }).pipe(
    withHttp,
    Effect.catch(() =>
      Effect.succeed(FailedFetchWeather({ error: 'Request failed' })),
    ),
  ),
)
