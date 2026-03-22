import { HttpClient, HttpClientResponse } from '@effect/platform'
import { Effect, Layer, Match as M, String } from 'effect'
import { Test } from 'foldkit'
import { expect, test } from 'vitest'

import {
  FailedFetchWeather,
  FetchWeather,
  Model,
  SubmittedWeatherForm,
  SucceededFetchWeather,
  WeatherData,
  WeatherInit,
  fetchWeather,
  update,
} from './main'

const weatherModel: Model = {
  zipCodeInput: '90210',
  weather: WeatherInit(),
}

test('submitting the weather form fetches weather and shows result', () => {
  const weatherData: WeatherData = {
    zipCode: '90210',
    temperature: 72,
    description: 'Clear sky',
    humidity: 45,
    windSpeed: 10,
    locationName: 'Beverly Hills',
    region: 'California',
  }

  Test.story(
    update,
    Test.with(weatherModel),
    Test.message(SubmittedWeatherForm()),
    Test.tap(({ model }) => {
      expect(model.weather._tag).toBe('WeatherLoading')
    }),
    Test.resolve(FetchWeather, SucceededFetchWeather({ weather: weatherData })),
    Test.tap(({ model }) => {
      expect(model.weather._tag).toBe('WeatherSuccess')
      if (model.weather._tag === 'WeatherSuccess') {
        expect(model.weather.data.temperature).toBe(72)
        expect(model.weather.data.locationName).toBe('Beverly Hills')
      }
    }),
  )
})

test('failed fetch shows failure state', () => {
  Test.story(
    update,
    Test.with(weatherModel),
    Test.message(SubmittedWeatherForm()),
    Test.resolve(FetchWeather, FailedFetchWeather({ error: 'Network error' })),
    Test.tap(({ model }) => {
      expect(model.weather._tag).toBe('WeatherFailure')
      if (model.weather._tag === 'WeatherFailure') {
        expect(model.weather.error).toBe('Network error')
      }
    }),
  )
})

const mockGeocodingResponse = {
  results: [
    {
      name: 'Beverly Hills',
      latitude: 34.07362,
      longitude: -118.40036,
      admin1: 'California',
    },
  ],
  generationtime_ms: 0.5,
}

const mockWeatherResponse = {
  current: {
    time: '2026-03-10T01:30',
    interval: 900,
    temperature_2m: 72.4,
    relative_humidity_2m: 45,
    wind_speed_10m: 9.8,
    weather_code: 0,
  },
}

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
