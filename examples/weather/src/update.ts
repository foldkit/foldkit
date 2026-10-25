import { AsyncData } from 'foldkit'
import { modifyFields } from 'foldkit/struct'

import { FetchWeather } from './command'
import { ApplicationComposition } from './composition'
import { ApplicationDefinition } from './definition'
import { WeatherAsyncData } from './model'

export const update = ApplicationComposition.makeUpdate({
  UpdatedZipCodeInput: ApplicationDefinition.makeFieldsStep.fromMessage(
    ({ value }) => ({ zipCodeInput: () => value }),
  ),
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
  SucceededFetchWeather: ApplicationDefinition.makeFieldsStep.fromMessage(
    ({ weather }) => ({
      weather: () => WeatherAsyncData.Success({ data: weather }),
    }),
  ),
  FailedFetchWeather: ApplicationDefinition.makeFieldsStep.fromMessage(
    ({ error }) => ({
      weather: () => WeatherAsyncData.Failure({ error }),
    }),
  ),
})
