import { Story } from 'foldkit'
import { expect, test } from 'vitest'

test('weather search: success then failure', () => {
  Story.story(
    update,
    Story.with(model),

    Story.message(UpdatedZipCodeInput({ value: '90210' })),
    Story.model(model => {
      expect(model.zipCode).toBe('90210')
    }),
    Story.message(SubmittedWeatherForm()),
    Story.Command.expectHas(FetchWeather),
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
    Story.Command.expectHas(FetchWeather),
    Story.Command.resolve(
      FetchWeather,
      FailedFetchWeather({ error: 'Not found' }),
    ),
    Story.model(model => {
      expect(model.weather._tag).toBe('WeatherFailure')
    }),
  )
})
