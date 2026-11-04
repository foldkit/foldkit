import { Command, given, message, model, story } from 'foldkit/story'
import { expect } from 'vitest'

import { it } from '@effect/vitest'

import { ApplicationBlock, layer } from './application'

// Story: test the state machine
it.effect('fetch weather updates the model', () =>
  story(
    { block: ApplicationBlock, layer },
    given(model),
    message(SubmittedWeatherForm()),
    model(model => {
      expect(model.weather._tag).toBe('WeatherLoading')
    }),
    Command.expectExact(FetchWeather),
    Command.resolve(FetchWeather, SucceededFetchWeather({ weather })),
    model(model => {
      expect(model.weather._tag).toBe('WeatherSuccess')
    }),
  ),
)
