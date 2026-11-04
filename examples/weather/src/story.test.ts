import { Command, given, message, model, story } from 'foldkit/story'
import { expect } from 'vitest'

import { it } from '@effect/vitest'

import { ApplicationBlock, layer } from './block'
import { FetchWeather } from './command'
import { Message } from './message'
import { weatherData, weatherModel } from './model.fixture'

it.effect('submitting the weather form fetches weather and shows result', () =>
  story(
    { block: ApplicationBlock, layer },
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

it.effect('failed fetch shows failure state', () =>
  story(
    { block: ApplicationBlock, layer },
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
