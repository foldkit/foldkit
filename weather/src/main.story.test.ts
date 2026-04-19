import { HttpClient, HttpClientResponse } from '@effect/platform'
import { Effect, Layer, Match as M, String } from 'effect'
import { Story } from 'foldkit'
import { expect, test } from 'vitest'

import {
  FailedFetchWeather,
  FetchWeather,
  SubmittedWeatherForm,
  SucceededFetchWeather,
  fetchWeather,
  update,
} from './main'
import {
  mockGeocodingResponse,
  mockWeatherResponse,
  weatherData,
  weatherModel,
} from './main.fixtures'

test('submitting the weather form fetches weather and shows result', () => {
  Story.story(
    update,
    Story.with(weatherModel),
    Story.message(SubmittedWeatherForm()),
    Story.model(model => {
      expect(model.weather._tag).toBe('WeatherLoading')
    }),
    Story.resolve(
      FetchWeather,
      SucceededFetchWeather({ weather: weatherData }),
    ),
    Story.model(model => {
      expect(model.weather._tag).toBe('WeatherSuccess')
      if (model.weather._tag === 'WeatherSuccess') {
        expect(model.weather.data.temperature).toBe(72)
        expect(model.weather.data.locationName).toBe('Beverly Hills')
      }
    }),
  )
})

test('failed fetch shows failure state', () => {
  Story.story(
    update,
    Story.with(weatherModel),
    Story.message(SubmittedWeatherForm()),
    Story.resolve(FetchWeather, FailedFetchWeather({ error: 'Network error' })),
    Story.model(model => {
      expect(model.weather._tag).toBe('WeatherFailure')
      if (model.weather._tag === 'WeatherFailure') {
        expect(model.weather.error).toBe('Network error')
      }
    }),
  )
})

test('fetchWeather returns SucceededFetchWeather with data on success', async () => {
  const mockClient = HttpClient.make(request =>
    Effect.sync(() => {
      const responseData = M.value(request.url).pipe(
        M.when(String.includes('geocoding'), () => mockGeocodingResponse),
        M.when(String.includes('forecast'), () => mockWeatherResponse),
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

  const HttpClientTest = Layer.succeed(HttpClient.HttpClient, mockClient)

  const message = await fetchWeather('90210').effect.pipe(
    Effect.provide(HttpClientTest),
    Effect.runPromise,
  )

  expect(message._tag).toBe('SucceededFetchWeather')
  if (message._tag === 'SucceededFetchWeather') {
    expect(message.weather.temperature).toBe(72)
    expect(message.weather.locationName).toBe('Beverly Hills')
    expect(message.weather.description).toBe('Clear sky')
    expect(message.weather.windSpeed).toBe(10)
  }
})

test('fetchWeather returns FailedFetchWeather on HTTP failure', async () => {
  const mockClient = HttpClient.make(request =>
    Effect.succeed(
      HttpClientResponse.fromWeb(request, new Response(null, { status: 404 })),
    ),
  )

  const HttpClientTest = Layer.succeed(HttpClient.HttpClient, mockClient)

  const message = await fetchWeather('invalid').effect.pipe(
    Effect.provide(HttpClientTest),
    Effect.runPromise,
  )

  expect(message._tag).toBe('FailedFetchWeather')
})

test('fetchWeather returns FailedFetchWeather when no results found', async () => {
  const mockClient = HttpClient.make(request =>
    Effect.succeed(
      HttpClientResponse.fromWeb(
        request,
        new Response(JSON.stringify({ results: [] }), { status: 200 }),
      ),
    ),
  )

  const HttpClientTest = Layer.succeed(HttpClient.HttpClient, mockClient)

  const message = await fetchWeather('00000').effect.pipe(
    Effect.provide(HttpClientTest),
    Effect.runPromise,
  )

  expect(message._tag).toBe('FailedFetchWeather')
  if (message._tag === 'FailedFetchWeather') {
    expect(message.error).toBe('Location not found')
  }
})
