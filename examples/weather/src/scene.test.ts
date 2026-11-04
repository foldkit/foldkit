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
import { describe } from 'vitest'

import { it } from '@effect/vitest'

import { ApplicationBlock, layer } from './block'
import { FetchWeather } from './command'
import { Message } from './message'
import { WeatherAsyncData } from './model'
import { weatherData, weatherModel } from './model.fixture'

describe('view', () => {
  it.effect('initial view shows empty form with Get Weather button', () =>
    scene(
      { block: ApplicationBlock, layer },
      given(weatherModel),
      expect(label('Zip code')).toExist(),
      expect(role('button', { name: 'Get Weather' })).toExist(),
      expect(role('article')).toBeAbsent(),
    ),
  )

  it.effect('typing a zip code updates the input value', () =>
    scene(
      { block: ApplicationBlock, layer },
      given(weatherModel),
      type(label('Zip code'), '10001'),
      expect(label('Zip code')).toHaveValue('10001'),
    ),
  )

  it.effect('submitting the form shows loading state', () =>
    scene(
      { block: ApplicationBlock, layer },
      given(weatherModel),
      submit(role('form')),
      expect(role('button', { name: 'Loading...' })).toExist(),
      Command.expectExact(FetchWeather({ zipCode: '90210' })),
      Command.resolve(
        FetchWeather,
        Message.SucceededFetchWeather({ weather: weatherData }),
      ),
    ),
  )

  it.effect('successful fetch renders weather card', () =>
    scene(
      { block: ApplicationBlock, layer },
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
    ),
  )

  it.effect('failed fetch renders error message', () =>
    scene(
      { block: ApplicationBlock, layer },
      given(weatherModel),
      submit(role('form')),
      Command.expectExact(FetchWeather({ zipCode: '90210' })),
      Command.resolve(
        FetchWeather,
        Message.FailedFetchWeather({ error: 'Network error' }),
      ),
      expect(role('article')).toBeAbsent(),
      expect(text('Network error', { exact: false })).toExist(),
    ),
  )

  it.effect('full flow: type zip code, click get weather, see results', () =>
    scene(
      { block: ApplicationBlock, layer },
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
    ),
  )
})
