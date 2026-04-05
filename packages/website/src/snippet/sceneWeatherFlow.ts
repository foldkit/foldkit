import { Scene } from 'foldkit'
import { expect, test } from 'vitest'

test('weather search: type a zip code, see the forecast', () => {
  Scene.scene(
    { update, view },
    Scene.with(model),

    Scene.type(Scene.label('Zip code'), '90210'),
    Scene.submit(Scene.role('form')),
    Scene.expect(Scene.role('button', { name: 'Loading...' })).toExist(),

    Scene.resolve(
      FetchWeather,
      SucceededFetchWeather({ weather: beverlyHillsWeather }),
    ),
    Scene.inside(
      Scene.role('article'),
      Scene.expect(Scene.role('heading', { name: '90210' })).toExist(),
      Scene.expect(Scene.text('72\u00B0F')).toExist(),
      Scene.expect(Scene.text('Clear sky')).toExist(),
    ),
  )
})
