import { Scene } from 'foldkit'
import { describe } from 'vitest'

import { it } from '@effect/vitest'

import { FetchWeather } from './command'
import { ApplicationBlock, layer } from './index'
import { Message } from './message'
import { WeatherAsyncData } from './model'
import { weatherData, weatherModel } from './model.fixture'

describe('view', () => {
  it.effect('initial view shows empty form with Get Weather button', () =>
    Scene.scene(
      { block: ApplicationBlock, layer },
      Scene.given(weatherModel),
      Scene.expect(Scene.label('Zip code')).toExist(),
      Scene.expect(Scene.role('button', { name: 'Get Weather' })).toExist(),
      Scene.expect(Scene.role('article')).toBeAbsent(),
    ),
  )

  it.effect('typing a zip code updates the input value', () =>
    Scene.scene(
      { block: ApplicationBlock, layer },
      Scene.given(weatherModel),
      Scene.type(Scene.label('Zip code'), '10001'),
      Scene.expect(Scene.label('Zip code')).toHaveValue('10001'),
    ),
  )

  it.effect('submitting the form shows loading state', () =>
    Scene.scene(
      { block: ApplicationBlock, layer },
      Scene.given(weatherModel),
      Scene.submit(Scene.role('form')),
      Scene.expect(Scene.role('button', { name: 'Loading...' })).toExist(),
      Scene.Command.expectExact(FetchWeather({ zipCode: '90210' })),
      Scene.Command.resolve(
        FetchWeather,
        Message.SucceededFetchWeather({ weather: weatherData }),
      ),
    ),
  )

  it.effect('successful fetch renders weather card', () =>
    Scene.scene(
      { block: ApplicationBlock, layer },
      Scene.given(weatherModel),
      Scene.submit(Scene.role('form')),
      Scene.Command.expectExact(FetchWeather({ zipCode: '90210' })),
      Scene.Command.resolve(
        FetchWeather,
        Message.SucceededFetchWeather({ weather: weatherData }),
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
    ),
  )

  it.effect('failed fetch renders error message', () =>
    Scene.scene(
      { block: ApplicationBlock, layer },
      Scene.given(weatherModel),
      Scene.submit(Scene.role('form')),
      Scene.Command.expectExact(FetchWeather({ zipCode: '90210' })),
      Scene.Command.resolve(
        FetchWeather,
        Message.FailedFetchWeather({ error: 'Network error' }),
      ),
      Scene.expect(Scene.role('article')).toBeAbsent(),
      Scene.expect(Scene.text('Network error', { exact: false })).toExist(),
    ),
  )

  it.effect('full flow: type zip code, click get weather, see results', () =>
    Scene.scene(
      { block: ApplicationBlock, layer },
      Scene.given({ zipCodeInput: '', weather: WeatherAsyncData.Idle() }),
      Scene.type(Scene.label('Zip code'), '90210'),
      Scene.click(Scene.role('button', { name: 'Get Weather' })),
      Scene.expect(Scene.role('button', { name: 'Loading...' })).toExist(),
      Scene.Command.expectExact(FetchWeather({ zipCode: '90210' })),
      Scene.Command.resolve(
        FetchWeather,
        Message.SucceededFetchWeather({ weather: weatherData }),
      ),
      Scene.inside(
        Scene.role('article'),
        Scene.expect(Scene.text('Beverly Hills, California')).toExist(),
        Scene.expect(Scene.text('72°F')).toExist(),
      ),
    ),
  )
})
