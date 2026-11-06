import { Story } from 'foldkit'
import { expect } from 'vitest'

import { it } from '@effect/vitest'

import { FetchWeather } from './command'
import { ApplicationBlock, layer } from './index'
import { Message } from './message'
import { weatherData, weatherModel } from './model.fixture'

it.effect('submitting the weather form fetches weather and shows result', () =>
  Story.story(
    { block: ApplicationBlock, layer },
    Story.given(weatherModel),
    Story.message(Message.SubmittedWeatherForm()),
    Story.model(model => {
      expect(model.weather._tag).toBe('Loading')
    }),
    Story.Command.resolve(
      FetchWeather,
      Message.SucceededFetchWeather({ weather: weatherData }),
    ),
    Story.model(model => {
      expect(model.weather._tag).toBe('Success')
      if (model.weather._tag === 'Success') {
        expect(model.weather.data.temperature).toBe(72)
        expect(model.weather.data.locationName).toBe('Beverly Hills')
      }
    }),
  ),
)

it.effect('failed fetch shows failure state', () =>
  Story.story(
    { block: ApplicationBlock, layer },
    Story.given(weatherModel),
    Story.message(Message.SubmittedWeatherForm()),
    Story.Command.resolve(
      FetchWeather,
      Message.FailedFetchWeather({ error: 'Network error' }),
    ),
    Story.model(model => {
      expect(model.weather._tag).toBe('Failure')
      if (model.weather._tag === 'Failure') {
        expect(model.weather.error).toBe('Network error')
      }
    }),
  ),
)
