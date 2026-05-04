import { FetchHttpClient, HttpClient } from '@effect/platform'
import { Effect } from 'effect'
import { Command } from 'foldkit'

const withHttp = <A, E>(effect: Effect.Effect<A, E, HttpClient.HttpClient>) =>
  Effect.provide(effect, FetchHttpClient.layer)

const FetchWeather = Command.define(
  'FetchWeather',
  SucceededFetchWeather,
  FailedFetchWeather,
)

const fetchWeather = (city: string) =>
  FetchWeather(
    withHttp(
      Effect.gen(function* () {
        const client = yield* HttpClient.HttpClient
        const response = yield* client.get(`https://api.weather.com/${city}`)
        const json = yield* response.json
        return SucceededFetchWeather({ data: json })
      }),
    ).pipe(
      Effect.catch(() =>
        Effect.succeed(FailedFetchWeather({ error: 'Request failed' })),
      ),
    ),
  )
