import { Scene } from 'foldkit'
import { test } from 'vitest'

test('type a zip code, click get weather, see the forecast', () => {
  Scene.scene(
    { update, view },
    Scene.with(model),

    Scene.type(Scene.label('Zip code'), '90210'),
    Scene.click(Scene.role('button', { name: 'Get Weather' })),
    Scene.expect(Scene.role('button', { name: 'Loading...' })).toExist(),

    Scene.Command.expectExact(FetchWeather),
    Scene.Command.resolve(
      FetchWeather,
      SucceededFetchWeather({ weather: beverlyHillsWeather }),
    ),
    Scene.inside(
      Scene.role('article'),
      Scene.expect(Scene.text('Beverly Hills, California')).toExist(),
      Scene.expect(Scene.text('72\u00B0F')).toExist(),
      Scene.expect(Scene.text('Clear sky')).toExist(),
    ),
  )
})
