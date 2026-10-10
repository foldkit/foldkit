import { Effect, Layer, Match, String } from 'effect'
import { HttpClient, HttpClientResponse } from 'effect/http'
import { expect, test } from 'vitest'

import { EffectsLayer, FetchWeather } from './main'
import { mockGeocodingResponse, mockWeatherResponse } from './main.fixture'

test('fetchWeather returns SucceededFetchWeather with data on success', async () => {
  const mockClient = HttpClient.make(request =>
    Effect.sync(() => {
      const responseData = Match.value(request.url).pipe(
        Match.when(String.includes('geocoding'), () => mockGeocodingResponse),
        Match.when(String.includes('forecast'), () => mockWeatherResponse),
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

  const HttpClientTestLayer = Layer.succeed(HttpClient.HttpClient, mockClient)

  const resultMessage = await FetchWeather({ zipCode: '90210' }).effect.pipe(
    Effect.provide(EffectsLayer.pipe(Layer.provide(HttpClientTestLayer))),
    Effect.runPromise,
  )

  expect(resultMessage._tag).toBe('SucceededFetchWeather')
  if (resultMessage._tag === 'SucceededFetchWeather') {
    expect(resultMessage.weather.temperature).toBe(72)
    expect(resultMessage.weather.locationName).toBe('Beverly Hills')
    expect(resultMessage.weather.description).toBe('Clear sky')
    expect(resultMessage.weather.windSpeed).toBe(10)
  }
})

test('fetchWeather returns FailedFetchWeather on HTTP failure', async () => {
  const mockClient = HttpClient.make(request =>
    Effect.succeed(
      HttpClientResponse.fromWeb(request, new Response(null, { status: 404 })),
    ),
  )

  const HttpClientTestLayer = Layer.succeed(HttpClient.HttpClient, mockClient)

  const resultMessage = await FetchWeather({ zipCode: 'invalid' }).effect.pipe(
    Effect.provide(EffectsLayer.pipe(Layer.provide(HttpClientTestLayer))),
    Effect.runPromise,
  )

  expect(resultMessage._tag).toBe('FailedFetchWeather')
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

  const HttpClientTestLayer = Layer.succeed(HttpClient.HttpClient, mockClient)

  const resultMessage = await FetchWeather({ zipCode: '00000' }).effect.pipe(
    Effect.provide(EffectsLayer.pipe(Layer.provide(HttpClientTestLayer))),
    Effect.runPromise,
  )

  expect(resultMessage._tag).toBe('FailedFetchWeather')
  if (resultMessage._tag === 'FailedFetchWeather') {
    expect(resultMessage.error).toBe('Location not found')
  }
})
