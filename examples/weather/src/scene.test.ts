import {
  Command,
  click,
  expect,
  given,
  inside,
  label,
  role,
  scene,
  submit,
  text,
  type,
} from 'foldkit/scene'
import { describe, test } from 'vitest'

import { FetchWeather, Message, WeatherAsyncData, update, view } from './main'
import { weatherData, weatherModel } from './main.fixture'

describe('view', () => {
  test('initial view shows empty form with Get Weather button', () => {
    scene(
      { update, view },
      given(weatherModel),
      expect(label('Zip code')).toExist(),
      expect(role('button', { name: 'Get Weather' })).toExist(),
      expect(role('article')).toBeAbsent(),
    )
  })

  test('typing a zip code updates the input value', () => {
    scene(
      { update, view },
      given(weatherModel),
      type(label('Zip code'), '10001'),
      expect(label('Zip code')).toHaveValue('10001'),
    )
  })

  test('submitting the form shows loading state', () => {
    scene(
      { update, view },
      given(weatherModel),
      submit(role('form')),
      expect(role('button', { name: 'Loading...' })).toExist(),
      Command.expectExact(FetchWeather({ zipCode: '90210' })),
      Command.resolve(
        FetchWeather,
        Message.SucceededFetchWeather({ weather: weatherData }),
      ),
    )
  })

  test('successful fetch renders weather card', () => {
    scene(
      { update, view },
      given(weatherModel),
      submit(role('form')),
      Command.expectExact(FetchWeather({ zipCode: '90210' })),
      Command.resolve(
        FetchWeather,
        Message.SucceededFetchWeather({ weather: weatherData }),
      ),
      inside(
        role('article'),
        expect(role('heading', { name: '90210' })).toExist(),
        expect(text('Beverly Hills, California')).toExist(),
        expect(text('72°F')).toExist(),
        expect(text('Clear sky')).toExist(),
        expect(text('45%')).toExist(),
        expect(text('10 mph')).toExist(),
      ),
    )
  })

  test('failed fetch renders error message', () => {
    scene(
      { update, view },
      given(weatherModel),
      submit(role('form')),
      Command.expectExact(FetchWeather({ zipCode: '90210' })),
      Command.resolve(
        FetchWeather,
        Message.FailedFetchWeather({ error: 'Network error' }),
      ),
      expect(role('article')).toBeAbsent(),
      expect(text('Network error', { exact: false })).toExist(),
    )
  })

  test('full flow: type zip code, click get weather, see results', () => {
    scene(
      { update, view },
      given({ zipCodeInput: '', weather: WeatherAsyncData.Idle() }),
      type(label('Zip code'), '90210'),
      click(role('button', { name: 'Get Weather' })),
      expect(role('button', { name: 'Loading...' })).toExist(),
      Command.expectExact(FetchWeather({ zipCode: '90210' })),
      Command.resolve(
        FetchWeather,
        Message.SucceededFetchWeather({ weather: weatherData }),
      ),
      inside(
        role('article'),
        expect(text('Beverly Hills, California')).toExist(),
        expect(text('72°F')).toExist(),
      ),
    )
  })
})
