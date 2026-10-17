import { AsyncData } from 'foldkit'
import { modifyFields } from 'foldkit/struct'

import { FetchWeather } from './command'
import { ApplicationComposition } from './composition'
import { Message } from './message'
import { WeatherAsyncData } from './model'

export const update = ApplicationComposition.makeUpdate((model, message) =>
  Message.match(message, {
    UpdatedZipCodeInput: ({ value }) => ({
      model: modifyFields(model, { zipCodeInput: () => value }),
    }),
    SubmittedWeatherForm: () => {
      if (AsyncData.isPending(model.weather)) {
        return { model }
      }
      return {
        model: modifyFields(model, {
          weather: () => WeatherAsyncData.Loading(),
        }),
        commands: [FetchWeather({ zipCode: model.zipCodeInput })],
      }
    },
    SucceededFetchWeather: ({ weather }) => ({
      model: modifyFields(model, {
        weather: () => WeatherAsyncData.Success({ data: weather }),
      }),
    }),
    FailedFetchWeather: ({ error }) => ({
      model: modifyFields(model, {
        weather: () => WeatherAsyncData.Failure({ error }),
      }),
    }),
  }),
)
