import { AsyncData } from 'foldkit'
import { modifyFields } from 'foldkit/struct'

import { FetchWeather } from './command'
import { ApplicationComposition } from './composition'
import { makeFieldsStep } from './definition'
import { WeatherAsyncData } from './model'

export const update = ApplicationComposition.makeUpdate({
  UpdatedZipCodeInput: makeFieldsStep.fromMessage(({ value }) => ({
    zipCodeInput: () => value,
  })),
  SubmittedWeatherForm: model => {
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
  SucceededFetchWeather: makeFieldsStep.fromMessage(({ weather }) => ({
    weather: () => WeatherAsyncData.Success({ data: weather }),
  })),
  FailedFetchWeather: makeFieldsStep.fromMessage(({ error }) => ({
    weather: () => WeatherAsyncData.Failure({ error }),
  })),
})
