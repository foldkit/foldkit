import {
  Command,
  click,
  expect,
  given,
  inside,
  label,
  role,
  scene,
  text,
  type,
} from 'foldkit/scene'
import { test } from 'vitest'

test('type a zip code, click get weather, see the forecast', () => {
  scene(
    { update, view },
    given(model),

    type(label('Zip code'), '90210'),
    click(role('button', { name: 'Get Weather' })),
    expect(role('button', { name: 'Loading...' })).toExist(),

    // Instance form: locks in the zipCode the runtime captured.
    Command.expectExact(FetchWeather({ zipCode: '90210' })),
    Command.resolve(
      FetchWeather,
      SucceededFetchWeather({ weather: beverlyHillsWeather }),
    ),
    inside(
      role('article'),
      expect(text('Beverly Hills, California')).toExist(),
      expect(text('72\u00B0F')).toExist(),
      expect(text('Clear sky')).toExist(),
    ),
  )
})
