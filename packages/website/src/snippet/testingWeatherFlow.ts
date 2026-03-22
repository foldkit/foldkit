import { Test } from 'foldkit'
import { expect, test } from 'vitest'

test('weather search: success then failure', () => {
  Test.story(
    update,
    Test.with(model),

    Test.message(UpdatedZipCodeInput({ value: '90210' })),
    Test.tap(({ model }) => {
      expect(model.zipCode).toBe('90210')
    }),
    Test.message(SubmittedWeatherForm()),
    Test.tap(({ commands }) => {
      expect(commands[0]?.name).toBe(FetchWeather.name)
    }),
    Test.resolve(
      FetchWeather,
      SucceededFetchWeather({ weather: beverlyHillsWeather }),
    ),
    Test.tap(({ model }) => {
      expect(model.weather._tag).toBe('WeatherSuccess')
      expect(model.weather.data.temperature).toBe(72)
    }),

    Test.message(UpdatedZipCodeInput({ value: '00000' })),
    Test.tap(({ model }) => {
      expect(model.zipCode).toBe('00000')
    }),
    Test.message(SubmittedWeatherForm()),
    Test.tap(({ commands }) => {
      expect(commands[0]?.name).toBe(FetchWeather.name)
    }),
    Test.resolve(FetchWeather, FailedFetchWeather({ error: 'Not found' })),
    Test.tap(({ model }) => {
      expect(model.weather._tag).toBe('WeatherFailure')
    }),
  )
})
