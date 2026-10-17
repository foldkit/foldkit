import { ApplicationComposition } from './composition'
import { Model, WeatherAsyncData } from './model'

export const init = ApplicationComposition.makeInit(() => ({
  model: Model.make({
    zipCodeInput: '',
    weather: WeatherAsyncData.Idle(),
  }),
}))
