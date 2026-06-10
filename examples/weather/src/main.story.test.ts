import { Effect, Layer, Match as M, String } from 'effect'
import { HttpClient, HttpClientResponse } from 'effect/unstable/http'
import { expect, test } from 'vitest'

import {
  FailedFetchWeather,
  FetchWeather,
  SubmittedWeatherForm,
  SucceededFetchWeather,
  fetchWeatherEffect,
  update,
} from './main'
import {
  mockGeocodingResponse,
  mockWeatherResponse,
  weatherData,
  weatherModel,
} from './main.fixtures'

test('submitting the weather form fetches weather and shows result', () => {
  const [loadingModel, commands] = update(weatherModel, SubmittedWeatherForm())

  expect(loadingModel.weather._tag).toBe('WeatherLoading')
  expect(commands).toEqual([FetchWeather({ zipCode: '90210' })])

  const [successModel] = update(
    loadingModel,
    SucceededFetchWeather({ weather: weatherData }),
  )

  expect(successModel.weather._tag).toBe('WeatherSuccess')
  if (successModel.weather._tag === 'WeatherSuccess') {
    expect(successModel.weather.data.temperature).toBe(72)
    expect(successModel.weather.data.locationName).toBe('Beverly Hills')
  }
})

test('failed fetch shows failure state', () => {
  const [loadingModel, commands] = update(weatherModel, SubmittedWeatherForm())

  expect(commands).toEqual([FetchWeather({ zipCode: '90210' })])

  const [failureModel] = update(
    loadingModel,
    FailedFetchWeather({ error: 'Network error' }),
  )

  expect(failureModel.weather._tag).toBe('WeatherFailure')
  if (failureModel.weather._tag === 'WeatherFailure') {
    expect(failureModel.weather.error).toBe('Network error')
  }
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

  const message = await fetchWeatherEffect('90210').pipe(
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

  const message = await fetchWeatherEffect('invalid').pipe(
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

  const message = await fetchWeatherEffect('00000').pipe(
    Effect.provide(HttpClientTest),
    Effect.runPromise,
  )

  expect(message._tag).toBe('FailedFetchWeather')
  if (message._tag === 'FailedFetchWeather') {
    expect(message.error).toBe('Location not found')
  }
})
