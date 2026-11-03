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

import { it } from '@effect/vitest'

import { ApplicationBlock } from './application'

// Scene: test through the view
it.effect('type a zip code, click get weather, see the forecast', () =>
  scene(
    ApplicationBlock,
    given(model),
    type(label('Zip code'), '90210'),
    click(role('button', { name: 'Get Weather' })),
    expect(role('button', { name: 'Loading...' })).toExist(),
    Command.expectExact(FetchWeather),
    Command.resolve(FetchWeather, SucceededFetchWeather({ weather })),
    inside(
      role('article'),
      expect(text('Beverly Hills, California')).toExist(),
      expect(text('72°F')).toExist(),
    ),
  ),
)
