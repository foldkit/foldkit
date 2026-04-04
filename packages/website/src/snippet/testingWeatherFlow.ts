import { Story } from 'foldkit'
import { expect, test } from 'vitest'

test('weather search: success then failure', () => {
  Story.story(
    update,
    Story.with(model),

    Story.message(UpdatedZipCodeInput({ value: '90210' })),
    Story.tap(({ model }) => {
      expect(model.zipCode).toBe('90210')
    }),
    Story.message(SubmittedWeatherForm()),
    Story.tap(({ commands }) => {
      expect(commands[0]?.name).toBe(FetchWeather.name)
    }),
    Story.resolve(
      FetchWeather,
      SucceededFetchWeather({ weather: beverlyHillsWeather }),
    ),
    Story.tap(({ model }) => {
      expect(model.weather._tag).toBe('WeatherSuccess')
      expect(model.weather.data.temperature).toBe(72)
    }),

    Story.message(UpdatedZipCodeInput({ value: '00000' })),
    Story.tap(({ model }) => {
      expect(model.zipCode).toBe('00000')
    }),
    Story.message(SubmittedWeatherForm()),
    Story.tap(({ commands }) => {
      expect(commands[0]?.name).toBe(FetchWeather.name)
    }),
    Story.resolve(FetchWeather, FailedFetchWeather({ error: 'Not found' })),
    Story.tap(({ model }) => {
      expect(model.weather._tag).toBe('WeatherFailure')
    }),
  )
})
