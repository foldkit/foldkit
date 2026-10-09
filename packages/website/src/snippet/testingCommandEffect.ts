import { Effect, Layer, Match, String } from 'effect'
import { HttpClient, HttpClientResponse } from 'effect/http'
import { expect, test } from 'vitest'

import { FetchWeather, Layer as WeatherLayer } from './main'

test('the FetchWeather handler returns a success Message from HTTP responses', async () => {
  const testClient = HttpClient.make(request =>
    Effect.sync(() => {
      const responseData = Match.value(request.url).pipe(
        Match.when(String.includes('geocoding'), () => ({
          results: [
            {
              name: 'Beverly Hills',
              latitude: 34.07362,
              longitude: -118.40036,
              admin1: 'California',
            },
          ],
        })),
        Match.when(String.includes('forecast'), () => ({
          current: {
            time: '2026-03-10T01:30',
            interval: 900,
            temperature_2m: 72.4,
            relative_humidity_2m: 45,
            wind_speed_10m: 9.8,
            weather_code: 0,
          },
        })),
        Match.orElse(url => {
          throw new Error(`Unexpected request URL: ${url}`)
        }),
      )
      return HttpClientResponse.fromWeb(
        request,
        new Response(JSON.stringify(responseData), { status: 200 }),
      )
    }),
  )

  const TestLayer = Layer.provide(
    WeatherLayer,
    Layer.succeed(HttpClient.HttpClient, testClient),
  )

  const message = await FetchWeather({ zipCode: '90210' }).effect.pipe(
    Effect.provide(TestLayer),
    Effect.runPromise,
  )

  expect(message._tag).toBe('SucceededFetchWeather')
})
