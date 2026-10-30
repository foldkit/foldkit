import { Layer } from 'effect'
import { Http } from 'foldkit'
import { Command, message, model, story } from 'foldkit/story'

import { expect, it } from '@effect/vitest'

import { ApplicationLive, FetchWeather, Message, type Weather } from './weather'

const application = ApplicationLive.pipe(Layer.provide(Http.layer))

const beverlyHills: Weather = {
  locationName: 'Beverly Hills',
  region: 'California',
  temperature: 72,
  description: 'Clear sky',
}

it.effect('shows a forecast, then a failure for an unknown zip code', () =>
  story(
    application,

    message(Message.UpdatedZipCode({ value: '90210' })),
    message(Message.SubmittedWeatherForm()),
    Command.expectExact(FetchWeather({ zipCode: '90210' })),
    Command.resolve(
      FetchWeather,
      Message.SucceededFetchWeather({ weather: beverlyHills }),
    ),
    model(model => {
      expect(model.weatherAsyncData._tag).toBe('Success')
    }),

    message(Message.UpdatedZipCode({ value: '00000' })),
    message(Message.SubmittedWeatherForm()),
    Command.expectExact(FetchWeather({ zipCode: '00000' })),
    Command.resolve(
      FetchWeather,
      Message.FailedFetchWeather({ error: 'Location not found' }),
    ),
    model(model => {
      expect(model.weatherAsyncData._tag).toBe('Failure')
    }),
  ),
)
