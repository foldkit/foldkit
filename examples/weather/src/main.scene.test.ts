import { Scene } from 'foldkit'
import { describe, test } from 'vitest'

import {
  FailedFetchWeather,
  FetchWeather,
  SucceededFetchWeather,
  WeatherInit,
  update,
  view,
} from './main'
import { weatherData, weatherModel } from './main.fixtures'

describe('scene', () => {
  test('initial view shows empty form with Get Weather button', () => {
    Scene.scene(
      { update, view },
      Scene.with(weatherModel),
      Scene.expect(Scene.label('Location')).toExist(),
      Scene.expect(Scene.role('button', { name: 'Get Weather' })).toExist(),
      Scene.expect(Scene.role('article')).toBeAbsent(),
    )
  })

  test('typing a zip code updates the input value', () => {
    Scene.scene(
      { update, view },
      Scene.with(weatherModel),
      Scene.type(Scene.label('Location'), '10001'),
      Scene.expect(Scene.label('Location')).toHaveValue('10001'),
    )
  })

  test('submitting the form shows loading state', () => {
    Scene.scene(
      { update, view },
      Scene.with(weatherModel),
      Scene.submit(Scene.role('form')),
      Scene.expect(Scene.role('button', { name: 'Loading...' })).toExist(),
      Scene.resolve(
        FetchWeather,
        SucceededFetchWeather({ weather: weatherData }),
      ),
    )
  })

  test('successful fetch renders weather card', () => {
    Scene.scene(
      { update, view },
      Scene.with(weatherModel),
      Scene.submit(Scene.role('form')),
      Scene.resolve(
        FetchWeather,
        SucceededFetchWeather({ weather: weatherData }),
      ),
      Scene.inside(
        Scene.role('article'),
        Scene.expect(Scene.role('heading', { name: '90210' })).toExist(),
        Scene.expect(Scene.text('Beverly Hills, California')).toExist(),
        Scene.expect(Scene.text('72°F')).toExist(),
        Scene.expect(Scene.text('Clear sky')).toExist(),
        Scene.expect(Scene.text('45%')).toExist(),
        Scene.expect(Scene.text('10 mph')).toExist(),
      ),
    )
  })

  test('failed fetch renders error message', () => {
    Scene.scene(
      { update, view },
      Scene.with(weatherModel),
      Scene.submit(Scene.role('form')),
      Scene.resolve(
        FetchWeather,
        FailedFetchWeather({ error: 'Network error' }),
      ),
      Scene.expect(Scene.role('article')).toBeAbsent(),
      Scene.expect(Scene.text('Network error', { exact: false })).toExist(),
    )
  })

  test('full flow: type zip code, submit, see weather', () => {
    Scene.scene(
      { update, view },
      Scene.with({ zipCodeInput: '', weather: WeatherInit() }),
      Scene.type(Scene.label('Location'), '90210'),
      Scene.submit(Scene.role('form')),
      Scene.expect(Scene.role('button', { name: 'Loading...' })).toExist(),
      Scene.resolve(
        FetchWeather,
        SucceededFetchWeather({ weather: weatherData }),
      ),
      Scene.expect(Scene.role('button', { name: 'Get Weather' })).toExist(),
      Scene.expect(Scene.role('article')).toExist(),
      Scene.expect(Scene.role('heading', { name: '90210' })).toExist(),
    )
  })
})
