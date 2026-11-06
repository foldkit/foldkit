import { Story } from 'foldkit'
import { expect } from 'vitest'

import { it } from '@effect/vitest'

import { ApplicationBlock, layer } from './block'

it.effect('weather search: success then failure', () =>
  Story.story(
    { block: ApplicationBlock, layer },
    Story.given(Story.model),

    Story.message(UpdatedZipCodeInput({ value: '90210' })),
    Story.model(model => {
      expect(model.zipCode).toBe('90210')
    }),
    Story.message(SubmittedWeatherForm()),
    // Instance form: locks in the zipCode the runtime captured.
    Story.Command.expectHas(FetchWeather({ zipCode: '90210' })),
    Story.Command.resolve(
      FetchWeather,
      SucceededFetchWeather({ weather: beverlyHillsWeather }),
    ),
    Story.model(model => {
      expect(model.weather._tag).toBe('WeatherSuccess')
      expect(model.weather.data.temperature).toBe(72)
    }),

    Story.message(UpdatedZipCodeInput({ value: '00000' })),
    Story.model(model => {
      expect(model.zipCode).toBe('00000')
    }),
    Story.message(SubmittedWeatherForm()),
    Story.Command.expectHas(FetchWeather({ zipCode: '00000' })),
    Story.Command.resolve(
      FetchWeather,
      FailedFetchWeather({ error: 'Not found' }),
    ),
    Story.model(model => {
      expect(model.weather._tag).toBe('WeatherFailure')
    }),
  ),
)
