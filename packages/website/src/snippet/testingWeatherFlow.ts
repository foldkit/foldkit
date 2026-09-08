import { Command, given, message, model, story } from 'foldkit/story'
import { expect, test } from 'vitest'

test('weather search: success then failure', () => {
  story(
    update,
    given(model),

    message(UpdatedZipCodeInput({ value: '90210' })),
    model(model => {
      expect(model.zipCode).toBe('90210')
    }),
    message(SubmittedWeatherForm()),
    // Instance form: locks in the zipCode the runtime captured.
    Command.expectHas(FetchWeather({ zipCode: '90210' })),
    Command.resolve(
      FetchWeather,
      SucceededFetchWeather({ weather: beverlyHillsWeather }),
    ),
    model(model => {
      expect(model.weather._tag).toBe('WeatherSuccess')
      expect(model.weather.data.temperature).toBe(72)
    }),

    message(UpdatedZipCodeInput({ value: '00000' })),
    model(model => {
      expect(model.zipCode).toBe('00000')
    }),
    message(SubmittedWeatherForm()),
    Command.expectHas(FetchWeather({ zipCode: '00000' })),
    Command.resolve(FetchWeather, FailedFetchWeather({ error: 'Not found' })),
    model(model => {
      expect(model.weather._tag).toBe('WeatherFailure')
    }),
  )
})
