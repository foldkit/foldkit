import { Scene, Story } from 'foldkit'
import { expect, test } from 'vitest'

// Story — test the state machine
test('fetch weather updates the model', () => {
  Story.story(
    update,
    Story.with(model),
    Story.message(SubmittedWeatherForm()),
    Story.model(model => {
      expect(model.weather._tag).toBe('WeatherLoading')
    }),
    Story.expectExactCommands(FetchWeather),
    Story.resolve(FetchWeather, SucceededFetchWeather({ weather })),
    Story.model(model => {
      expect(model.weather._tag).toBe('WeatherSuccess')
    }),
  )
})

// Scene — test through the view
test('type a zip code, click get weather, see the forecast', () => {
  Scene.scene(
    { update, view },
    Scene.with(model),
    Scene.type(Scene.label('Zip code'), '90210'),
    Scene.click(Scene.role('button', { name: 'Get Weather' })),
    Scene.expect(Scene.role('button', { name: 'Loading...' })).toExist(),
    Scene.expectExactCommands(FetchWeather),
    Scene.resolve(FetchWeather, SucceededFetchWeather({ weather })),
    Scene.inside(
      Scene.role('article'),
      Scene.expect(Scene.text('Beverly Hills, California')).toExist(),
      Scene.expect(Scene.text('72°F')).toExist(),
    ),
  )
})
