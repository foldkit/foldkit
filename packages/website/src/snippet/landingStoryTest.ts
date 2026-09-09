import { Command, given, message, model, story } from 'foldkit/story'
import { expect, test } from 'vitest'

// Story: test the state machine
test('fetch weather updates the model', () => {
  story(
    update,
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
  )
})
