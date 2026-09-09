import { Option } from 'effect'
import { Update } from 'foldkit'

import { Message } from './message'
import { type ApiData, ApiDataAsyncData, type Model } from './model'
import { update } from './update'

export type InitReturn = Update.Return<Model, Message>

export const init = (): InitReturn => ({
  model: {
    apiData: ApiDataAsyncData.Idle(),
    disclosures: {},
  },
})

export const boot = (
  maybeApiData: Option.Option<ApiData> = Option.none(),
): InitReturn => {
  const init_ = init()
  return Update.combine(init_.model, [
    stepModel => update(stepModel, Message.RequestedApiData()),
    stepModel =>
      Option.match(maybeApiData, {
        onNone: () => ({ model: stepModel }),
        // NOTE: Prerendered module pages seed a per-module slice of the API
        // data, but the preceding Command still loads the full reference after
        // hydration so cross-module navigation keeps working.
        onSome: apiData =>
          update(stepModel, Message.SucceededLoadApiData({ apiData })),
      }),
  ])
}
