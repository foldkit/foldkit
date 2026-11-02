import { Layer } from 'effect'
import { Http } from 'foldkit'
import {
  Command,
  expectNoOutMessage,
  expectOutMessage,
  given,
  message,
  model,
  steps,
  story,
} from 'foldkit/story'

import { expect, it } from '@effect/vitest'

import { Note, NoteLive, Save } from './notes'
import {
  ApplicationLive,
  FetchWeather,
  Message,
  type Weather,
  WeatherAsyncData,
} from './weather'

const application = ApplicationLive.pipe(Layer.provide(Http.layer))

const beverlyHills: Weather = {
  locationName: 'Beverly Hills',
  region: 'California',
  temperature: 72,
  description: 'Clear sky',
}

const submittedZipCode = steps(
  message(Message.UpdatedZipCode({ value: '90210' })),
  message(Message.SubmittedWeatherForm()),
)

it.effect('loads the weather for a zip code', () =>
  story(
    // The Block's Layer. The story starts from the Model its constructor returns.
    application,

    // Replace the starting Model.
    given({ zipCode: '', weatherAsyncData: WeatherAsyncData.Idle() }),

    // Run a reusable group of steps.
    submittedZipCode,

    // Assert the pending Commands. A Definition matches any arguments;
    // an instance also checks them.
    Command.expectExact(FetchWeather({ zipCode: '90210' })),
    Command.expectHas(FetchWeather),

    // Supply a Command's result Message.
    Command.resolve(
      FetchWeather,
      Message.SucceededFetchWeather({ weather: beverlyHills }),
    ),

    // Assert there are no pending Commands.
    Command.expectNone(),

    // Assert on the Model.
    model(model => {
      expect(model.weatherAsyncData._tag).toBe('Success')
    }),
  ),
)

it.effect('reports deletion to the parent', () =>
  story(
    NoteLive,
    message(Note.Message.ClickedDelete()),

    // Assert the OutMessage the latest update returned.
    expectOutMessage(Note.OutMessage.RequestedDelete()),

    message(Note.Message.ClickedSave()),
    expectNoOutMessage(),

    // Resolve several Commands at once. Each entry resolves one dispatch.
    Command.resolveAll([Save, Note.Message.SucceededSave()]),
  ),
)
