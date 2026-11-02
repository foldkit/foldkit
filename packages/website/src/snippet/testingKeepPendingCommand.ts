import { Layer } from 'effect'
import { Http } from 'foldkit'
import { Command, click, expect, label, role, scene, type } from 'foldkit/scene'

import { it } from '@effect/vitest'

import { ApplicationLive, FetchWeather, Message } from './weather'

const application = ApplicationLive.pipe(Layer.provide(Http.layer))

it.effect('edits the zip code while the forecast loads', () =>
  scene(
    application,
    type(label('Zip code'), '90210'),
    click(role('button', { name: 'Get Weather' })),
    Command.keepPending(FetchWeather({ zipCode: '90210' })),

    type(label('Zip code'), '10001'),
    expect(label('Zip code')).toHaveValue('10001'),

    Command.resolve(
      FetchWeather({ zipCode: '90210' }),
      Message.FailedFetchWeather({ error: 'Weather unavailable' }),
    ),
    expect(role('alert')).toHaveText('Weather unavailable'),
  ),
)
