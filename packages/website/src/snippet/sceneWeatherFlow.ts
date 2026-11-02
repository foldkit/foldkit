import { Layer } from 'effect'
import { Http } from 'foldkit'
import {
  Command,
  click,
  expect,
  inside,
  label,
  role,
  scene,
  text,
  type,
} from 'foldkit/scene'

import { it } from '@effect/vitest'

import { ApplicationLive, FetchWeather, Message, type Weather } from './weather'

const application = ApplicationLive.pipe(Layer.provide(Http.layer))

const beverlyHills: Weather = {
  locationName: 'Beverly Hills',
  region: 'California',
  temperature: 72,
  description: 'Clear sky',
}

it.effect('type a zip code, click Get Weather, see the forecast', () =>
  scene(
    application,

    type(label('Zip code'), '90210'),
    click(role('button', { name: 'Get Weather' })),
    expect(role('button', { name: 'Loading...' })).toExist(),

    Command.expectExact(FetchWeather({ zipCode: '90210' })),
    Command.resolve(
      FetchWeather,
      Message.SucceededFetchWeather({ weather: beverlyHills }),
    ),

    inside(
      role('article'),
      expect(text('Beverly Hills, California')).toExist(),
      expect(text('72°F')).toExist(),
      expect(text('Clear sky')).toExist(),
    ),
  ),
)
