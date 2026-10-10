import { Command, given, message, model, story } from 'foldkit/story'
import { expect, test } from 'vitest'

import { FetchWeather, Message, update } from './main'
import { weatherData, weatherModel } from './main.fixture'

test('submitting the weather form fetches weather and shows result', () => {
  story(
    update,
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
  )
})

test('failed fetch shows failure state', () => {
  story(
    update,
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
  )
})
