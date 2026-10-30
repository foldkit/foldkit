// ✅ Good: the Message records the click. The Command names the work.

import { Effect, Schema } from 'effect'
import { Block, Command } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

import { WeatherApi } from './antiPatternWeatherApi'

const Message = defineMessageUnion({
  ClickedRefresh: {},
  SucceededFetchWeather: { forecast: Schema.String },
  FailedFetchWeather: {},
})

const FetchWeather = Command.define('FetchWeather', {
  messages: [Message.SucceededFetchWeather, Message.FailedFetchWeather],
})

export class Weather extends Block<Weather>()('Weather', {
  Model: Schema.Struct({ forecast: Schema.String }),
  Message,
  Command: [FetchWeather],
}) {}

export const WeatherLive = Weather.make(
  Effect.fn(function* () {
    const weatherApi = yield* WeatherApi

    return {
      model: { forecast: '' },

      update: {
        ClickedRefresh: model => ({ model, commands: [FetchWeather()] }),
        SucceededFetchWeather: (model, { forecast }) => ({
          model: modifyFields(model, { forecast: () => forecast }),
        }),
        FailedFetchWeather: model => ({ model }),
      },

      commands: {
        FetchWeather: () =>
          weatherApi.forecast.pipe(
            Effect.map(forecast => Message.SucceededFetchWeather({ forecast })),
            Effect.catch(() => Effect.succeed(Message.FailedFetchWeather())),
          ),
      },

      view: (model, h) =>
        h.div(
          [],
          [
            h.p([], [model.forecast]),
            h.button([h.OnClick(Message.ClickedRefresh())], ['Refresh']),
          ],
        ),
    }
  }),
)
