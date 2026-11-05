import { Option } from 'effect'
import { AsyncData } from 'foldkit'
import { modifyFields } from 'foldkit/struct'

import { makeStep } from './block'
import { LoadApiData } from './command'
import { ApiReferenceComposition } from './composition'

const refreshApiData = makeStep(model =>
  Option.match(
    AsyncData.isStale(model.apiData)
      ? AsyncData.revalidate(model.apiData)
      : AsyncData.loadIfMissing(model.apiData),
    {
      onNone: () => ({ model }),
      onSome: apiData => ({
        model: modifyFields(model, { apiData: () => apiData }),
        commands: [LoadApiData()],
      }),
    },
  ),
)

export const inMessageUpdate = ApiReferenceComposition.makeInMessageUpdate({
  InformedOfRouteChange: refreshApiData,
})
