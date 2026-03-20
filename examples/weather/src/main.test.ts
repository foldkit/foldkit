import { HttpClient, HttpClientResponse } from '@effect/platform'
import { Effect, Layer, Match as M, String } from 'effect'
import { expect, test } from 'vitest'

import {
  Model,
  SubmittedWeatherForm,
  SucceededWeatherFetch,
  WeatherData,
  WeatherInit,
  fetchWeather,
  update,
} from './main'

const createModel = (): Model => ({
  zipCodeInput: '90210',
  weather: WeatherInit(),
})

test('SubmittedWeatherForm sets loading state and returns fetch command', () => {
  const model = createModel()

  const [newModel, commands] = update(model, SubmittedWeatherForm())

  expect(newModel.weather._tag).toBe('WeatherLoading')
  expect(commands).toHaveLength(1)
  expect(commands[0]?.name).toBe('FetchWeather')
})

test('SucceededWeatherFetch updates model with weather data', () => {
  const model = createModel()
  const weatherData: WeatherData = {
    zipCode: '90210',
    temperature: 72,
    description: 'Clear sky',
    humidity: 45,
    windSpeed: 10,
    locationName: 'Beverly Hills',
    region: 'California',
  }

  const [newModel, commands] = update(
    model,
    SucceededWeatherFetch({ weather: weatherData }),
  )

  expect(newModel.weather._tag).toBe('WeatherSuccess')
  if (newModel.weather._tag === 'WeatherSuccess') {
    expect(newModel.weather.data.temperature).toBe(72)
    expect(newModel.weather.data.locationName).toBe('Beverly Hills')
  }
  expect(commands).toHaveLength(0)
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

test('fetchWeather returns SucceededWeatherFetch with data on success', async () => {
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

  expect(message._tag).toBe('SucceededWeatherFetch')
  if (message._tag === 'SucceededWeatherFetch') {
    expect(message.weather.temperature).toBe(72)
    expect(message.weather.locationName).toBe('Beverly Hills')
    expect(message.weather.description).toBe('Clear sky')
    expect(message.weather.windSpeed).toBe(10)
  }
})

test('fetchWeather returns FailedWeatherFetch on HTTP failure', async () => {
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

  expect(message._tag).toBe('FailedWeatherFetch')
})

test('fetchWeather returns FailedWeatherFetch when no results found', async () => {
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

  expect(message._tag).toBe('FailedWeatherFetch')
  if (message._tag === 'FailedWeatherFetch') {
    expect(message.error).toBe('Location not found')
  }
})
