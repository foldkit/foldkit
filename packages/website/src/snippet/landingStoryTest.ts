import { Story } from 'foldkit'
import { expect } from 'vitest'

import { it } from '@effect/vitest'

import { ApplicationBlock, layer } from './block'

// Story: test the state machine
it.effect('fetch weather updates the model', () =>
  Story.story(
    { block: ApplicationBlock, layer },
    Story.given(Story.model),
    Story.message(SubmittedWeatherForm()),
    Story.model(model => {
      expect(model.weather._tag).toBe('WeatherLoading')
    }),
    Story.Command.expectExact(FetchWeather),
    Story.Command.resolve(FetchWeather, SucceededFetchWeather({ weather })),
    Story.model(model => {
      expect(model.weather._tag).toBe('WeatherSuccess')
    }),
  ),
)
