import { Effect } from 'effect'
import { Command, given, message, model, story } from 'foldkit/story'
import { expect, test } from 'vitest'

import { ApplicationBlock } from './block'
import { FetchWeather } from './command'
import { Message } from './message'
import { weatherData, weatherModel } from './model.fixture'

test('submitting the weather form fetches weather and shows result', async () => {
  await Effect.runPromise(
    story(
      ApplicationBlock,
      given(weatherModel),
      message(Message.SubmittedWeatherForm()),
      model(model => {
        expect(model.weather._tag).toBe('Loading')
      }),
      Command.resolve(
        FetchWeather,
        Message.SucceededFetchWeather({ weather: weatherData }),
      ),
      model(model => {
        expect(model.weather._tag).toBe('Success')
        if (model.weather._tag === 'Success') {
          expect(model.weather.data.temperature).toBe(72)
          expect(model.weather.data.locationName).toBe('Beverly Hills')
        }
      }),
    ),
  )
})

test('failed fetch shows failure state', async () => {
  await Effect.runPromise(
    story(
      ApplicationBlock,
      given(weatherModel),
      message(Message.SubmittedWeatherForm()),
      Command.resolve(
        FetchWeather,
        Message.FailedFetchWeather({ error: 'Network error' }),
      ),
      model(model => {
        expect(model.weather._tag).toBe('Failure')
        if (model.weather._tag === 'Failure') {
          expect(model.weather.error).toBe('Network error')
        }
      }),
    ),
  )
})
