import { Scene } from 'foldkit'

import { it } from '@effect/vitest'

import { ApplicationBlock, layer } from './block'

// Scene: test through the view
it.effect('type a zip code, click get weather, see the forecast', () =>
  Scene.scene(
    { block: ApplicationBlock, layer },
    Scene.given(model),
    Scene.type(Scene.label('Zip code'), '90210'),
    Scene.click(Scene.role('button', { name: 'Get Weather' })),
    Scene.expect(Scene.role('button', { name: 'Loading...' })).toExist(),
    Scene.Command.expectExact(FetchWeather),
    Scene.Command.resolve(FetchWeather, SucceededFetchWeather({ weather })),
    Scene.inside(
      Scene.role('article'),
      Scene.expect(Scene.text('Beverly Hills, California')).toExist(),
      Scene.expect(Scene.text('72°F')).toExist(),
    ),
  ),
)
