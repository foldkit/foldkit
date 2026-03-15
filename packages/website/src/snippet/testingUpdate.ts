import { HttpClient, HttpClientResponse } from '@effect/platform'
import { Effect, Layer, Match as M, String } from 'effect'
import { expect, test } from 'vitest'

import {
  Model,
  SubmittedWeatherForm,
  WeatherInit,
  fetchWeather,
  update,
} from './main'

const createModel = (): Model => ({
  zipCodeInput: '90210',
  weather: WeatherInit(),
})

test('SubmittedWeatherForm sets loading state and returns fetch Command', () => {
  const model = createModel()

  const [newModel, commands] = update(model, SubmittedWeatherForm())

  expect(newModel.weather._tag).toBe('WeatherLoading')
  expect(commands).toHaveLength(1)
})

test('fetchWeather returns SucceededWeatherFetch with data on success', async () => {
  const mockClient = HttpClient.make(request =>
    Effect.sync(() => {
      const responseData = M.value(request.url).pipe(
        M.when(String.includes('geocoding'), () => ({
          results: [
            {
              name: 'Beverly Hills',
              latitude: 34.07362,
              longitude: -118.40036,
              admin1: 'California',
            },
          ],
        })),
        M.when(String.includes('forecast'), () => ({
          current: {
            time: '2026-03-10T01:30',
            interval: 900,
            temperature_2m: 72.4,
            relative_humidity_2m: 45,
            wind_speed_10m: 9.8,
            weather_code: 0,
          },
        })),
        M.orElse(url => {
          throw new Error(`Unexpected request URL: ${url}`)
        }),
      )
      return HttpClientResponse.fromWeb(
        request,
        new Response(JSON.stringify(responseData), { status: 200 }),
      )
    }),
  )

  const message = await fetchWeather('90210').pipe(
    Effect.provide(Layer.succeed(HttpClient.HttpClient, mockClient)),
    Effect.runPromise,
  )

  expect(message._tag).toBe('SucceededWeatherFetch')
})
